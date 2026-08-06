import type { DeadlineRule, Recurrence } from "./recurrence-types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COUNTRY_CODE_RE = /^[A-Z]{2}$/;

export function parseRecurrence(raw: unknown): { recurrence: Recurrence } | { error: string } {
  if (typeof raw !== "object" || raw === null) return { error: "Recurrence is required." };
  const value = raw as Record<string, unknown>;

  switch (value.type) {
    case "one_off": {
      if (typeof value.date !== "string" || !ISO_DATE_RE.test(value.date)) {
        return { error: "Pick a due date for the one-off task." };
      }
      return { recurrence: { type: "one_off", date: value.date } };
    }
    case "weekly": {
      const weekday = Number(value.weekday);
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
        return { error: "Pick a weekday." };
      }
      return { recurrence: { type: "weekly", weekday: weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6 } };
    }
    case "monthly_fixed": {
      const dayOfMonth = Number(value.dayOfMonth);
      if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
        return { error: "Day of month must be between 1 and 31." };
      }
      return { recurrence: { type: "monthly_fixed", dayOfMonth } };
    }
    case "monthly_nth_working_day": {
      const n = Number(value.n);
      const countryCode = String(value.countryCode ?? "");
      if (!Number.isInteger(n) || n === 0) {
        return { error: "N must be a nonzero whole number (e.g. 2 or -1)." };
      }
      if (!COUNTRY_CODE_RE.test(countryCode)) {
        return { error: "Pick a country for the working-day calculation." };
      }
      return { recurrence: { type: "monthly_nth_working_day", n, countryCode } };
    }
    default:
      return { error: "Pick a recurrence type." };
  }
}

export function parseDeadlineRule(raw: unknown): { deadlineRule: DeadlineRule } | { error: string } {
  if (raw === null || raw === undefined) return { deadlineRule: null };
  if (typeof raw !== "object") return { error: "Invalid deadline override." };
  const value = raw as Record<string, unknown>;

  const offsetDays = Number(value.offsetDays);
  if (!Number.isInteger(offsetDays)) {
    return { error: "Deadline offset must be a whole number of days." };
  }
  if (value.offsetType !== "calendar" && value.offsetType !== "working") {
    return { error: "Pick calendar or working days for the deadline offset." };
  }
  if (value.offsetType === "working") {
    const countryCode = String(value.countryCode ?? "");
    if (!COUNTRY_CODE_RE.test(countryCode)) {
      return { error: "Pick a country for the working-day deadline offset." };
    }
    return { deadlineRule: { offsetDays, offsetType: "working", countryCode } };
  }
  return { deadlineRule: { offsetDays, offsetType: "calendar" } };
}
