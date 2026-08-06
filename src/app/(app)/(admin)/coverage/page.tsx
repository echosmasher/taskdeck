import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/app-settings";
import { classifyAbsence, findExpectedReturnDate } from "@/lib/absence";
import { resolveEffectiveAssignee } from "@/lib/tasks/effective-assignee";
import { CoverageTable } from "./coverage-table";
import type { CoverageRow, ProfileOption } from "./types";

export default async function CoveragePage() {
  const supabase = await createClient();
  const settings = await getAppSettings();

  const [instancesRes, tasksRes, companiesRes, profilesRes, entriesRes, holidaysRes] =
    await Promise.all([
      supabase.from("task_instances").select("*").eq("status", "open"),
      supabase
        .from("tasks")
        .select("id, title, assignee_type, assignee_team_id, assignee_profile_id")
        .eq("is_archived", false),
      supabase.from("companies").select("id, name"),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_archived", false)
        .order("full_name"),
      supabase.from("calendar_entries").select("profile_id, date, status"),
      supabase.from("holidays").select("date"),
    ]);

  const taskById = new Map((tasksRes.data ?? []).map((t) => [t.id, t]));
  const companyNameById = new Map((companiesRes.data ?? []).map((c) => [c.id, c.name]));
  const profileNameById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p.full_name ?? p.email]),
  );

  // Every country's holidays combined — there's no per-task country
  // context for most recurrence types, so this errs toward not
  // under-counting continuity across a holiday (see lib/absence.ts).
  const holidays = new Set((holidaysRes.data ?? []).map((h) => h.date));

  const entriesByProfile = new Map<string, Map<string, string>>();
  for (const e of entriesRes.data ?? []) {
    const existing = entriesByProfile.get(e.profile_id);
    if (existing) existing.set(e.date, e.status);
    else entriesByProfile.set(e.profile_id, new Map([[e.date, e.status]]));
  }

  const classifyOptions = {
    longAbsenceStatuses: settings.long_absence_statuses,
    longAbsenceMinDays: settings.long_absence_min_days,
    holidays,
  };

  const rows: CoverageRow[] = [];
  for (const instance of instancesRes.data ?? []) {
    const task = taskById.get(instance.task_id);
    if (!task) continue;

    const effective = resolveEffectiveAssignee(
      {
        assigneeType: task.assignee_type,
        assigneeTeamId: task.assignee_team_id,
        assigneeProfileId: task.assignee_profile_id,
      },
      instance.assignee_override_profile_id,
    );
    // Team tasks (uncovered) aren't in scope — completable by any
    // member, so absence self-heals (addendum §15.3.2).
    if (effective.type !== "person" || !effective.profileId) continue;

    const memberEntries = entriesByProfile.get(effective.profileId) ?? new Map();
    if (classifyAbsence(instance.due_date, memberEntries, classifyOptions) !== "long_term") {
      continue;
    }

    rows.push({
      instanceId: instance.id,
      taskTitle: task.title,
      companyName: companyNameById.get(instance.company_id) ?? "Unknown company",
      dueDate: instance.due_date,
      assigneeProfileId: effective.profileId,
      assigneeName: profileNameById.get(effective.profileId) ?? "Unknown",
      expectedReturnDate: findExpectedReturnDate(instance.due_date, memberEntries, classifyOptions),
    });
  }

  rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.taskTitle.localeCompare(b.taskTitle));

  const profileOptions: ProfileOption[] = (profilesRes.data ?? []).map((p) => ({
    id: p.id,
    label: p.full_name ?? p.email,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Coverage</h1>
        <p className="text-muted-foreground">
          Open instances whose effective assignee is long-term absent on the due date — this is
          where absence gaps actually surface, per occurrence.
        </p>
      </div>
      <CoverageTable rows={rows} profileOptions={profileOptions} />
    </div>
  );
}
