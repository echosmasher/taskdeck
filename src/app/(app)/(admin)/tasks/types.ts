import type { Tables } from "@/lib/supabase/database.types";
import type { DeadlineRule, Recurrence } from "@/lib/tasks/recurrence-types";

export type TaskRow = Omit<Tables<"tasks">, "recurrence" | "deadline_rule" | "scope"> & {
  recurrence: Recurrence;
  deadline_rule: DeadlineRule;
  scope: string[];
  assigneeLabel: string;
};

export interface DimensionOption {
  id: string;
  name: string;
  values: { id: string; value: string }[];
}

export interface TeamOption {
  id: string;
  name: string;
}

export interface MemberOption {
  id: string;
  label: string;
}
