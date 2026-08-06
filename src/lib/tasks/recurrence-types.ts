export type Recurrence =
  | { type: "one_off"; date: string }
  | { type: "weekly"; weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6 }
  | { type: "monthly_fixed"; dayOfMonth: number }
  | { type: "monthly_nth_working_day"; n: number; countryCode: string };

/**
 * Nullable — null means the due date IS the recurrence occurrence date,
 * which is the common case (spec §14). Only set when the deadline
 * genuinely differs from when the task recurs.
 */
export type DeadlineRule = {
  offsetDays: number;
  offsetType: "calendar" | "working";
  countryCode?: string;
} | null;

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
