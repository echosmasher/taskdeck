import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { APP_TIMEZONE } from "@/lib/config";
import { fromISODate, getTodayInTimezone } from "@/lib/dates";
import { companyMatchesScope } from "./scope-match";
import { dueDateForOccurrence, occurrencesInWindow } from "./occurrences";
import type { DeadlineRule, Recurrence } from "./recurrence-types";

const GENERATION_WINDOW_DAYS = 60;

/**
 * Materializes task_instances up to ~60 days ahead for every active task,
 * for every active company matching its scope at generation time (§5,
 * §6). Idempotent: relies on the DB's unique(task_id, company_id,
 * due_date) constraint via upsert-ignore, so calling this repeatedly
 * (cron, or opportunistically on page load) never creates duplicates
 * and never touches instances that already exist — including ones a
 * user has already completed.
 *
 * Always runs as the service-role client: instance generation is a
 * system operation, not a member/admin action, and task_instances has
 * no INSERT policy for plain authenticated users (see the tasks
 * migration) specifically so this is the only path that creates rows.
 */
export async function generateTaskInstances(): Promise<{ attempted: number; created: number }> {
  const admin = createAdminClient();

  const todayISO = getTodayInTimezone(APP_TIMEZONE);
  const windowStart = fromISODate(todayISO);
  const windowEnd = new Date(
    Date.UTC(
      windowStart.getUTCFullYear(),
      windowStart.getUTCMonth(),
      windowStart.getUTCDate() + GENERATION_WINDOW_DAYS,
    ),
  );

  const [{ data: tasks }, { data: companies }, { data: cdvRows }, { data: dimensionValues }, { data: holidayRows }] =
    await Promise.all([
      admin.from("tasks").select("*").eq("is_archived", false),
      admin.from("companies").select("id").eq("is_archived", false),
      admin.from("company_dimension_values").select("company_id, dimension_id, dimension_value_id"),
      admin.from("dimension_values").select("id, dimension_id"),
      admin.from("holidays").select("date, country_code"),
    ]);

  if (!tasks || tasks.length === 0 || !companies || companies.length === 0) {
    return { attempted: 0, created: 0 };
  }

  const dimensionValueToDimension = new Map((dimensionValues ?? []).map((v) => [v.id, v.dimension_id]));

  const companyDimensionValues = new Map<string, Map<string, string>>();
  for (const row of cdvRows ?? []) {
    const existing = companyDimensionValues.get(row.company_id);
    if (existing) existing.set(row.dimension_id, row.dimension_value_id);
    else companyDimensionValues.set(row.company_id, new Map([[row.dimension_id, row.dimension_value_id]]));
  }

  const holidaysByCountry = new Map<string, Set<string>>();
  for (const h of holidayRows ?? []) {
    const existing = holidaysByCountry.get(h.country_code);
    if (existing) existing.add(h.date);
    else holidaysByCountry.set(h.country_code, new Set([h.date]));
  }

  const rows: { task_id: string; company_id: string; due_date: string }[] = [];

  for (const task of tasks) {
    const recurrence = task.recurrence as Recurrence;
    const deadlineRule = task.deadline_rule as DeadlineRule;
    const scope = (task.scope as string[] | null) ?? [];

    const countryHolidays =
      (recurrence.type === "monthly_nth_working_day" && holidaysByCountry.get(recurrence.countryCode)) ||
      new Set<string>();

    let occurrences: Date[];
    try {
      occurrences = occurrencesInWindow(recurrence, windowStart, windowEnd, countryHolidays);
    } catch {
      continue; // malformed recurrence data — skip this task rather than fail the whole run
    }
    if (occurrences.length === 0) continue;

    const matchingCompanies = companies.filter((c) =>
      companyMatchesScope(scope, companyDimensionValues.get(c.id) ?? new Map(), dimensionValueToDimension),
    );
    if (matchingCompanies.length === 0) continue;

    for (const occurrence of occurrences) {
      const dueDate = dueDateForOccurrence(occurrence, deadlineRule, holidaysByCountry);
      const dueDateISO = dueDate.toISOString().slice(0, 10);
      for (const company of matchingCompanies) {
        rows.push({ task_id: task.id, company_id: company.id, due_date: dueDateISO });
      }
    }
  }

  if (rows.length === 0) return { attempted: 0, created: 0 };

  const { error, count } = await admin
    .from("task_instances")
    .upsert(rows, { onConflict: "task_id,company_id,due_date", ignoreDuplicates: true, count: "exact" });

  if (error) throw new Error(`generateTaskInstances: ${error.message}`);

  return { attempted: rows.length, created: count ?? 0 };
}
