import type { Tables } from "@/lib/supabase/database.types";

export interface HistoryRow {
  instanceId: string;
  taskId: string;
  taskTitle: string;
  companyId: string;
  companyName: string;
  dueDate: string;
  status: "completed" | "na";
  statusSetById: string | null;
  statusSetByName: string | null;
  statusSetAt: string | null;
  naReason: string | null;
  /** True when this instance had assignee_override_profile_id set (addendum §15.3.3). */
  isOverride: boolean;
  effectiveAssigneeName: string | null;
}

export interface HistoryEvent {
  id: string;
  event: Tables<"task_events">["event"];
  actorName: string | null;
  occurredAt: string;
  details: Record<string, unknown>;
}

export interface FilterOption {
  id: string;
  label: string;
}
