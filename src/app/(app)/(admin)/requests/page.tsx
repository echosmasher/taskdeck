import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/app-settings";
import { getTodayInTimezone } from "@/lib/dates";
import type { DeadlineRule, Recurrence } from "@/lib/tasks/recurrence-types";
import type { AbsenceWarningContext, MemberOption } from "../tasks/types";
import { RequestsTable } from "./requests-table";
import type { RequestRow } from "./types";

export default async function RequestsPage() {
  const supabase = await createClient();
  const settings = await getAppSettings();

  const [
    requestsRes,
    tasksRes,
    profilesRes,
    teamsRes,
    companiesRes,
    companyDimensionValuesRes,
    holidaysRes,
    calendarEntriesRes,
  ] = await Promise.all([
    supabase.from("reassignment_requests").select("*").order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select(
        "id, title, assignee_type, assignee_team_id, assignee_profile_id, recurrence, deadline_rule, scope",
      ),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("is_archived", false)
      .order("full_name"),
    supabase.from("teams").select("id, name"),
    supabase.from("companies").select("id, name").eq("is_archived", false),
    supabase.from("company_dimension_values").select("company_id, dimension_id, dimension_value_id"),
    supabase.from("holidays").select("date, country_code"),
    supabase.from("calendar_entries").select("profile_id, date, status"),
  ]);

  const taskById = new Map((tasksRes.data ?? []).map((t) => [t.id, t]));
  const profileNameById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p.full_name ?? p.email]),
  );
  const teamNameById = new Map((teamsRes.data ?? []).map((t) => [t.id, t.name]));
  const companyNameById = new Map((companiesRes.data ?? []).map((c) => [c.id, c.name]));

  const allInstanceIds = (requestsRes.data ?? []).flatMap((r) => r.task_instance_ids);
  const { data: instanceRows } =
    allInstanceIds.length > 0
      ? await supabase
          .from("task_instances")
          .select("id, company_id, due_date")
          .in("id", allInstanceIds)
      : { data: [] };
  const instanceById = new Map((instanceRows ?? []).map((i) => [i.id, i]));

  const rows: RequestRow[] = (requestsRes.data ?? []).map((r) => {
    const task = taskById.get(r.task_id);
    const currentAssigneeLabel = task
      ? task.assignee_type === "team"
        ? `Group – ${teamNameById.get(task.assignee_team_id ?? "") ?? "Unknown team"}`
        : (profileNameById.get(task.assignee_profile_id ?? "") ?? "Unknown person")
      : "Unknown task";

    return {
      id: r.id,
      taskId: r.task_id,
      taskTitle: task?.title ?? "Unknown task",
      scope: r.scope,
      taskInstanceIds: r.task_instance_ids,
      status: r.status,
      reason: r.reason,
      suggestedAssigneeProfileId: r.suggested_assignee_profile_id,
      suggestedAssigneeName: r.suggested_assignee_profile_id
        ? (profileNameById.get(r.suggested_assignee_profile_id) ?? null)
        : null,
      createdAt: r.created_at,
      decidedAt: r.decided_at,
      decisionNote: r.decision_note,
      requesterName: profileNameById.get(r.requested_by_profile_id) ?? "Unknown",
      taskAssigneeType: task?.assignee_type ?? "person",
      taskAssigneeTeamId: task?.assignee_team_id ?? null,
      taskAssigneeProfileId: task?.assignee_profile_id ?? null,
      taskRecurrence: (task?.recurrence as Recurrence | undefined) ?? null,
      taskDeadlineRule: (task?.deadline_rule as DeadlineRule | undefined) ?? null,
      taskScope: (task?.scope as string[] | null) ?? [],
      currentAssigneeLabel,
      instances: r.task_instance_ids.map((id) => {
        const instance = instanceById.get(id);
        return {
          instanceId: id,
          companyName: instance ? (companyNameById.get(instance.company_id) ?? "Unknown company") : "Unknown company",
          dueDate: instance?.due_date ?? "",
        };
      }),
      decidedByName: r.decided_by_profile_id
        ? (profileNameById.get(r.decided_by_profile_id) ?? null)
        : null,
    };
  });

  const dimensionValueToDimension: Record<string, string> = {};
  // Not fetched here (requests page doesn't need dimension labels, just
  // scope matching for the absence-warning company count) — dimension
  // ids come through directly via company_dimension_values already.
  for (const row of companyDimensionValuesRes.data ?? []) {
    dimensionValueToDimension[row.dimension_value_id] = row.dimension_id;
  }

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

  const memberOptions: MemberOption[] = (profilesRes.data ?? []).map((p) => ({
    id: p.id,
    label: p.full_name ?? p.email,
  }));

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Requests
          {pendingCount > 0 && (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {pendingCount} pending
            </span>
          )}
        </h1>
        <p className="text-muted-foreground">
          Members can only request reassignment — approving or rejecting is always an explicit
          admin decision.
        </p>
      </div>
      <RequestsTable
        rows={rows}
        memberOptions={memberOptions}
        absenceWarningContext={absenceWarningContext}
      />
    </div>
  );
}
