import { describe, expect, it } from "vitest";
import {
  clampDayOfMonth,
  daysInMonth,
  fromISODate,
  getTodayInTimezone,
  isOverdue,
  isOverdueInstance,
  isWorkingDay,
  nthWorkingDayOfMonth,
  toISODate,
  weeklyOccurrencesInRange,
} from "./dates";

// Norway 2026 holidays relevant to the tests below (subset of the seed
// data in supabase/migrations/20260806121553_holidays.sql).
const NO_2026 = new Set([
  "2026-01-01",
  "2026-04-02", // Maundy Thursday
  "2026-04-03", // Good Friday
  "2026-04-06", // Easter Monday
  "2026-05-01",
  "2026-05-14",
  "2026-05-17",
  "2026-05-25",
  "2026-12-25",
  "2026-12-26",
]);

describe("toISODate / fromISODate", () => {
  it("round-trips", () => {
    const date = new Date(Date.UTC(2026, 3, 5)); // April is month index 3
    expect(toISODate(date)).toBe("2026-04-05");
    expect(toISODate(fromISODate("2026-04-05"))).toBe("2026-04-05");
  });
});

describe("daysInMonth", () => {
  it("handles 30/31-day months", () => {
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it("handles February in a non-leap year", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
  });

  it("handles February in a leap year", () => {
    expect(daysInMonth(2028, 2)).toBe(29);
  });
});

describe("isWorkingDay", () => {
  it("rejects weekends regardless of the holiday set", () => {
    // 2026-04-04 is a Saturday
    expect(isWorkingDay(fromISODate("2026-04-04"), new Set())).toBe(false);
    // 2026-04-05 is a Sunday
    expect(isWorkingDay(fromISODate("2026-04-05"), new Set())).toBe(false);
  });

  it("rejects a weekday that's a holiday", () => {
    // 2026-04-03 is a Friday and Good Friday
    expect(isWorkingDay(fromISODate("2026-04-03"), NO_2026)).toBe(false);
  });

  it("accepts an ordinary weekday", () => {
    // 2026-04-01 is a Wednesday, not a holiday
    expect(isWorkingDay(fromISODate("2026-04-01"), NO_2026)).toBe(true);
  });
});

describe("nthWorkingDayOfMonth", () => {
  it("skips a holiday+weekend cluster for a positive N", () => {
    // April 2026: 1=Wed(working #1), 2=Thu(Maundy Thu, holiday),
    // 3=Fri(Good Friday, holiday), 4-5=weekend, 6=Mon(Easter Monday,
    // holiday), 7=Tue -> working day #2.
    expect(toISODate(nthWorkingDayOfMonth(2026, 4, 2, NO_2026))).toBe("2026-04-07");
  });

  it("returns the last working day of the month for n=-1, skipping a weekend", () => {
    // May 2026 ends on a Sunday (31st); the 30th is Saturday, so the
    // last working day is the 29th (Friday, not a holiday).
    expect(toISODate(nthWorkingDayOfMonth(2026, 5, -1, NO_2026))).toBe("2026-05-29");
  });

  it("returns the last working day for a month with no trailing weekend/holiday", () => {
    // December 2026 ends on Thursday 31st, an ordinary working day.
    expect(toISODate(nthWorkingDayOfMonth(2026, 12, -1, NO_2026))).toBe("2026-12-31");
  });

  it("counts backward correctly for n=-2", () => {
    expect(toISODate(nthWorkingDayOfMonth(2026, 12, -2, NO_2026))).toBe("2026-12-30");
  });

  it("throws for n=0", () => {
    expect(() => nthWorkingDayOfMonth(2026, 4, 0, NO_2026)).toThrow();
  });

  it("throws when the month doesn't have that many working days", () => {
    expect(() => nthWorkingDayOfMonth(2026, 4, 32, NO_2026)).toThrow();
  });
});

describe("clampDayOfMonth", () => {
  it("clamps day 31 to the last day of a 30-day month", () => {
    expect(toISODate(clampDayOfMonth(2026, 4, 31))).toBe("2026-04-30");
  });

  it("clamps day 31 to Feb 28 in a non-leap year", () => {
    expect(toISODate(clampDayOfMonth(2026, 2, 31))).toBe("2026-02-28");
  });

  it("does not clamp day 29 in a leap-year February", () => {
    expect(toISODate(clampDayOfMonth(2028, 2, 29))).toBe("2028-02-29");
  });

  it("leaves an in-range day untouched", () => {
    expect(toISODate(clampDayOfMonth(2026, 6, 15))).toBe("2026-06-15");
  });
});

describe("weeklyOccurrencesInRange", () => {
  it("finds every Tuesday in a three-week range", () => {
    const start = fromISODate("2026-04-01"); // Wednesday
    const end = fromISODate("2026-04-21"); // Tuesday
    const tuesdays = weeklyOccurrencesInRange(2, start, end).map(toISODate);
    expect(tuesdays).toEqual(["2026-04-07", "2026-04-14", "2026-04-21"]);
  });

  it("includes the range start when it matches", () => {
    const start = fromISODate("2026-04-01"); // Wednesday
    const end = fromISODate("2026-04-08");
    const wednesdays = weeklyOccurrencesInRange(3, start, end).map(toISODate);
    expect(wednesdays).toEqual(["2026-04-01", "2026-04-08"]);
  });

  it("returns nothing when no occurrence falls in the range", () => {
    const start = fromISODate("2026-04-01");
    const end = fromISODate("2026-04-01");
    expect(weeklyOccurrencesInRange(5, start, end)).toEqual([]); // Friday, range is a single Wednesday
  });
});

describe("getTodayInTimezone", () => {
  it("rolls over to the next calendar day when UTC is still on the previous day (CEST, UTC+2)", () => {
    // 23:30 UTC in June is already 01:30 the next day in Oslo (summer time).
    expect(getTodayInTimezone("Europe/Oslo", new Date("2026-06-15T23:30:00Z"))).toBe("2026-06-16");
  });

  it("stays on the same calendar day for a UTC morning instant (CET, UTC+1)", () => {
    expect(getTodayInTimezone("Europe/Oslo", new Date("2026-01-15T10:00:00Z"))).toBe("2026-01-15");
  });

  it("is genuinely timezone-aware, not hardcoded to Oslo", () => {
    // Same instant, earlier calendar date in New York.
    const instant = new Date("2026-06-16T02:00:00Z");
    expect(getTodayInTimezone("Europe/Oslo", instant)).toBe("2026-06-16");
    expect(getTodayInTimezone("America/New_York", instant)).toBe("2026-06-15");
  });
});

describe("isOverdue", () => {
  it("is true when due date is before today", () => {
    expect(isOverdue("2026-04-01", "2026-04-02")).toBe(true);
  });

  it("is false when due date equals today", () => {
    expect(isOverdue("2026-04-02", "2026-04-02")).toBe(false);
  });

  it("is false when due date is after today", () => {
    expect(isOverdue("2026-04-03", "2026-04-02")).toBe(false);
  });
});

describe("isOverdueInstance", () => {
  it("is true for an open instance past its due date", () => {
    expect(isOverdueInstance({ dueDate: "2026-04-01", status: "open" }, "2026-04-02")).toBe(true);
  });

  it("is false for a completed instance past its due date", () => {
    expect(isOverdueInstance({ dueDate: "2026-04-01", status: "completed" }, "2026-04-02")).toBe(
      false,
    );
  });

  it("is false for an n/a instance past its due date", () => {
    expect(isOverdueInstance({ dueDate: "2026-04-01", status: "na" }, "2026-04-02")).toBe(false);
  });

  it("is false for an open instance due today", () => {
    expect(isOverdueInstance({ dueDate: "2026-04-02", status: "open" }, "2026-04-02")).toBe(false);
  });
});
