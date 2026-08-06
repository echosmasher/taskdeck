import { describe, expect, it } from "vitest";
import { computeAssignmentWarning } from "./assignment-warning";
import type { Recurrence } from "./recurrence-types";

const DEFAULT_CLASSIFY_OPTIONS = {
  longAbsenceStatuses: ["sick_leave", "parental_leave"],
  longAbsenceMinDays: 5,
  holidays: new Set<string>(),
};

const TWO_COMPANIES = [
  { id: "acme", dimensionValues: new Map<string, string>() },
  { id: "nordkyst", dimensionValues: new Map<string, string>() },
];

function baseInput(overrides: Partial<Parameters<typeof computeAssignmentWarning>[0]> = {}) {
  return {
    recurrence: { type: "weekly", weekday: 1 } as Recurrence, // Monday
    deadlineRule: null,
    scope: [],
    assigneeEntriesByDate: new Map<string, string>(),
    companies: TWO_COMPANIES,
    dimensionValueToDimension: new Map<string, string>(),
    holidaysByCountry: new Map<string, ReadonlySet<string>>(),
    classifyOptions: DEFAULT_CLASSIFY_OPTIONS,
    todayISO: "2026-04-13", // a Monday
    windowDays: 60,
    ...overrides,
  };
}

describe("computeAssignmentWarning", () => {
  it("returns no warning when the candidate has no overlapping absence", () => {
    const result = computeAssignmentWarning(baseInput());
    expect(result.longTerm).toBeNull();
    expect(result.shortTermOccurrenceCount).toBe(0);
  });

  it("flags a long-term overlap and counts occurrences and company instances", () => {
    const entries = new Map([
      ["2026-04-13", "parental_leave"],
      ["2026-04-20", "parental_leave"],
    ]);
    const result = computeAssignmentWarning(baseInput({ assigneeEntriesByDate: entries }));
    expect(result.longTerm).toEqual({
      rangeStart: "2026-04-13",
      rangeEnd: "2026-04-20",
      occurrenceCount: 2,
      companyInstanceCount: 4, // 2 occurrences x 2 matching companies
    });
  });

  it("counts a short-term overlap without flagging longTerm", () => {
    const entries = new Map([["2026-04-13", "sick"]]);
    const result = computeAssignmentWarning(baseInput({ assigneeEntriesByDate: entries }));
    expect(result.longTerm).toBeNull();
    expect(result.shortTermOccurrenceCount).toBe(1);
  });

  it("counts both long-term and short-term overlaps in the same window", () => {
    const entries = new Map([
      ["2026-04-13", "parental_leave"],
      ["2026-04-20", "parental_leave"],
      ["2026-04-27", "sick"],
    ]);
    const result = computeAssignmentWarning(baseInput({ assigneeEntriesByDate: entries }));
    expect(result.longTerm?.occurrenceCount).toBe(2);
    expect(result.shortTermOccurrenceCount).toBe(1);
  });

  it("only counts company instances for companies matching the task's scope", () => {
    const dimensionValueToDimension = new Map([["norway", "country"]]);
    const companies = [
      { id: "acme", dimensionValues: new Map([["country", "norway"]]) },
      { id: "nordkyst", dimensionValues: new Map([["country", "sweden"]]) },
    ];
    const entries = new Map([["2026-04-13", "parental_leave"]]);
    const result = computeAssignmentWarning(
      baseInput({
        assigneeEntriesByDate: entries,
        scope: ["norway"],
        companies,
        dimensionValueToDimension,
      }),
    );
    expect(result.longTerm).toEqual({
      rangeStart: "2026-04-13",
      rangeEnd: "2026-04-13",
      occurrenceCount: 1,
      companyInstanceCount: 1, // only Acme (Norway) matches
    });
  });

  it("ignores an out-of-office run below the long-absence threshold", () => {
    const entries = new Map([
      ["2026-04-13", "out_of_office"],
      ["2026-04-20", "out_of_office"],
    ]);
    const result = computeAssignmentWarning(baseInput({ assigneeEntriesByDate: entries }));
    expect(result.longTerm).toBeNull();
    expect(result.shortTermOccurrenceCount).toBe(2);
  });
});
