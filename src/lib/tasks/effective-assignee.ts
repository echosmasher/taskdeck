/**
 * Effective-assignee resolution (addendum §15.3.3): an instance's
 * assignee_override_profile_id, when set, takes precedence over the
 * task definition's own assignee. Every dashboard, History, and
 * coverage query is supposed to resolve through this rather than
 * reading the task's raw assignee directly.
 */
export interface TaskAssignee {
  assigneeType: "team" | "person";
  assigneeTeamId: string | null;
  assigneeProfileId: string | null;
}

export interface EffectiveAssignee {
  type: "team" | "person";
  teamId: string | null;
  profileId: string | null;
  isOverride: boolean;
}

export function resolveEffectiveAssignee(
  task: TaskAssignee,
  overrideProfileId: string | null,
): EffectiveAssignee {
  if (overrideProfileId) {
    return { type: "person", teamId: null, profileId: overrideProfileId, isOverride: true };
  }
  return {
    type: task.assigneeType,
    teamId: task.assigneeTeamId,
    profileId: task.assigneeProfileId,
    isOverride: false,
  };
}
