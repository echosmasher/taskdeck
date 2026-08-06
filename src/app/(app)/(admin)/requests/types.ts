import type { ReassignmentRequestSummary } from "@/app/(app)/reassignment-types";
import type { DeadlineRule, Recurrence } from "@/lib/tasks/recurrence-types";

export interface RequestRow extends ReassignmentRequestSummary {
  requesterName: string;
  taskAssigneeType: "team" | "person";
  taskAssigneeTeamId: string | null;
  taskAssigneeProfileId: string | null;
  taskRecurrence: Recurrence | null;
  taskDeadlineRule: DeadlineRule;
  taskScope: string[];
  currentAssigneeLabel: string;
  instances: { instanceId: string; companyName: string; dueDate: string }[];
  decidedByName: string | null;
}
