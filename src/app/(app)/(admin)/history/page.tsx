import { createClient } from "@/lib/supabase/server";
import { getAppTimezone } from "@/lib/app-settings";
import { getTodayInTimezone } from "@/lib/dates";
import { resolveEffectiveAssignee } from "@/lib/tasks/effective-assignee";
import { HistoryTable } from "./history-table";
import type { FilterOption, HistoryEvent, HistoryRow } from "./types";

export default async function HistoryPage() {
  const supabase = await createClient();

  const [instancesRes, tasksRes, companiesRes, profilesRes, eventsRes] = await Promise.all([
    supabase.from("task_instances").select("*").in("status", ["completed", "na"]),
    supabase
      .from("tasks")
      .select("id, title, assignee_type, assignee_team_id, assignee_profile_id")
      .order("title"),
    supabase.from("companies").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name, email").order("full_name"),
    supabase
      .from("task_events")
      .select("id, task_instance_id, event, actor_profile_id, occurred_at, details")
      .order("occurred_at"),
  ]);

  const taskById = new Map((tasksRes.data ?? []).map((t) => [t.id, t]));
  const companyNameById = new Map((companiesRes.data ?? []).map((c) => [c.id, c.name]));
  const profileNameById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p.full_name ?? p.email]),
  );

  const rows: HistoryRow[] = (instancesRes.data ?? []).map((instance) => {
    const task = taskById.get(instance.task_id);
    const effective = task
      ? resolveEffectiveAssignee(
          {
            assigneeType: task.assignee_type,
            assigneeTeamId: task.assignee_team_id,
            assigneeProfileId: task.assignee_profile_id,
          },
          instance.assignee_override_profile_id,
        )
      : { isOverride: false, profileId: null };

    return {
      instanceId: instance.id,
      taskId: instance.task_id,
      taskTitle: task?.title ?? "Unknown task",
      companyId: instance.company_id,
      companyName: companyNameById.get(instance.company_id) ?? "Unknown company",
      dueDate: instance.due_date,
      status: instance.status as "completed" | "na",
      statusSetById: instance.status_set_by,
      statusSetByName: instance.status_set_by
        ? (profileNameById.get(instance.status_set_by) ?? null)
        : null,
      statusSetAt: instance.status_set_at,
      naReason: instance.na_reason,
      isOverride: effective.isOverride,
      effectiveAssigneeName: effective.profileId
        ? (profileNameById.get(effective.profileId) ?? null)
        : null,
    };
  });

  const eventsByInstanceId = new Map<string, HistoryEvent[]>();
  for (const e of eventsRes.data ?? []) {
    if (!e.task_instance_id) continue;
    const event: HistoryEvent = {
      id: e.id,
      event: e.event,
      actorName: e.actor_profile_id ? (profileNameById.get(e.actor_profile_id) ?? null) : null,
      occurredAt: e.occurred_at,
      details: (e.details as Record<string, unknown>) ?? {},
    };
    const existing = eventsByInstanceId.get(e.task_instance_id);
    if (existing) existing.push(event);
    else eventsByInstanceId.set(e.task_instance_id, [event]);
  }

  const taskOptions: FilterOption[] = (tasksRes.data ?? []).map((t) => ({ id: t.id, label: t.title }));
  const companyOptions: FilterOption[] = (companiesRes.data ?? []).map((c) => ({
    id: c.id,
    label: c.name,
  }));
  const assigneeOptions: FilterOption[] = (profilesRes.data ?? []).map((p) => ({
    id: p.id,
    label: p.full_name ?? p.email,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="text-muted-foreground">
          Audit trail of completed and N/A task instances — the evidence tab.
        </p>
      </div>
      <HistoryTable
        rows={rows}
        eventsByInstanceId={Object.fromEntries(eventsByInstanceId)}
        taskOptions={taskOptions}
        companyOptions={companyOptions}
        assigneeOptions={assigneeOptions}
        todayISO={getTodayInTimezone(await getAppTimezone())}
      />
    </div>
  );
}
