import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_APP_TIMEZONE } from "@/lib/config";
import type { Tables } from "@/lib/supabase/database.types";

export type AppSettings = Tables<"app_settings">;

const FALLBACK_SETTINGS: AppSettings = {
  id: true,
  calendar_edit_permission: "members_own",
  long_absence_statuses: ["sick_leave", "parental_leave"],
  long_absence_min_days: 5,
  timezone: DEFAULT_APP_TIMEZONE,
  updated_by: null,
  updated_at: new Date(0).toISOString(),
};

/**
 * Memoized per request (React `cache`) so pages that need settings in
 * more than one place — e.g. the layout for calendar-permission gating
 * and the page for the timezone — don't issue duplicate queries.
 * Falls back to defaults if the row is somehow unreadable (e.g. no
 * session, or the singleton row was deleted outside the app) rather
 * than failing every page that reads "today".
 */
export const getAppSettings = cache(async (): Promise<AppSettings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("*").single();
  return data ?? FALLBACK_SETTINGS;
});

export async function getAppTimezone(): Promise<string> {
  return (await getAppSettings()).timezone;
}
