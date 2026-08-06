import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/app-settings";
import { getTodayInTimezone } from "@/lib/dates";
import type { DeadlineRule, Recurrence } from "@/lib/tasks/recurrence-types";
import { TasksTable } from "./tasks-table";
import type {
  AbsenceWarningContext,
  DimensionOption,
  MemberOption,
  TaskRow,
  TeamOption,
} from "./types";

export default async function TasksPage() {
  const supabase = await createClient();
  const settings = await getAppSettings();

  const [
    tasksRes,
    dimensionsRes,
    dimensionValuesRes,
    teamsRes,
    profilesRes,
    holidaysRes,
    companiesRes,
    companyDimensionValuesRes,
    calendarEntriesRes,
  ] = await Promise.all([
    supabase.from("tasks").select("*").order("title"),
    supabase.from("dimensions").select("id, name").order("created_at"),
    supabase.from("dimension_values").select("id, dimension_id, value").order("value"),
    supabase.from("teams").select("id, name").eq("is_archived", false).order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("is_archived", false)
      .order("full_name"),
    supabase.from("holidays").select("date, country_code"),
    supabase.from("companies").select("id").eq("is_archived", false),
    supabase.from("company_dimension_values").select("company_id, dimension_id, dimension_value_id"),
    supabase.from("calendar_entries").select("profile_id, date, status"),
  ]);

  const dimensions: DimensionOption[] = (dimensionsRes.data ?? []).map((dim) => ({
    id: dim.id,
    name: dim.name,
    values: (dimensionValuesRes.data ?? [])
      .filter((v) => v.dimension_id === dim.id)
      .map((v) => ({ id: v.id, value: v.value })),
  }));

  const teams: TeamOption[] = teamsRes.data ?? [];
  const members: MemberOption[] = (profilesRes.data ?? []).map((p) => ({
    id: p.id,
    label: p.full_name ?? p.email,
  }));

  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));
  const memberLabelById = new Map(members.map((m) => [m.id, m.label]));

  const countries = [
    ...new Set((holidaysRes.data ?? []).map((h) => h.country_code)),
  ].sort();

  const dimensionValueToDimension: Record<string, string> = {};
  for (const v of dimensionValuesRes.data ?? []) dimensionValueToDimension[v.id] = v.dimension_id;

  const companiesForWarning: AbsenceWarningContext["companies"] = (companiesRes.data ?? []).map(
    (c) => ({
      id: c.id,
      dimensionValues: Object.fromEntries(
        (companyDimensionValuesRes.data ?? [])
          .filter((cdv) => cdv.company_id === c.id)
          .map((cdv) => [cdv.dimension_id, cdv.dimension_value_id]),
      ),
    }),
  );

  const holidaysByCountry: Record<string, string[]> = {};
  for (const h of holidaysRes.data ?? []) {
    (holidaysByCountry[h.country_code] ??= []).push(h.date);
  }

  const entriesByProfile: Record<string, Record<string, string>> = {};
  for (const e of calendarEntriesRes.data ?? []) {
    (entriesByProfile[e.profile_id] ??= {})[e.date] = e.status;
  }

  const absenceWarningContext: AbsenceWarningContext = {
    companies: companiesForWarning,
    dimensionValueToDimension,
    entriesByProfile,
    holidaysByCountry,
    longAbsenceStatuses: settings.long_absence_statuses,
    longAbsenceMinDays: settings.long_absence_min_days,
    todayISO: getTodayInTimezone(settings.timezone),
  };

  const tasks: TaskRow[] = (tasksRes.data ?? []).map((task) => ({
    ...task,
    recurrence: task.recurrence as Recurrence,
    deadline_rule: task.deadline_rule as DeadlineRule,
    scope: (task.scope as string[] | null) ?? [],
    assigneeLabel:
      task.assignee_type === "team"
        ? `Group – ${teamNameById.get(task.assignee_team_id ?? "") ?? "Unknown team"}`
        : (memberLabelById.get(task.assignee_profile_id ?? "") ?? "Unknown person"),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <p className="text-muted-foreground">
          Manage task definitions, recurrence, and which companies they apply to.
        </p>
      </div>
      <TasksTable
        tasks={tasks}
        dimensions={dimensions}
        teams={teams}
        members={members}
        countries={countries.length > 0 ? countries : ["NO"]}
        absenceWarningContext={absenceWarningContext}
      />
    </div>
  );
}
