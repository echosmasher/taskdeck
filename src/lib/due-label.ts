import { fromISODate } from "./dates";

const DAY_MS = 86_400_000;

function dayDiff(dueISO: string, todayISO: string): number {
  return Math.round((fromISODate(dueISO).getTime() - fromISODate(todayISO).getTime()) / DAY_MS);
}

/** "3 days overdue", "Due today", "Tomorrow", "Fri 16 Oct". Exact date goes in `title`. */
export function dueLabel(dueISO: string, todayISO: string): string {
  const diff = dayDiff(dueISO, todayISO);
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff === -1) return "1 day overdue";
  if (diff < 0) return `${-diff} days overdue`;
  return `Due ${formatShortDate(dueISO)}`;
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(
    fromISODate(iso),
  );
}

/** "OL" from "Oskar Lund"; first and last word only. */
export function initialsOf(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** "15.10" for a stamp's date column. */
export function stampDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "09.10" for a YYYY-MM-DD due date, shown in mono beside the relative label. */
export function dueDDMM(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
}
