import type { DeadlineRule, Recurrence } from "./recurrence-types";
import { WEEKDAY_LABELS } from "./recurrence-types";

function ordinal(n: number): string {
  const abs = Math.abs(n);
  const suffix =
    abs % 10 === 1 && abs % 100 !== 11
      ? "st"
      : abs % 10 === 2 && abs % 100 !== 12
        ? "nd"
        : abs % 10 === 3 && abs % 100 !== 13
          ? "rd"
          : "th";
  return `${abs}${suffix}`;
}

export function describeRecurrence(recurrence: Recurrence): string {
  switch (recurrence.type) {
    case "one_off":
      return `One-off, due ${recurrence.date}`;
    case "weekly":
      return `Weekly on ${WEEKDAY_LABELS[recurrence.weekday]}`;
    case "monthly_fixed":
      return `Monthly on the ${ordinal(recurrence.dayOfMonth)}`;
    case "monthly_nth_working_day":
      return recurrence.n > 0
        ? `Monthly, ${ordinal(recurrence.n)} working day (${recurrence.countryCode})`
        : recurrence.n === -1
          ? `Monthly, last working day (${recurrence.countryCode})`
          : `Monthly, ${ordinal(Math.abs(recurrence.n))}-last working day (${recurrence.countryCode})`;
  }
}

export function describeDeadlineRule(rule: DeadlineRule): string | null {
  if (!rule) return null;
  const unit = rule.offsetType === "working" ? "working day" : "calendar day";
  const plural = Math.abs(rule.offsetDays) === 1 ? "" : "s";
  const direction = rule.offsetDays >= 0 ? "after" : "before";
  const country = rule.offsetType === "working" ? ` (${rule.countryCode})` : "";
  return `Due ${Math.abs(rule.offsetDays)} ${unit}${plural} ${direction} occurrence${country}`;
}
