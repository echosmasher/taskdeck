/**
 * Absence classification for a member's calendar (addendum §15.3.1).
 * Kept dependency-free from the DB layer, same as lib/dates.ts, so it's
 * plain, fast, and easy to unit test — callers pass in whatever slice
 * of calendar_entries and app_settings they already have.
 */
import { addDays, fromISODate, isWorkingDay } from "./dates";

/** Mirrors the calendar_entry_status DB enum, redeclared locally to avoid a dependency on generated Supabase types. */
export type CalendarStatus =
  | "in_office"
  | "remote"
  | "out_of_office"
  | "sick"
  | "sick_leave"
  | "parental_leave"
  | "business_travel";

export type AbsenceClassification = "present" | "short_term" | "long_term";

export interface AbsenceClassifyOptions {
  /** Statuses that are always long-term, regardless of run length (app_settings.long_absence_statuses). */
  longAbsenceStatuses: readonly string[];
  /** Consecutive-working-day threshold at which an out_of_office run becomes long-term (app_settings.long_absence_min_days). */
  longAbsenceMinDays: number;
  holidays: ReadonlySet<string>;
}

/** Safety cap on how many days a run walk will scan in one direction — no realistic run is anywhere near this long. */
const MAX_RUN_WALK_DAYS = 1000;

/**
 * Length of the unbroken run of out_of_office **working days** that
 * contains `date` (which must itself be out_of_office). Weekends and
 * holidays inside the run don't count toward the length, but they also
 * don't break it — the run only breaks on a working day that isn't
 * out_of_office (or has no entry).
 */
function outOfOfficeRunLength(
  date: string,
  entriesByDate: ReadonlyMap<string, string>,
  holidays: ReadonlySet<string>,
): number {
  function scan(step: 1 | -1, includeStart: boolean): number {
    let count = 0;
    let cursor = includeStart ? date : addDays(date, step);
    for (let i = 0; i < MAX_RUN_WALK_DAYS; i++) {
      if (!isWorkingDay(fromISODate(cursor), holidays)) {
        cursor = addDays(cursor, step);
        continue;
      }
      if (entriesByDate.get(cursor) !== "out_of_office") break;
      count++;
      cursor = addDays(cursor, step);
    }
    return count;
  }

  return scan(-1, true) + scan(1, false);
}

/**
 * Classifies a member's absence on `date` from their sparse
 * date -> status map (a missing entry means present — remote is
 * explicitly not an absence either).
 */
export function classifyAbsence(
  date: string,
  entriesByDate: ReadonlyMap<string, string>,
  options: AbsenceClassifyOptions,
): AbsenceClassification {
  const status = entriesByDate.get(date);

  if (!status || status === "in_office" || status === "remote") return "present";
  if (options.longAbsenceStatuses.includes(status)) return "long_term";

  if (status === "out_of_office") {
    const runLength = outOfOfficeRunLength(date, entriesByDate, options.holidays);
    return runLength >= options.longAbsenceMinDays ? "long_term" : "short_term";
  }

  return "short_term";
}

/**
 * The first working day after `date` that is no longer classified
 * long-term absent — an "expected return date" derived purely from
 * the entries actually on the calendar (there's no separate "leave
 * ends on X" field). Reuses classifyAbsence itself so it stays exactly
 * consistent with it: both the custom-status and out_of_office-run
 * paths are handled the same way, one candidate day at a time.
 */
export function findExpectedReturnDate(
  date: string,
  entriesByDate: ReadonlyMap<string, string>,
  options: AbsenceClassifyOptions,
): string {
  let cursor = addDays(date, 1);
  for (let i = 0; i < MAX_RUN_WALK_DAYS; i++) {
    if (!isWorkingDay(fromISODate(cursor), options.holidays)) {
      cursor = addDays(cursor, 1);
      continue;
    }
    if (classifyAbsence(cursor, entriesByDate, options) !== "long_term") return cursor;
    cursor = addDays(cursor, 1);
  }
  return cursor;
}
