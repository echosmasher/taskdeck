import { describe, expect, it } from "vitest";
import { classifyAbsence } from "./absence";

// Same Norway 2026 holiday subset used in dates.test.ts.
const NO_2026 = new Set([
  "2026-01-01",
  "2026-04-02",
  "2026-04-03",
  "2026-04-06",
  "2026-05-01", // Labour Day — a Friday in 2026
  "2026-05-14",
  "2026-05-17",
  "2026-05-25",
  "2026-12-25",
  "2026-12-26",
]);

const DEFAULT_OPTIONS = {
  longAbsenceStatuses: ["sick_leave", "parental_leave"],
  longAbsenceMinDays: 5,
  holidays: new Set<string>(),
};

function entries(pairs: [string, string][]): Map<string, string> {
  return new Map(pairs);
}

describe("classifyAbsence — present", () => {
  it("classifies a day with no entry as present", () => {
    expect(classifyAbsence("2026-04-13", entries([]), DEFAULT_OPTIONS)).toBe("present");
  });

  it("classifies in_office as present", () => {
    const e = entries([["2026-04-13", "in_office"]]);
    expect(classifyAbsence("2026-04-13", e, DEFAULT_OPTIONS)).toBe("present");
  });

  it("classifies remote as present — remote is explicitly not an absence", () => {
    const e = entries([["2026-04-13", "remote"]]);
    expect(classifyAbsence("2026-04-13", e, DEFAULT_OPTIONS)).toBe("present");
  });
});

describe("classifyAbsence — always-long-term statuses", () => {
  it("classifies a single day of sick_leave as long-term (default long_absence_statuses)", () => {
    const e = entries([["2026-04-13", "sick_leave"]]);
    expect(classifyAbsence("2026-04-13", e, DEFAULT_OPTIONS)).toBe("long_term");
  });

  it("classifies a single day of parental_leave as long-term", () => {
    const e = entries([["2026-04-13", "parental_leave"]]);
    expect(classifyAbsence("2026-04-13", e, DEFAULT_OPTIONS)).toBe("long_term");
  });

  it("classifies a single day of sick as short-term (not in the default long list)", () => {
    const e = entries([["2026-04-13", "sick"]]);
    expect(classifyAbsence("2026-04-13", e, DEFAULT_OPTIONS)).toBe("short_term");
  });

  it("classifies a single day of business_travel as short-term", () => {
    const e = entries([["2026-04-13", "business_travel"]]);
    expect(classifyAbsence("2026-04-13", e, DEFAULT_OPTIONS)).toBe("short_term");
  });

  it("honors a custom long_absence_statuses list", () => {
    const e = entries([["2026-04-13", "business_travel"]]);
    const options = { ...DEFAULT_OPTIONS, longAbsenceStatuses: ["business_travel"] };
    expect(classifyAbsence("2026-04-13", e, options)).toBe("long_term");
  });
});

describe("classifyAbsence — out_of_office runs", () => {
  it("is short-term below the threshold", () => {
    const e = entries([
      ["2026-04-13", "out_of_office"],
      ["2026-04-14", "out_of_office"],
    ]);
    expect(classifyAbsence("2026-04-13", e, DEFAULT_OPTIONS)).toBe("short_term");
  });

  it("is long-term at exactly the threshold (5 consecutive working days)", () => {
    const e = entries([
      ["2026-04-13", "out_of_office"], // Mon
      ["2026-04-14", "out_of_office"],
      ["2026-04-15", "out_of_office"],
      ["2026-04-16", "out_of_office"],
      ["2026-04-17", "out_of_office"], // Fri
    ]);
    // Check both an endpoint and a middle day of the run.
    expect(classifyAbsence("2026-04-13", e, DEFAULT_OPTIONS)).toBe("long_term");
    expect(classifyAbsence("2026-04-15", e, DEFAULT_OPTIONS)).toBe("long_term");
    expect(classifyAbsence("2026-04-17", e, DEFAULT_OPTIONS)).toBe("long_term");
  });

  it("is short-term one day below a raised threshold", () => {
    const e = entries([
      ["2026-04-13", "out_of_office"],
      ["2026-04-14", "out_of_office"],
      ["2026-04-15", "out_of_office"],
      ["2026-04-16", "out_of_office"],
      ["2026-04-17", "out_of_office"],
    ]);
    expect(classifyAbsence("2026-04-13", e, { ...DEFAULT_OPTIONS, longAbsenceMinDays: 6 })).toBe(
      "short_term",
    );
  });

  it("does not break continuity over a weekend", () => {
    // Fri 4-17 through the following Wed 4-22 (skipping the Sat/Sun in
    // between) is 4 working days — still short of the default
    // threshold of 5, which is the point: a naive same-week-only scan
    // would already have "ended" the run at Friday.
    const e = entries([
      ["2026-04-17", "out_of_office"], // Fri
      ["2026-04-20", "out_of_office"], // Mon
      ["2026-04-21", "out_of_office"], // Tue
      ["2026-04-22", "out_of_office"], // Wed
    ]);
    expect(classifyAbsence("2026-04-17", e, DEFAULT_OPTIONS)).toBe("short_term");

    // Extend it by one more working day to clear the threshold, still
    // via a run that spans the weekend gap.
    e.set("2026-04-23", "out_of_office"); // Thu
    expect(classifyAbsence("2026-04-17", e, DEFAULT_OPTIONS)).toBe("long_term");
  });

  it("breaks continuity on a working day that isn't out_of_office", () => {
    const e = entries([
      ["2026-04-13", "out_of_office"],
      ["2026-04-14", "out_of_office"],
      ["2026-04-15", "in_office"], // breaks the run
      ["2026-04-16", "out_of_office"],
      ["2026-04-17", "out_of_office"],
    ]);
    expect(classifyAbsence("2026-04-13", e, DEFAULT_OPTIONS)).toBe("short_term");
    expect(classifyAbsence("2026-04-17", e, DEFAULT_OPTIONS)).toBe("short_term");
  });

  it("breaks continuity on a working day with no entry at all", () => {
    const e = entries([
      ["2026-04-13", "out_of_office"],
      ["2026-04-14", "out_of_office"],
      // 4-15 has no entry
      ["2026-04-16", "out_of_office"],
      ["2026-04-17", "out_of_office"],
    ]);
    expect(classifyAbsence("2026-04-13", e, DEFAULT_OPTIONS)).toBe("short_term");
  });

  it("does not break continuity over a holiday when holidays are supplied", () => {
    // Thu-Fri-(holiday Fri May 1)-weekend-Mon-Tue = 6 working days of
    // out_of_office once the holiday and weekend are skipped rather
    // than required to also be marked out_of_office.
    const e = entries([
      ["2026-04-27", "out_of_office"], // Mon
      ["2026-04-28", "out_of_office"], // Tue
      ["2026-04-29", "out_of_office"], // Wed
      ["2026-04-30", "out_of_office"], // Thu
      // 2026-05-01 (Fri) is a holiday — deliberately no entry
      ["2026-05-04", "out_of_office"], // Mon
      ["2026-05-05", "out_of_office"], // Tue
    ]);
    expect(
      classifyAbsence("2026-04-27", e, { ...DEFAULT_OPTIONS, holidays: NO_2026 }),
    ).toBe("long_term");
  });

  it("treats an unmarked holiday as a working day (and so a break) when no holiday set is supplied", () => {
    const e = entries([
      ["2026-04-27", "out_of_office"],
      ["2026-04-28", "out_of_office"],
      ["2026-04-29", "out_of_office"],
      ["2026-04-30", "out_of_office"],
      ["2026-05-04", "out_of_office"],
      ["2026-05-05", "out_of_office"],
    ]);
    // Same data, empty holiday set: 2026-05-01 is now treated as an
    // ordinary working day, has no entry, and breaks the run at 4 days.
    expect(classifyAbsence("2026-04-27", e, DEFAULT_OPTIONS)).toBe("short_term");
  });
});
