import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { APP_TIMEZONE } from "@/lib/config";
import { getTodayInTimezone, monthRange, weekRange } from "@/lib/dates";
import { DashboardView } from "./dashboard-view";
import type { DashboardCompanyInstance, DashboardTaskGroup } from "./dashboard-types";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const todayISO = getTodayInTimezone(APP_TIMEZONE);
  const week = weekRange(todayISO);
  const month = monthRange(todayISO);
  // The client-side period toggle (Today/This week/This month) filters
  // within this single server-fetched window, so it has to cover the
  // widest of the three — plus every still-open instance regardless of
  // due date, since overdue items never leave the dashboard on their own.
  const queryStart = week.start < month.start ? week.start : month.start;
  const queryEnd = week.end > month.end ? week.end : month.end;

  const [instancesRes, tasksRes, companiesRes, teamsRes, profilesRes, dimensionValuesRes] =
    await Promise.all([
      supabase
        .from("task_instances")
        .select("*")
        .lte("due_date", queryEnd)
        .or(`status.eq.open,due_date.gte.${queryStart}`),
      supabase
        .from("tasks")
        .select("id, title, assignee_type, assignee_team_id, assignee_profile_id, scope")
        .eq("is_archived", false),
      supabase.from("companies").select("id, name"),
      supabase.from("teams").select("id, name"),
      supabase.from("profiles").select("id, full_name, email"),
      supabase.from("dimension_values").select("id, value"),
    ]);

  const taskById = new Map((tasksRes.data ?? []).map((t) => [t.id, t]));
  const companyNameById = new Map((companiesRes.data ?? []).map((c) => [c.id, c.name]));
  const teamNameById = new Map((teamsRes.data ?? []).map((t) => [t.id, t.name]));
  const profileNameById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p.full_name ?? p.email]),
  );
  const dimensionValueLabelById = new Map((dimensionValuesRes.data ?? []).map((v) => [v.id, v.value]));

  const groups = new Map<string, DashboardTaskGroup>();

  for (const instance of instancesRes.data ?? []) {
    const task = taskById.get(instance.task_id);
    if (!task) continue; // archived/removed since the instance was created

    const key = `${instance.task_id}__${instance.due_date}`;
    let group = groups.get(key);
    if (!group) {
      const scope = (task.scope as string[] | null) ?? [];
      group = {
        key,
        taskId: task.id,
        dueDate: instance.due_date,
        title: task.title,
        assigneeChip:
          task.assignee_type === "team"
            ? `Group – ${teamNameById.get(task.assignee_team_id ?? "") ?? "Unknown team"}`
            : null,
        scopeChips: scope
          .map((id) => dimensionValueLabelById.get(id))
          .filter((v): v is string => !!v),
        isMine:
          task.assignee_type === "person"
            ? task.assignee_profile_id === profile.id
            : task.assignee_team_id !== null && task.assignee_team_id === profile.team_id,
        instances: [],
      };
      groups.set(key, group);
    }

    const companyInstance: DashboardCompanyInstance = {
      instanceId: instance.id,
      companyId: instance.company_id,
      companyName: companyNameById.get(instance.company_id) ?? "Unknown company",
      status: instance.status,
      statusSetByName: instance.status_set_by
        ? (profileNameById.get(instance.status_set_by) ?? null)
        : null,
      statusSetAt: instance.status_set_at,
      naReason: instance.na_reason,
    };
    group.instances.push(companyInstance);
  }

  for (const group of groups.values()) {
    group.instances.sort((a, b) => a.companyName.localeCompare(b.companyName));
  }

  const taskGroups = [...groups.values()].sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title),
  );

  const todayOpenMineCount = taskGroups
    .filter((g) => g.isMine && g.dueDate === todayISO)
    .reduce((sum, g) => sum + g.instances.filter((i) => i.status === "open").length, 0);

  const firstName = (profile.full_name ?? profile.email).split(" ")[0];

  return (
    <DashboardView
      firstName={firstName}
      todayCount={todayOpenMineCount}
      todayISO={todayISO}
      groups={taskGroups}
    />
  );
}
