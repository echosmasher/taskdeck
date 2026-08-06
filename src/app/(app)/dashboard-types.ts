export type DashboardInstanceStatus = "open" | "completed" | "na";

export interface DashboardCompanyInstance {
  instanceId: string;
  companyId: string;
  companyName: string;
  status: DashboardInstanceStatus;
  statusSetByName: string | null;
  statusSetAt: string | null;
  naReason: string | null;
  /** True when assignee_override_profile_id is set on this instance (addendum §15.3.3). */
  isOverride: boolean;
  effectiveAssigneeProfileId: string | null;
  effectiveAssigneeName: string | null;
  /** Whether *this instance* is effectively assigned to the current viewer. */
  isMine: boolean;
}

/** One row on the dashboard: a task occurrence, fanned out per company (§5, §7.1). */
export interface DashboardTaskGroup {
  key: string;
  taskId: string;
  dueDate: string;
  title: string;
  /** "Group – {team}" for team tasks, null for person tasks (§7.1). */
  assigneeChip: string | null;
  /** The task's raw declared assignee, always a plain name/team label — used for "Covering for {x}" chips. */
  originalAssigneeLabel: string;
  scopeChips: string[];
  /** True when any instance in this group is effectively assigned to the current viewer. */
  isMine: boolean;
  assigneeTeamId: string | null;
  assigneeProfileId: string | null;
  instances: DashboardCompanyInstance[];
}

export interface DashboardFilterOption {
  id: string;
  label: string;
}

export interface DashboardDimensionOption {
  id: string;
  name: string;
  values: { id: string; value: string }[];
}

/** company id -> dimension id -> dimension value id, for the all-tasks dimension filters. */
export type CompanyDimensionValues = Record<string, Record<string, string>>;
