/**
 * No `import "server-only"` here, unlike most of src/lib: this module
 * has to run under plain Node via `tsx` (scripts/seed.ts) as well as
 * inside the Next.js server bundle, and the `server-only` package's
 * default export throws outside a webpack "react-server" build — it
 * would break the CLI script.
 *
 * Core of the idempotent demo-data seed (spec §9, addendum §15.5).
 * Shared by two callers: the `pnpm seed` CLI script (scripts/seed.ts)
 * and the nightly reset job / admin "reset demo data" action (task 22,
 * src/app/api/reset-demo/route.ts) — both just need "wipe and rebuild
 * the demo dataset," so the orchestration lives here once.
 *
 * "Idempotent" here means: running this any number of times leaves the
 * database in the same end state, not that re-runs are no-ops. Every
 * demo-owned table (everything except auth.users/profiles, which are
 * upserted by email so the two fixed-credential demo accounts survive
 * across runs) is wiped and rebuilt from scratch each time — the same
 * semantics the nightly reset job needs, because a demo visitor's
 * changes should never accumulate.
 *
 * A seeded PRNG (not Math.random()) keeps the "random" status mix and
 * actor assignment byte-for-byte identical across runs, which matters
 * both for a stable demo and for this idempotency guarantee to be real.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import {
  addDays,
  addMonths,
  fromISODate,
  getTodayInTimezone,
  monthRange,
  toISODate,
} from "@/lib/dates";
import { companyMatchesScope } from "@/lib/tasks/scope-match";
import { dueDateForOccurrence, occurrencesInWindow } from "@/lib/tasks/occurrences";
import type { DeadlineRule, Recurrence } from "@/lib/tasks/recurrence-types";
import type { Database } from "@/lib/supabase/database.types";
import {
  COMPANIES,
  DIMENSIONS,
  PEOPLE,
  TASKS,
  TEAMS,
  type SeedAssignee,
  type SeedScope,
  type SeedTask,
} from "./seed-data";

type CalendarEntryStatus = Database["public"]["Enums"]["calendar_entry_status"];

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

const TIMEZONE = "Europe/Oslo";
const NA_REASONS = [
  "Company dormant this period",
  "No activity to reconcile",
  "Merged into parent company",
  "On hold pending admin review",
];

export interface SeedDemoDataResult {
  peopleCount: number;
  teamsCount: number;
  companiesCount: number;
  tasksCount: number;
}

// --- deterministic PRNG (mulberry32) so re-runs are byte-for-byte identical ---
function mulberry32(seed: number) {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function assertNoError(error: { message: string } | null, context: string): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

// ---------------------------------------------------------------------------

async function wipeDemoData(admin: SupabaseAdmin) {
  // task_events, settings_events, and reassignment_requests are
  // deliberately append-only (no delete grant, even for service_role —
  // see their migrations), so the ordinary REST client can't clear
  // them directly. reset_demo_data() is a security-definer function
  // that bypasses that on purpose, scoped to exactly this use.
  const { error } = await admin.rpc("reset_demo_data");
  assertNoError(error, "reset_demo_data");
}

async function seedPeople(admin: SupabaseAdmin): Promise<Map<string, string>> {
  const { data: existing, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  assertNoError(error, "listUsers");

  const idByEmail = new Map<string, string>();
  for (const u of existing?.users ?? []) {
    if (u.email) idByEmail.set(u.email, u.id);
  }

  const demoPasswordByEmail: Record<string, string> = {
    [process.env.DEMO_ADMIN_EMAIL ?? "admin@taskdeck.local"]:
      process.env.DEMO_ADMIN_PASSWORD ?? "taskdeck-demo-admin",
    [process.env.DEMO_MEMBER_EMAIL ?? "member@taskdeck.local"]:
      process.env.DEMO_MEMBER_PASSWORD ?? "taskdeck-demo-member",
  };

  const peopleByEmail = new Map<string, string>();

  for (const person of PEOPLE) {
    let id = idByEmail.get(person.email);
    const demoPassword = demoPasswordByEmail[person.email];

    if (!id) {
      const { data, error: createError } = await admin.auth.admin.createUser({
        email: person.email,
        password: demoPassword ?? crypto.randomUUID(),
        email_confirm: true,
      });
      assertNoError(createError, `createUser(${person.email})`);
      id = data!.user!.id;
    } else if (demoPassword) {
      // Keep the two fixed demo credentials in sync even on a re-run
      // against a database that already has these accounts.
      const { error: pwError } = await admin.auth.admin.updateUserById(id, {
        password: demoPassword,
      });
      assertNoError(pwError, `updateUserById(${person.email})`);
    }

    peopleByEmail.set(person.email, id);

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        full_name: person.fullName,
        position: person.position,
        role: person.role,
        is_archived: false,
      })
      .eq("id", id);
    assertNoError(profileError, `update profile(${person.email})`);
  }

  return peopleByEmail;
}

async function seedTeams(admin: SupabaseAdmin): Promise<Map<string, string>> {
  const rows = TEAMS.map((name) => ({ name }));
  const { data, error } = await admin.from("teams").insert(rows).select("id, name");
  assertNoError(error, "insert teams");
  return new Map((data ?? []).map((t) => [t.name, t.id]));
}

async function assignTeams(
  admin: SupabaseAdmin,
  peopleByEmail: Map<string, string>,
  teamIdByName: Map<string, string>,
) {
  for (const person of PEOPLE) {
    const teamId = person.team ? (teamIdByName.get(person.team) ?? null) : null;
    const { error } = await admin
      .from("profiles")
      .update({ team_id: teamId })
      .eq("id", peopleByEmail.get(person.email)!);
    assertNoError(error, `assign team(${person.email})`);
  }
}

interface Dims {
  dimensionIdByName: Map<string, string>;
  valueIdByDimensionAndValue: Map<string, string>; // `${dimensionName}:${value}` -> dimension_value id
}

async function seedDimensions(admin: SupabaseAdmin): Promise<Dims> {
  const dimensionIdByName = new Map<string, string>();
  const valueIdByDimensionAndValue = new Map<string, string>();

  for (const dim of DIMENSIONS) {
    const { data: dimRow, error: dimError } = await admin
      .from("dimensions")
      .insert({ name: dim.name })
      .select("id")
      .single();
    assertNoError(dimError, `insert dimension(${dim.name})`);
    dimensionIdByName.set(dim.name, dimRow!.id);

    const { data: valueRows, error: valueError } = await admin
      .from("dimension_values")
      .insert(dim.values.map((value) => ({ dimension_id: dimRow!.id, value })))
      .select("id, value");
    assertNoError(valueError, `insert dimension_values(${dim.name})`);
    for (const v of valueRows ?? []) {
      valueIdByDimensionAndValue.set(`${dim.name}:${v.value}`, v.id);
    }
  }

  return { dimensionIdByName, valueIdByDimensionAndValue };
}

interface CompanyRecord {
  id: string;
  name: string;
  dimensionValues: Map<string, string>; // dimension_id -> dimension_value_id
}

async function seedCompanies(admin: SupabaseAdmin, dims: Dims): Promise<CompanyRecord[]> {
  const { data: companyRows, error } = await admin
    .from("companies")
    .insert(COMPANIES.map((c) => ({ name: c.name })))
    .select("id, name");
  assertNoError(error, "insert companies");

  const idByName = new Map((companyRows ?? []).map((c) => [c.name, c.id]));
  const cdvRows: { company_id: string; dimension_id: string; dimension_value_id: string }[] = [];

  for (const c of COMPANIES) {
    const companyId = idByName.get(c.name)!;
    cdvRows.push(
      { company_id: companyId, dimension_id: dims.dimensionIdByName.get("Country")!, dimension_value_id: dims.valueIdByDimensionAndValue.get(`Country:${c.country}`)! },
      { company_id: companyId, dimension_id: dims.dimensionIdByName.get("Brand")!, dimension_value_id: dims.valueIdByDimensionAndValue.get(`Brand:${c.brand}`)! },
      { company_id: companyId, dimension_id: dims.dimensionIdByName.get("Size")!, dimension_value_id: dims.valueIdByDimensionAndValue.get(`Size:${c.size}`)! },
    );
  }
  const { error: cdvError } = await admin.from("company_dimension_values").insert(cdvRows);
  assertNoError(cdvError, "insert company_dimension_values");

  return COMPANIES.map((c) => {
    const companyId = idByName.get(c.name)!;
    const dimensionValues = new Map<string, string>();
    dimensionValues.set(dims.dimensionIdByName.get("Country")!, dims.valueIdByDimensionAndValue.get(`Country:${c.country}`)!);
    dimensionValues.set(dims.dimensionIdByName.get("Brand")!, dims.valueIdByDimensionAndValue.get(`Brand:${c.brand}`)!);
    dimensionValues.set(dims.dimensionIdByName.get("Size")!, dims.valueIdByDimensionAndValue.get(`Size:${c.size}`)!);
    return { id: companyId, name: c.name, dimensionValues };
  });
}

interface TaskRecord {
  id: string;
  title: string;
  assigneeType: "team" | "person";
  assigneeTeamId: string | null;
  assigneeProfileId: string | null;
  scope: string[];
  recurrence: Recurrence;
  deadlineRule: DeadlineRule;
}

function resolveAssignee(
  assignee: SeedAssignee,
  teamIdByName: Map<string, string>,
  peopleByEmail: Map<string, string>,
): { assignee_type: "team" | "person"; assignee_team_id: string | null; assignee_profile_id: string | null } {
  if (assignee.type === "team") {
    return { assignee_type: "team", assignee_team_id: teamIdByName.get(assignee.team)!, assignee_profile_id: null };
  }
  return { assignee_type: "person", assignee_team_id: null, assignee_profile_id: peopleByEmail.get(assignee.email)! };
}

function resolveScope(scope: SeedScope[], dims: Dims): string[] {
  return scope
    .filter((s): s is { dimension: string; value: string } => s !== null)
    .map((s) => dims.valueIdByDimensionAndValue.get(`${s.dimension}:${s.value}`)!);
}

async function seedTasks(
  admin: SupabaseAdmin,
  teamIdByName: Map<string, string>,
  peopleByEmail: Map<string, string>,
  dims: Dims,
  todayISO: string,
): Promise<TaskRecord[]> {
  const dynamicTasks: SeedTask[] = [
    {
      title: "Year-end audit prep",
      assignee: { type: "team", team: "R2R 1" },
      scope: [],
      recurrence: { type: "one_off", date: addDays(todayISO, 21) },
      deadlineRule: null,
    },
    {
      title: "Team OKR check-in",
      assignee: { type: "person", email: "vilde@taskdeck.local" },
      scope: [],
      recurrence: { type: "one_off", date: addDays(todayISO, 7) },
      deadlineRule: null,
    },
  ];

  const allTasks = [...TASKS, ...dynamicTasks];
  const createdBy = peopleByEmail.get(process.env.DEMO_ADMIN_EMAIL ?? "admin@taskdeck.local")!;

  const rows = allTasks.map((t) => ({
    title: t.title,
    description: t.description ?? null,
    ...resolveAssignee(t.assignee, teamIdByName, peopleByEmail),
    scope: resolveScope(t.scope, dims),
    recurrence: t.recurrence,
    deadline_rule: t.deadlineRule,
    created_by: createdBy,
  }));

  const { data, error } = await admin
    .from("tasks")
    .insert(rows)
    .select("id, title, assignee_type, assignee_team_id, assignee_profile_id, scope, recurrence, deadline_rule");
  assertNoError(error, "insert tasks");

  return (data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    assigneeType: t.assignee_type,
    assigneeTeamId: t.assignee_team_id,
    assigneeProfileId: t.assignee_profile_id,
    scope: (t.scope as string[] | null) ?? [],
    recurrence: t.recurrence as Recurrence,
    deadlineRule: t.deadline_rule as DeadlineRule,
  }));
}

async function loadHolidaysByCountry(admin: SupabaseAdmin): Promise<Map<string, Set<string>>> {
  const { data, error } = await admin.from("holidays").select("date, country_code");
  assertNoError(error, "select holidays");
  const map = new Map<string, Set<string>>();
  for (const h of data ?? []) {
    const existing = map.get(h.country_code);
    if (existing) existing.add(h.date);
    else map.set(h.country_code, new Set([h.date]));
  }
  return map;
}

interface PlannedInstance {
  task_id: string;
  company_id: string;
  due_date: string;
}

interface ResolvedInstance extends PlannedInstance {
  status: "open" | "completed" | "na";
  status_set_by: string | null;
  status_set_at: string | null;
  na_reason: string | null;
}

function teamMembers(
  teamId: string,
  peopleByEmail: Map<string, string>,
  teamByEmail: Map<string, string | null>,
): string[] {
  return [...peopleByEmail.entries()]
    .filter(([email]) => teamByEmail.get(email) === teamId)
    .map(([, id]) => id);
}

async function generateInstances(
  admin: SupabaseAdmin,
  tasks: TaskRecord[],
  companies: CompanyRecord[],
  dims: Dims,
  holidaysByCountry: Map<string, Set<string>>,
  todayISO: string,
  peopleByEmail: Map<string, string>,
  teamIdByName: Map<string, string>,
  random: () => number,
): Promise<Map<string, string>> {
  function pick<T>(items: readonly T[]): T {
    return items[Math.floor(random() * items.length)];
  }

  const teamByEmail = new Map(PEOPLE.map((p) => [p.email, p.team ? (teamIdByName.get(p.team) ?? null) : null]));
  const dimensionValueToDimension = new Map<string, string>();
  for (const [key, valueId] of dims.valueIdByDimensionAndValue) {
    dimensionValueToDimension.set(valueId, dims.dimensionIdByName.get(key.split(":")[0])!);
  }

  const windowStartISO = monthRange(addMonths(todayISO, -1)).start;
  const windowEndISO = monthRange(addMonths(todayISO, 1)).end;
  const windowStart = fromISODate(windowStartISO);
  const windowEnd = fromISODate(windowEndISO);

  const planned: PlannedInstance[] = [];

  for (const task of tasks) {
    const countryHolidays =
      (task.recurrence.type === "monthly_nth_working_day" &&
        holidaysByCountry.get(task.recurrence.countryCode)) ||
      new Set<string>();

    let occurrences: Date[];
    try {
      occurrences = occurrencesInWindow(task.recurrence, windowStart, windowEnd, countryHolidays);
    } catch {
      continue;
    }
    if (occurrences.length === 0) continue;

    const matchingCompanies = companies.filter((c) =>
      companyMatchesScope(task.scope, c.dimensionValues, dimensionValueToDimension),
    );
    if (matchingCompanies.length === 0) continue;

    for (const occurrence of occurrences) {
      const dueDate = toISODate(dueDateForOccurrence(occurrence, task.deadlineRule, holidaysByCountry));
      for (const company of matchingCompanies) {
        planned.push({ task_id: task.id, company_id: company.id, due_date: dueDate });
      }
    }
  }

  console.log(`  planning ${planned.length} instances across ${tasks.length} tasks`);

  const CHUNK = 500;
  const instanceIdByKey = new Map<string, string>();
  for (let i = 0; i < planned.length; i += CHUNK) {
    const chunk = planned.slice(i, i + CHUNK);
    const { data, error } = await admin
      .from("task_instances")
      .insert(chunk.map((p) => ({ ...p, status: "open" as const })))
      .select("id, task_id, company_id, due_date");
    assertNoError(error, "insert task_instances");
    for (const row of data ?? []) {
      instanceIdByKey.set(`${row.task_id}__${row.company_id}__${row.due_date}`, row.id);
    }
  }

  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const toResolve: ResolvedInstance[] = [];

  for (const p of planned) {
    const task = taskById.get(p.task_id)!;
    let status: ResolvedInstance["status"] = "open";
    let statusSetBy: string | null = null;
    let statusSetAt: string | null = null;
    let naReason: string | null = null;

    if (p.due_date <= todayISO) {
      // Recency-weighted completion curve: a real team catches up on
      // its backlog within a couple of weeks, so "still open" should
      // be common for things due today and vanishingly rare for
      // anything from three weeks ago — not a flat rate applied
      // uniformly across a month, which would leave dozens of rows
      // stuck "overdue" since day one and make the dashboard look
      // broken rather than realistic.
      const daysAgo = Math.round(
        (fromISODate(todayISO).getTime() - fromISODate(p.due_date).getTime()) / 86_400_000,
      );
      const [completedP, naP] =
        daysAgo === 0
          ? [0.35, 0.1]
          : daysAgo <= 3
            ? [0.55, 0.1]
            : daysAgo <= 10
              ? [0.82, 0.1]
              : [0.94, 0.04];

      const roll = random();
      status = roll < completedP ? "completed" : roll < completedP + naP ? "na" : "open";

      if (status !== "open") {
        const actorPool =
          task.assigneeType === "person"
            ? [task.assigneeProfileId!]
            : teamMembers(task.assigneeTeamId!, peopleByEmail, teamByEmail);
        statusSetBy = actorPool.length > 0 ? pick(actorPool) : null;

        const delayDays = Math.floor(random() * 3);
        let setDate = addDays(p.due_date, delayDays);
        if (setDate > todayISO) setDate = todayISO;
        const hour = 8 + Math.floor(random() * 9);
        const minute = Math.floor(random() * 60);
        statusSetAt = `${setDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+00`;

        if (status === "na") naReason = pick(NA_REASONS);
      }
    }

    if (status !== "open") {
      toResolve.push({ ...p, status, status_set_by: statusSetBy, status_set_at: statusSetAt, na_reason: naReason });
    }
  }

  console.log(`  resolving ${toResolve.length} instances (completed/na)`);

  await mapWithConcurrency(toResolve, 20, async (instance) => {
    const id = instanceIdByKey.get(`${instance.task_id}__${instance.company_id}__${instance.due_date}`);
    if (!id) return;
    const { error } = await admin
      .from("task_instances")
      .update({
        status: instance.status,
        status_set_by: instance.status_set_by,
        status_set_at: instance.status_set_at,
        na_reason: instance.na_reason,
      })
      .eq("id", id);
    assertNoError(error, `resolve instance ${id}`);
  });

  return instanceIdByKey;
}

async function seedCalendarEntries(
  admin: SupabaseAdmin,
  peopleByEmail: Map<string, string>,
  todayISO: string,
  random: () => number,
): Promise<void> {
  const rows: { profile_id: string; date: string; status: CalendarEntryStatus }[] = [];
  const monthStart = monthRange(todayISO).start;
  const monthEnd = monthRange(todayISO).end;

  function weekday(dateISO: string): number {
    return fromISODate(dateISO).getUTCDay();
  }

  // Background realism: everyone gets a light scattering of in_office /
  // remote days across the current month (skipped for the three fixture
  // people below, whose days are deliberately overridden).
  const fixtureEmails = new Set(["ingrid@taskdeck.local", "freya@taskdeck.local", "sigrid@taskdeck.local"]);
  for (const person of PEOPLE) {
    if (fixtureEmails.has(person.email)) continue;
    const profileId = peopleByEmail.get(person.email)!;
    for (let d = monthStart; d <= monthEnd; d = addDays(d, 1)) {
      const wd = weekday(d);
      if (wd === 0 || wd === 6) continue;
      if (random() < 0.45) {
        rows.push({ profile_id: profileId, date: d, status: random() < 0.75 ? "in_office" : "remote" });
      }
    }
  }

  // Fixture 1: Ingrid — ongoing parental leave (addendum §15.5), started
  // recently and continuing well into the future so it's "active" no
  // matter when this seed is actually run.
  const ingridId = peopleByEmail.get("ingrid@taskdeck.local")!;
  for (let d = addDays(todayISO, -10); d <= addDays(todayISO, 20); d = addDays(d, 1)) {
    rows.push({ profile_id: ingridId, date: d, status: "parental_leave" });
  }

  // Fixture 2: Freya — a 7-day vacation run, currently in progress.
  const freyaId = peopleByEmail.get("freya@taskdeck.local")!;
  for (let d = addDays(todayISO, -3); d <= addDays(todayISO, 3); d = addDays(d, 1)) {
    rows.push({ profile_id: freyaId, date: d, status: "out_of_office" });
  }

  // Fixture 3: Sigrid — a 2-day short-term absence (below the long-
  // absence threshold on its own), deliberately left uncovered.
  const sigridId = peopleByEmail.get("sigrid@taskdeck.local")!;
  rows.push({ profile_id: sigridId, date: addDays(todayISO, -1), status: "sick" });
  rows.push({ profile_id: sigridId, date: todayISO, status: "sick" });

  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await admin.from("calendar_entries").insert(rows.slice(i, i + CHUNK));
    assertNoError(error, "insert calendar_entries");
  }
}

async function seedOverrideFixture(
  admin: SupabaseAdmin,
  tasks: TaskRecord[],
  peopleByEmail: Map<string, string>,
  todayISO: string,
): Promise<void> {
  const cashFlowTask = tasks.find((t) => t.title === "Cash flow forecast");
  if (!cashFlowTask) return;

  const { data: instances, error } = await admin
    .from("task_instances")
    .select("id")
    .eq("task_id", cashFlowTask.id)
    .eq("status", "open")
    .gte("due_date", todayISO)
    .order("due_date")
    .limit(2);
  assertNoError(error, "select instances for override fixture");
  if (!instances || instances.length === 0) return;

  const oskarId = peopleByEmail.get("member@taskdeck.local")!;
  const { error: overrideError } = await admin
    .from("task_instances")
    .update({
      assignee_override_profile_id: oskarId,
      override_reason: "Ingrid is on parental leave — Oskar covering her AR tasks",
      override_set_by: peopleByEmail.get(process.env.DEMO_ADMIN_EMAIL ?? "admin@taskdeck.local")!,
      override_set_at: `${addDays(todayISO, -9)}T09:00:00+00`,
    })
    .in(
      "id",
      instances.map((i) => i.id),
    );
  assertNoError(overrideError, "set override fixture");
}

async function seedReassignmentRequests(
  admin: SupabaseAdmin,
  tasks: TaskRecord[],
  peopleByEmail: Map<string, string>,
  todayISO: string,
): Promise<void> {
  const adminId = peopleByEmail.get(process.env.DEMO_ADMIN_EMAIL ?? "admin@taskdeck.local")!;
  const taskByTitle = new Map(tasks.map((t) => [t.title, t]));

  const expenseTask = taskByTitle.get("Expense report audit");
  const payrollTask = taskByTitle.get("Payroll review");
  const okrTask = taskByTitle.get("Team OKR check-in");

  // 1. Pending — Kasper asks to hand off his own task, no suggestion.
  if (expenseTask) {
    const { error } = await admin.from("reassignment_requests").insert({
      requested_by_profile_id: peopleByEmail.get("kasper@taskdeck.local")!,
      scope: "task",
      task_id: expenseTask.id,
      task_instance_ids: [],
      reason: "I'm swamped this sprint — could someone else take this over going forward?",
      status: "pending",
      created_at: `${addDays(todayISO, -1)}T14:20:00+00`,
    });
    assertNoError(error, "insert pending reassignment_request");
  }

  // 2. Approved — Nora's request, with a suggestion the admin actually
  // followed through on (the task's own assignee is updated to match,
  // same as the real approve action would do).
  if (payrollTask) {
    const theoId = peopleByEmail.get("theo@taskdeck.local")!;
    const { data: request, error } = await admin
      .from("reassignment_requests")
      .insert({
        requested_by_profile_id: peopleByEmail.get("nora@taskdeck.local")!,
        scope: "task",
        task_id: payrollTask.id,
        task_instance_ids: [],
        reason: "Switching to AP full time next month — Theo already backs me up on this.",
        suggested_assignee_profile_id: theoId,
        status: "pending",
        created_at: `${addDays(todayISO, -5)}T10:00:00+00`,
      })
      .select("id")
      .single();
    assertNoError(error, "insert approved reassignment_request");

    const { error: taskUpdateError } = await admin
      .from("tasks")
      .update({ assignee_type: "person", assignee_team_id: null, assignee_profile_id: theoId })
      .eq("id", payrollTask.id);
    assertNoError(taskUpdateError, "apply approved reassignment to task");

    await admin.from("task_events").insert({
      task_id: payrollTask.id,
      event: "reassigned",
      actor_profile_id: adminId,
      occurred_at: `${addDays(todayISO, -4)}T09:30:00+00`,
      details: {
        reassignment_request_id: request!.id,
        from: { assignee_type: payrollTask.assigneeType, assignee_profile_id: payrollTask.assigneeProfileId },
        to: { type: "person", team_id: null, profile_id: theoId },
      },
    });

    const { error: decisionError } = await admin
      .from("reassignment_requests")
      .update({
        status: "approved",
        decision_note: "Makes sense, approved.",
        decided_by_profile_id: adminId,
        decided_at: `${addDays(todayISO, -4)}T09:30:00+00`,
      })
      .eq("id", request!.id);
    assertNoError(decisionError, "approve reassignment_request");
  }

  // 3. Rejected — Vilde's request, turned down with a note.
  if (okrTask) {
    const { data: request, error } = await admin
      .from("reassignment_requests")
      .insert({
        requested_by_profile_id: peopleByEmail.get("vilde@taskdeck.local")!,
        scope: "task",
        task_id: okrTask.id,
        task_instance_ids: [],
        reason: "Conflicts with a team offsite that week.",
        status: "pending",
        created_at: `${addDays(todayISO, -2)}T11:00:00+00`,
      })
      .select("id")
      .single();
    assertNoError(error, "insert rejected reassignment_request");

    const { error: decisionError } = await admin
      .from("reassignment_requests")
      .update({
        status: "rejected",
        decision_note: "Let's discuss in standup first — the offsite is optional.",
        decided_by_profile_id: adminId,
        decided_at: `${addDays(todayISO, -1)}T16:00:00+00`,
      })
      .eq("id", request!.id);
    assertNoError(decisionError, "reject reassignment_request");

    await admin.from("task_events").insert({
      task_id: okrTask.id,
      event: "edited",
      actor_profile_id: adminId,
      occurred_at: `${addDays(todayISO, -1)}T16:00:00+00`,
      details: {
        reassignment_request_id: request!.id,
        reassignment_request_rejected: true,
        decision_note: "Let's discuss in standup first — the offsite is optional.",
      },
    });
  }
}

async function seedSettings(admin: SupabaseAdmin): Promise<void> {
  const { error } = await admin
    .from("app_settings")
    .update({ calendar_edit_permission: "members_all", long_absence_min_days: 4 })
    .eq("id", true);
  assertNoError(error, "update app_settings");
}

/**
 * Wipes and rebuilds the full demo dataset. Safe to call repeatedly —
 * see the module doc comment above for what "idempotent" means here.
 */
export async function seedDemoData(): Promise<SeedDemoDataResult> {
  const random = mulberry32(0x7a5e_ed01);
  const admin = createAdminClient();
  const todayISO = getTodayInTimezone(TIMEZONE);
  console.log(`Seeding TaskDeck demo data (today = ${todayISO})...`);

  console.log("Wiping previous demo data...");
  await wipeDemoData(admin);

  console.log("Seeding people...");
  const peopleByEmail = await seedPeople(admin);

  console.log("Seeding teams...");
  const teamIdByName = await seedTeams(admin);
  await assignTeams(admin, peopleByEmail, teamIdByName);

  console.log("Seeding dimensions...");
  const dims = await seedDimensions(admin);

  console.log("Seeding companies...");
  const companies = await seedCompanies(admin, dims);

  console.log("Seeding tasks...");
  const tasks = await seedTasks(admin, teamIdByName, peopleByEmail, dims, todayISO);

  console.log("Generating instances...");
  const holidaysByCountry = await loadHolidaysByCountry(admin);
  await generateInstances(
    admin,
    tasks,
    companies,
    dims,
    holidaysByCountry,
    todayISO,
    peopleByEmail,
    teamIdByName,
    random,
  );

  console.log("Seeding calendar entries and absence fixtures...");
  await seedCalendarEntries(admin, peopleByEmail, todayISO, random);

  console.log("Seeding the active coverage override fixture...");
  await seedOverrideFixture(admin, tasks, peopleByEmail, todayISO);

  console.log("Seeding reassignment request fixtures...");
  await seedReassignmentRequests(admin, tasks, peopleByEmail, todayISO);

  console.log("Applying non-default settings...");
  await seedSettings(admin);

  const result: SeedDemoDataResult = {
    peopleCount: PEOPLE.length,
    teamsCount: TEAMS.length,
    companiesCount: COMPANIES.length,
    tasksCount: tasks.length,
  };
  console.log(
    `Done. ${result.peopleCount} people, ${result.teamsCount} teams, ${result.companiesCount} companies, ${result.tasksCount} tasks.`,
  );
  return result;
}
