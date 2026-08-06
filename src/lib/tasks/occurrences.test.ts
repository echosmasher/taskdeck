import { describe, expect, it } from "vitest";
import { fromISODate, toISODate } from "@/lib/dates";
import { dueDateForOccurrence, occurrencesInWindow } from "./occurrences";
import type { Recurrence } from "./recurrence-types";

const NO_2026 = new Set([
  "2026-04-02", // Maundy Thursday
  "2026-04-03", // Good Friday
  "2026-04-06", // Easter Monday
]);

describe("occurrencesInWindow", () => {
  it("includes a one-off date inside the window and excludes one outside it", () => {
    const start = fromISODate("2026-04-01");
    const end = fromISODate("2026-04-30");
    const inside: Recurrence = { type: "one_off", date: "2026-04-15" };
    const before: Recurrence = { type: "one_off", date: "2026-03-31" };
    const after: Recurrence = { type: "one_off", date: "2026-05-01" };

    expect(occurrencesInWindow(inside, start, end, new Set()).map(toISODate)).toEqual([
      "2026-04-15",
    ]);
    expect(occurrencesInWindow(before, start, end, new Set())).toEqual([]);
    expect(occurrencesInWindow(after, start, end, new Set())).toEqual([]);
  });

  it("finds every weekly occurrence in a multi-week window", () => {
    const start = fromISODate("2026-04-01"); // Wednesday
    const end = fromISODate("2026-04-14");
    const weekly: Recurrence = { type: "weekly", weekday: 2 }; // Tuesday
    expect(occurrencesInWindow(weekly, start, end, new Set()).map(toISODate)).toEqual([
      "2026-04-07",
      "2026-04-14",
    ]);
  });

  it("clamps a monthly-fixed recurrence across a window spanning two months", () => {
    const start = fromISODate("2026-04-25");
    const end = fromISODate("2026-05-05");
    const monthly: Recurrence = { type: "monthly_fixed", dayOfMonth: 31 };
    // April has 30 days (clamps to 30, outside this window since window starts 25th... 30 is in range),
    // May 31 doesn't exist within the window end (May 5) so only April's clamped date appears.
    expect(occurrencesInWindow(monthly, start, end, new Set()).map(toISODate)).toEqual([
      "2026-04-30",
    ]);
  });

  it("computes the last working day per month for negative N, skipping a month where it falls outside the window", () => {
    const start = fromISODate("2026-04-01");
    const end = fromISODate("2026-05-31");
    const lastWorkingDay: Recurrence = { type: "monthly_nth_working_day", n: -1, countryCode: "NO" };
    const results = occurrencesInWindow(lastWorkingDay, start, end, NO_2026).map(toISODate);
    // April 2026 ends on a Thursday (30th), not a holiday -> last working day = Apr 30.
    expect(results).toContain("2026-04-30");
    // Two months' worth of occurrences (April, May).
    expect(results).toHaveLength(2);
  });

  it("skips a month where n exceeds the available working days instead of throwing", () => {
    const start = fromISODate("2026-04-01");
    const end = fromISODate("2026-05-31");
    const impossible: Recurrence = { type: "monthly_nth_working_day", n: 50, countryCode: "NO" };
    expect(occurrencesInWindow(impossible, start, end, NO_2026)).toEqual([]);
  });
});

describe("dueDateForOccurrence", () => {
  const occurrence = fromISODate("2026-04-15"); // Wednesday

  it("returns the occurrence date unchanged when there is no override", () => {
    expect(toISODate(dueDateForOccurrence(occurrence, null, new Map()))).toBe("2026-04-15");
  });

  it("applies a positive calendar-day offset", () => {
    const rule = { offsetDays: 5, offsetType: "calendar" as const };
    expect(toISODate(dueDateForOccurrence(occurrence, rule, new Map()))).toBe("2026-04-20");
  });

  it("applies a negative calendar-day offset", () => {
    const rule = { offsetDays: -3, offsetType: "calendar" as const };
    expect(toISODate(dueDateForOccurrence(occurrence, rule, new Map()))).toBe("2026-04-12");
  });

  it("applies a working-day offset, skipping a holiday+weekend cluster", () => {
    // From Wed Apr 1 2026, +1 working day must skip Thu 2 (Maundy Thu,
    // holiday), Fri 3 (Good Friday, holiday), Sat/Sun 4-5 (weekend), and
    // Mon 6 (Easter Monday, holiday), landing on Tue Apr 7.
    const start = fromISODate("2026-04-01");
    const rule = { offsetDays: 1, offsetType: "working" as const, countryCode: "NO" };
    const holidaysByCountry = new Map([["NO", NO_2026]]);
    expect(toISODate(dueDateForOccurrence(start, rule, holidaysByCountry))).toBe("2026-04-07");
  });

  it("applies a negative working-day offset, skipping the same cluster in reverse", () => {
    const start = fromISODate("2026-04-07");
    const rule = { offsetDays: -1, offsetType: "working" as const, countryCode: "NO" };
    const holidaysByCountry = new Map([["NO", NO_2026]]);
    expect(toISODate(dueDateForOccurrence(start, rule, holidaysByCountry))).toBe("2026-04-01");
  });
});
