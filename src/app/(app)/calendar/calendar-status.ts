import type { CalendarEntryStatus } from "./types";

export const CALENDAR_STATUSES: { value: CalendarEntryStatus; label: string; className: string }[] = [
  { value: "in_office", label: "In office", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "remote", label: "Remote", className: "bg-sky-100 text-sky-800 border-sky-200" },
  { value: "out_of_office", label: "Out of office", className: "bg-slate-200 text-slate-700 border-slate-300" },
  { value: "sick", label: "Sick", className: "bg-red-100 text-red-800 border-red-200" },
  { value: "sick_leave", label: "Sick leave", className: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "parental_leave", label: "Parental leave", className: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "business_travel", label: "Business travel", className: "bg-amber-100 text-amber-800 border-amber-200" },
];

export function statusLabel(status: CalendarEntryStatus): string {
  return CALENDAR_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function statusClassName(status: CalendarEntryStatus): string {
  return CALENDAR_STATUSES.find((s) => s.value === status)?.className ?? "";
}
