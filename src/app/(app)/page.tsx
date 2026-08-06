import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { getAppTimezone } from "@/lib/app-settings";
import { getTodayInTimezone, monthRange, weekRange } from "@/lib/dates";
import { resolveEffectiveAssignee } from "@/lib/tasks/effective-assignee";
import { DashboardView } from "./dashboard-view";
import type {
  CompanyDimensionValues,
  DashboardCompanyInstance,
  DashboardDimensionOption,
  DashboardFilterOption,
  DashboardTaskGroup,
} from "./dashboard-types";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const todayISO = getTodayInTimezone(await getAppTimezone());
  const week = weekRange(todayISO);
  const month = monthRange(todayISO);
  // The client-side period toggle (Today/This week/This month) filters
  // within this single server-fetched window, so it has to cover the
  // widest of the three — plus every still-open instance regardless of
  // due date, since overdue items never leave the dashboard on their own.
  const queryStart = week.start < month.start ? week.start : month.start;
  const queryEnd = week.end > month.end ? week.end : month.end;

  const [
    instancesRes,
    tasksRes,
    companiesRes,
    teamsRes,
    profilesRes,
    dimensionsRes,
    dimensionValuesRes,
    companyDimensionValuesRes,
  ] = await Promise.all([
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
    supabase.from("teams").select("id, name").eq("is_archived", false).order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("is_archived", false)
      .order("full_name"),
    supabase.from("dimensions").select("id, name").order("created_at"),
    supabase.from("dimension_values").select("id, dimension_id, value").order("value"),
    supabase.from("company_dimension_values").select("company_id, dimension_id, dimension_value_id"),
  ]);

  const taskById = new Map((tasksRes.data ?? []).map((t) => [t.id, t]));
  const companyNameById = new Map((companiesRes.data ?? []).map((c) => [c.id, c.name]));
  const teamNameById = new Map((teamsRes.data ?? []).map((t) => [t.id, t.name]));
  const profileNameById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p.full_name ?? p.email]),
  );
  const dimensionValueLabelById = new Map((dimensionValuesRes.data ?? []).map((v) => [v.id, v.value]));

  const teamOptions: DashboardFilterOption[] = (teamsRes.data ?? []).map((t) => ({
    id: t.id,
    label: t.name,
  }));
  const assigneeOptions: DashboardFilterOption[] = (profilesRes.data ?? []).map((p) => ({
    id: p.id,
    label: p.full_name ?? p.email,
  }));
  const dimensionOptions: DashboardDimensionOption[] = (dimensionsRes.data ?? []).map((dim) => ({
    id: dim.id,
    name: dim.name,
    values: (dimensionValuesRes.data ?? [])
      .filter((v) => v.dimension_id === dim.id)
      .map((v) => ({ id: v.id, value: v.value })),
  }));
  const companyDimensionValues: CompanyDimensionValues = {};
  for (const row of companyDimensionValuesRes.data ?? []) {
    (companyDimensionValues[row.company_id] ??= {})[row.dimension_id] = row.dimension_value_id;
  }

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
        originalAssigneeLabel:
          task.assignee_type === "team"
            ? (teamNameById.get(task.assignee_team_id ?? "") ?? "Unknown team")
            : (profileNameById.get(task.assignee_profile_id ?? "") ?? "Unknown person"),
        scopeChips: scope
          .map((id) => dimensionValueLabelById.get(id))
          .filter((v): v is string => !!v),
        isMine: false, // finalized below, once every instance in the group is known
        assigneeTeamId: task.assignee_team_id,
        assigneeProfileId: task.assignee_profile_id,
        instances: [],
      };
      groups.set(key, group);
    }

    // Effective assignee (addendum §15.3.3): an instance-level override
    // takes precedence over the task's own assignee for every dashboard
    // read, including "is this mine" and the greeting/overdue counts.
    const effective = resolveEffectiveAssignee(
      {
        assigneeType: task.assignee_type,
        assigneeTeamId: task.assignee_team_id,
        assigneeProfileId: task.assignee_profile_id,
      },
      instance.assignee_override_profile_id,
    );
    const instanceIsMine =
      effective.type === "person"
        ? effective.profileId === profile.id
        : effective.teamId !== null && effective.teamId === profile.team_id;

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
      isOverride: effective.isOverride,
      effectiveAssigneeProfileId: effective.profileId,
      effectiveAssigneeName: effective.profileId
        ? (profileNameById.get(effective.profileId) ?? null)
        : null,
      isMine: instanceIsMine,
    };
    group.instances.push(companyInstance);
    if (instanceIsMine) group.isMine = true;
  }

  for (const group of groups.values()) {
    group.instances.sort((a, b) => a.companyName.localeCompare(b.companyName));
  }

  const taskGroups = [...groups.values()].sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title),
  );

  const allInstances = taskGroups.flatMap((g) =>
    g.instances.map((i) => ({ ...i, dueDate: g.dueDate })),
  );

  const todayOpenMineCount = allInstances.filter(
    (i) => i.isMine && i.status === "open" && i.dueDate === todayISO,
  ).length;

  const overdueMineCount = allInstances.filter(
    (i) => i.isMine && i.status === "open" && i.dueDate < todayISO,
  ).length;

  const firstName = (profile.full_name ?? profile.email).split(" ")[0];

  return (
    <DashboardView
      currentProfileId={profile.id}
      firstName={firstName}
      todayCount={todayOpenMineCount}
      overdueCount={overdueMineCount}
      todayISO={todayISO}
      groups={taskGroups}
      teamOptions={teamOptions}
      assigneeOptions={assigneeOptions}
      dimensionOptions={dimensionOptions}
      companyDimensionValues={companyDimensionValues}
    />
  );
}
