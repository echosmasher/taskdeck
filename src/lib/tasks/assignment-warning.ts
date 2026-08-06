/**
 * Assignment-time absence warning (addendum §15.3.2): checks a
 * candidate person assignee's calendar against a task's next ~60 days
 * of occurrences. Non-blocking by design — this only ever informs, the
 * caller decides whether to still let the save proceed (always yes).
 */
import { fromISODate, toISODate } from "../dates";
import type { AbsenceClassifyOptions } from "../absence";
import { classifyAbsence } from "../absence";
import { companyMatchesScope } from "./scope-match";
import { dueDateForOccurrence, occurrencesInWindow } from "./occurrences";
import type { DeadlineRule, Recurrence } from "./recurrence-types";

export interface AssignmentWarningCompany {
  id: string;
  dimensionValues: ReadonlyMap<string, string>;
}

export interface AssignmentWarningInput {
  recurrence: Recurrence;
  deadlineRule: DeadlineRule;
  scope: readonly string[];
  assigneeEntriesByDate: ReadonlyMap<string, string>;
  companies: readonly AssignmentWarningCompany[];
  dimensionValueToDimension: ReadonlyMap<string, string>;
  /** Per-country holidays, for recurrence/deadline-rule calculation — same shape generate-instances.ts uses. */
  holidaysByCountry: ReadonlyMap<string, ReadonlySet<string>>;
  classifyOptions: AbsenceClassifyOptions;
  todayISO: string;
  windowDays?: number;
}

export interface AssignmentWarningResult {
  longTerm: {
    rangeStart: string;
    rangeEnd: string;
    occurrenceCount: number;
    companyInstanceCount: number;
  } | null;
  shortTermOccurrenceCount: number;
}

const DEFAULT_WINDOW_DAYS = 60;

export function computeAssignmentWarning(input: AssignmentWarningInput): AssignmentWarningResult {
  const windowDays = input.windowDays ?? DEFAULT_WINDOW_DAYS;
  const windowStart = fromISODate(input.todayISO);
  const windowEnd = new Date(
    Date.UTC(
      windowStart.getUTCFullYear(),
      windowStart.getUTCMonth(),
      windowStart.getUTCDate() + windowDays,
    ),
  );

  const countryHolidays =
    (input.recurrence.type === "monthly_nth_working_day" &&
      input.holidaysByCountry.get(input.recurrence.countryCode)) ||
    new Set<string>();

  let occurrences: Date[];
  try {
    occurrences = occurrencesInWindow(input.recurrence, windowStart, windowEnd, countryHolidays);
  } catch {
    return { longTerm: null, shortTermOccurrenceCount: 0 };
  }

  const matchingCompanies = input.companies.filter((c) =>
    companyMatchesScope(input.scope, c.dimensionValues, input.dimensionValueToDimension),
  );

  const longTermDueDates: string[] = [];
  let shortTermOccurrenceCount = 0;

  for (const occurrence of occurrences) {
    const dueDate = toISODate(
      dueDateForOccurrence(occurrence, input.deadlineRule, input.holidaysByCountry),
    );
    const classification = classifyAbsence(
      dueDate,
      input.assigneeEntriesByDate,
      input.classifyOptions,
    );
    if (classification === "long_term") longTermDueDates.push(dueDate);
    else if (classification === "short_term") shortTermOccurrenceCount++;
  }

  if (longTermDueDates.length === 0) {
    return { longTerm: null, shortTermOccurrenceCount };
  }

  longTermDueDates.sort();
  return {
    longTerm: {
      rangeStart: longTermDueDates[0],
      rangeEnd: longTermDueDates[longTermDueDates.length - 1],
      occurrenceCount: longTermDueDates.length,
      companyInstanceCount: longTermDueDates.length * matchingCompanies.length,
    },
    shortTermOccurrenceCount,
  };
}
