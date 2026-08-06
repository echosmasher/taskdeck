import { createClient } from "@/lib/supabase/server";
import type { DeadlineRule, Recurrence } from "@/lib/tasks/recurrence-types";
import { TasksTable } from "./tasks-table";
import type { DimensionOption, MemberOption, TaskRow, TeamOption } from "./types";

export default async function TasksPage() {
  const supabase = await createClient();

  const [tasksRes, dimensionsRes, dimensionValuesRes, teamsRes, profilesRes, holidaysRes] =
    await Promise.all([
      supabase.from("tasks").select("*").order("title"),
      supabase.from("dimensions").select("id, name").order("created_at"),
      supabase.from("dimension_values").select("id, dimension_id, value").order("value"),
      supabase.from("teams").select("id, name").eq("is_archived", false).order("name"),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_archived", false)
        .order("full_name"),
      supabase.from("holidays").select("country_code"),
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
      />
    </div>
  );
}
