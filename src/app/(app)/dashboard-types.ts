export type DashboardInstanceStatus = "open" | "completed" | "na";

export interface DashboardCompanyInstance {
  instanceId: string;
  companyId: string;
  companyName: string;
  status: DashboardInstanceStatus;
  statusSetByName: string | null;
  statusSetAt: string | null;
  naReason: string | null;
}

/** One row on the dashboard: a task occurrence, fanned out per company (§5, §7.1). */
export interface DashboardTaskGroup {
  key: string;
  taskId: string;
  dueDate: string;
  title: string;
  /** "Group – {team}" for team tasks, null for person tasks (§7.1). */
  assigneeChip: string | null;
  scopeChips: string[];
  /** Assigned to the current user directly, or to their team. */
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
