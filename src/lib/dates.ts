/**
 * All recurrence/working-day/overdue date logic lives here (spec §8).
 *
 * Calendar-date functions (working days, clamping, weekly occurrences)
 * operate on Date objects built with Date.UTC and read back with the
 * getUTC* accessors. This isn't about time zones — a calendar date like
 * "5 April 2026" has the same weekday everywhere on Earth — it's to
 * avoid `new Date(y, m, d)`, which uses the *server's* local time zone
 * and silently breaks when the server isn't in Europe/Oslo (Vercel
 * functions run in UTC). Only getTodayInTimezone needs a real
 * timezone-aware instant-to-calendar-date conversion, since "what day is
 * it right now" genuinely depends on where "now" is being observed from.
 */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // JS convention: 0 = Sunday

export function toISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function daysInMonth(year: number, month: number): number {
  // Date.UTC(year, month, 0) is the day before the 1st of `month`
  // (1-indexed), i.e. the last day of the *previous* index — which,
  // since month here is already 1-indexed going in, lands on the last
  // day of `month` itself.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isWorkingDay(date: Date, holidays: ReadonlySet<string>): boolean {
  const weekday = date.getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return !holidays.has(toISODate(date));
}

/**
 * The Nth working day of a month, or the |N|th-from-the-end when N is
 * negative (-1 = last working day of the month). N must not be 0.
 * Throws if the month doesn't have N working days.
 */
export function nthWorkingDayOfMonth(
  year: number,
  month: number,
  n: number,
  holidays: ReadonlySet<string>,
): Date {
  if (n === 0) throw new Error("nthWorkingDayOfMonth: n must not be 0");

  const total = daysInMonth(year, month);
  const workingDays: Date[] = [];
  for (let day = 1; day <= total; day++) {
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (isWorkingDay(candidate, holidays)) workingDays.push(candidate);
  }

  const index = n > 0 ? n - 1 : workingDays.length + n;
  const result = workingDays[index];
  if (!result) {
    throw new Error(
      `nthWorkingDayOfMonth: ${year}-${month} has only ${workingDays.length} working day(s), requested n=${n}`,
    );
  }
  return result;
}

/** Day-of-month 1-31, clamped to the last real day of a shorter month. */
export function clampDayOfMonth(year: number, month: number, day: number): Date {
  const clamped = Math.min(day, daysInMonth(year, month));
  return new Date(Date.UTC(year, month - 1, clamped));
}

/** All dates matching `weekday` within [rangeStart, rangeEnd], inclusive. */
export function weeklyOccurrencesInRange(weekday: Weekday, rangeStart: Date, rangeEnd: Date): Date[] {
  const results: Date[] = [];
  const offset = (weekday - rangeStart.getUTCDay() + 7) % 7;
  const cursor = new Date(Date.UTC(
    rangeStart.getUTCFullYear(),
    rangeStart.getUTCMonth(),
    rangeStart.getUTCDate() + offset,
  ));

  while (cursor.getTime() <= rangeEnd.getTime()) {
    results.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return results;
}

export function addDays(dateISO: string, days: number): string {
  const d = fromISODate(dateISO);
  return toISODate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days)));
}

/** Adds calendar months, clamping the day-of-month to the target month's length. */
export function addMonths(dateISO: string, months: number): string {
  const d = fromISODate(dateISO);
  const targetIndex = d.getUTCMonth() + months;
  const year = d.getUTCFullYear() + Math.floor(targetIndex / 12);
  const month = ((targetIndex % 12) + 12) % 12; // 0-indexed
  const day = Math.min(d.getUTCDate(), daysInMonth(year, month + 1));
  return toISODate(new Date(Date.UTC(year, month, day)));
}

/** Every date from `startISO` to `endISO`, inclusive. */
export function datesInRange(startISO: string, endISO: string): string[] {
  const dates: string[] = [];
  for (let d = fromISODate(startISO); toISODate(d) <= endISO; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(toISODate(d));
  }
  return dates;
}

/** "Today" as YYYY-MM-DD in the given IANA timezone (default: `now`). */
export function getTodayInTimezone(timezone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** The Monday–Sunday week containing `dateISO`, as an inclusive ISO range. */
export function weekRange(dateISO: string): { start: string; end: string } {
  const date = fromISODate(dateISO);
  const weekday = date.getUTCDay(); // 0 = Sunday
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + mondayOffset),
  );
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6));
  return { start: toISODate(start), end: toISODate(end) };
}

/** The calendar month containing `dateISO`, as an inclusive ISO range. */
export function monthRange(dateISO: string): { start: string; end: string } {
  const date = fromISODate(dateISO);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month - 1, daysInMonth(year, month)));
  return { start: toISODate(start), end: toISODate(end) };
}

export type DashboardPeriod = "today" | "week" | "month";

/** Due-date range for the dashboard's Today/This week/This month toggle (§7.1). */
export function periodRange(period: DashboardPeriod, todayISO: string): { start: string; end: string } {
  if (period === "today") return { start: todayISO, end: todayISO };
  if (period === "week") return weekRange(todayISO);
  return monthRange(todayISO);
}

/** Pure date comparison — both args are YYYY-MM-DD strings. */
export function isOverdue(dueDateISO: string, todayISO: string): boolean {
  return dueDateISO < todayISO;
}

/** The full instance-level rule from §6: open AND due_date < today. */
export function isOverdueInstance(
  instance: { dueDate: string; status: string },
  todayISO: string,
): boolean {
  return instance.status === "open" && isOverdue(instance.dueDate, todayISO);
}

/** "Thursday 15 October 2026", for tooltips next to relative due labels. */
export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fromISODate(iso));
}
