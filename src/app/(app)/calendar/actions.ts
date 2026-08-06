"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEntryStatus } from "./types";

export interface CalendarActionState {
  error?: string;
}

/**
 * RLS (calendar_entries_write) restricts this to admin/master_admin —
 * upsert on the (profile_id, date) unique constraint handles both
 * setting a fresh day and changing an already-set one in one call.
 */
export async function setCalendarEntryAction(
  profileId: string,
  date: string,
  status: CalendarEntryStatus,
): Promise<CalendarActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("calendar_entries")
    .upsert({ profile_id: profileId, date, status }, { onConflict: "profile_id,date" });

  if (error) return { error: error.message };
  revalidatePath("/calendar");
  return {};
}

export async function clearCalendarEntryAction(
  profileId: string,
  date: string,
): Promise<CalendarActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("calendar_entries")
    .delete()
    .eq("profile_id", profileId)
    .eq("date", date);

  if (error) return { error: error.message };
  revalidatePath("/calendar");
  return {};
}
