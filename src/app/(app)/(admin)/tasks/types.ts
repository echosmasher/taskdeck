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

/** Everything the assignment-time absence warning (addendum §15.3.2) needs, precomputed server-side. */
export interface AbsenceWarningContext {
  companies: { id: string; dimensionValues: Record<string, string> }[];
  dimensionValueToDimension: Record<string, string>;
  /** profileId -> date -> calendar_entries status */
  entriesByProfile: Record<string, Record<string, string>>;
  /** countryCode -> holiday dates */
  holidaysByCountry: Record<string, string[]>;
  longAbsenceStatuses: string[];
  longAbsenceMinDays: number;
  todayISO: string;
}
