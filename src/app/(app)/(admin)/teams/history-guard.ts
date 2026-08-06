import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Whether a team has any task history, which blocks hard delete (§4).
 * True if any instance exists for a task assigned to this team.
 */
export async function teamHasHistory(teamId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("task_instances")
    .select("id, tasks!inner(assignee_team_id)", { count: "exact", head: true })
    .eq("tasks.assignee_team_id", teamId);
  return !!count && count > 0;
}

/**
 * Whether a member has any task history, which blocks hard delete (§4).
 * True if any task was ever assigned to them directly, or if they ever
 * resolved (completed/marked N/A/reopened) any instance.
 */
export async function memberHasHistory(profileId: string): Promise<boolean> {
  const supabase = await createClient();

  const [assigned, resolved] = await Promise.all([
    supabase
      .from("task_instances")
      .select("id, tasks!inner(assignee_profile_id)", { count: "exact", head: true })
      .eq("tasks.assignee_profile_id", profileId),
    supabase
      .from("task_instances")
      .select("id", { count: "exact", head: true })
      .eq("status_set_by", profileId),
  ]);

  return (!!assigned.count && assigned.count > 0) || (!!resolved.count && resolved.count > 0);
}
