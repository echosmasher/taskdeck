import type { Database, Tables } from "@/lib/supabase/database.types";

export type CalendarEntryStatus = Tables<"calendar_entries">["status"];
export type CalendarEditPermission = Database["public"]["Enums"]["calendar_edit_permission"];

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

export interface CalendarEntry {
  profileId: string;
  date: string;
  status: CalendarEntryStatus;
  setByProfileId: string | null;
  setByName: string | null;
  setAt: string | null;
}

/** date -> entry, for one member. */
export type CalendarEntriesByDate = Record<string, CalendarEntry>;
