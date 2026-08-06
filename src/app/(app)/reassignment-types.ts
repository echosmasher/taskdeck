import type { Database } from "@/lib/supabase/database.types";

export type ReassignmentScope = Database["public"]["Enums"]["reassignment_request_scope"];
export type ReassignmentStatus = Database["public"]["Enums"]["reassignment_request_status"];

export interface ReassignmentRequestSummary {
  id: string;
  taskId: string;
  taskTitle: string;
  scope: ReassignmentScope;
  taskInstanceIds: string[];
  status: ReassignmentStatus;
  reason: string;
  suggestedAssigneeProfileId: string | null;
  suggestedAssigneeName: string | null;
  createdAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
}
