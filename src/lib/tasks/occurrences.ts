import {
  clampDayOfMonth,
  isWorkingDay,
  nthWorkingDayOfMonth,
  weeklyOccurrencesInRange,
} from "@/lib/dates";
import type { DeadlineRule, Recurrence } from "./recurrence-types";

interface MonthKey {
  year: number;
  month: number;
}

function monthsTouching(start: Date, end: Date): MonthKey[] {
  const months: MonthKey[] = [];
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth() + 1;
  const endYear = end.getUTCFullYear();
  const endMonth = end.getUTCMonth() + 1;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({ year, month });
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  return months;
}

/**
 * All occurrence dates for a task's recurrence rule that fall within
 * [windowStart, windowEnd], inclusive. Malformed/out-of-range monthly
 * rules (e.g. n exceeding the working days in a given month) are
 * skipped for that month rather than throwing, so one bad month never
 * blocks generation for every other task.
 */
export function occurrencesInWindow(
  recurrence: Recurrence,
  windowStart: Date,
  windowEnd: Date,
  holidays: ReadonlySet<string>,
): Date[] {
  switch (recurrence.type) {
    case "one_off": {
      const [y, m, d] = recurrence.date.split("-").map(Number);
      if (!y || !m || !d) return [];
      const date = new Date(Date.UTC(y, m - 1, d));
      return date >= windowStart && date <= windowEnd ? [date] : [];
    }

    case "weekly":
      return weeklyOccurrencesInRange(recurrence.weekday, windowStart, windowEnd);

    case "monthly_fixed":
      return monthsTouching(windowStart, windowEnd)
        .map(({ year, month }) => clampDayOfMonth(year, month, recurrence.dayOfMonth))
        .filter((date) => date >= windowStart && date <= windowEnd);

    case "monthly_nth_working_day":
      return monthsTouching(windowStart, windowEnd)
        .flatMap(({ year, month }) => {
          try {
            return [nthWorkingDayOfMonth(year, month, recurrence.n, holidays)];
          } catch {
            return [];
          }
        })
        .filter((date) => date >= windowStart && date <= windowEnd);
  }
}

/** The due date for an occurrence, applying the optional deadline override (§14). */
export function dueDateForOccurrence(
  occurrence: Date,
  deadlineRule: DeadlineRule,
  holidaysByCountry: ReadonlyMap<string, ReadonlySet<string>>,
): Date {
  if (!deadlineRule) return occurrence;

  if (deadlineRule.offsetType === "calendar") {
    return new Date(
      Date.UTC(
        occurrence.getUTCFullYear(),
        occurrence.getUTCMonth(),
        occurrence.getUTCDate() + deadlineRule.offsetDays,
      ),
    );
  }

  const holidays = holidaysByCountry.get(deadlineRule.countryCode ?? "") ?? new Set<string>();
  const step = deadlineRule.offsetDays >= 0 ? 1 : -1;
  let remaining = Math.abs(deadlineRule.offsetDays);
  let cursor = occurrence;
  while (remaining > 0) {
    cursor = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + step),
    );
    if (isWorkingDay(cursor, holidays)) remaining--;
  }
  return cursor;
}
