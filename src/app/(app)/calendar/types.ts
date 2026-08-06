import type { Tables } from "@/lib/supabase/database.types";

export type CalendarEntryStatus = Tables<"calendar_entries">["status"];

export interface CalendarMember {
  id: string;
  name: string;
  teamId: string | null;
  teamName: string | null;
}

export interface CalendarTeam {
  id: string;
  name: string;
}

/** date -> status, for one member. */
export type CalendarEntriesByDate = Record<string, CalendarEntryStatus>;
