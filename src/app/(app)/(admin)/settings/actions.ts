"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isDemoMode } from "@/lib/demo/is-demo-mode";
import { seedDemoData } from "@/lib/demo/seed-demo-data";
import type { Database } from "@/lib/supabase/database.types";

export interface SettingsActionState {
  error?: string;
}

type CalendarEditPermission = Database["public"]["Enums"]["calendar_edit_permission"];

const CALENDAR_EDIT_PERMISSIONS: CalendarEditPermission[] = [
  "admins_only",
  "members_own",
  "members_all",
];

export async function updateAppSettingsAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const calendarEditPermission = String(formData.get("calendar_edit_permission") ?? "");
  if (!CALENDAR_EDIT_PERMISSIONS.includes(calendarEditPermission as CalendarEditPermission)) {
    return { error: "Invalid calendar edit permission." };
  }

  const longAbsenceStatuses = formData.getAll("long_absence_statuses").map(String);

  const minDaysRaw = String(formData.get("long_absence_min_days") ?? "");
  const longAbsenceMinDays = Number(minDaysRaw);
  if (!Number.isInteger(longAbsenceMinDays) || longAbsenceMinDays < 1) {
    return { error: "Minimum absence days must be a whole number of 1 or more." };
  }

  const timezone = String(formData.get("timezone") ?? "").trim();
  if (!timezone) return { error: "Timezone is required." };
  try {
    // Throws RangeError for anything that isn't a valid IANA zone name.
    new Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    return { error: `"${timezone}" isn't a recognized timezone.` };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      calendar_edit_permission: calendarEditPermission as CalendarEditPermission,
      long_absence_statuses: longAbsenceStatuses,
      long_absence_min_days: longAbsenceMinDays,
      timezone,
    })
    .eq("id", true);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export interface ResetDemoDataState {
  error?: string;
}

/**
 * Manual counterpart to the nightly /api/reset-demo cron (task 22) —
 * wipes and rebuilds the demo dataset on demand. Gated on DEMO_MODE in
 * addition to the admin-role check the settings-form component
 * already relies on being hidden behind, since this bypasses RLS via
 * the service-role client and would be catastrophic against a real
 * dataset.
 */
export async function resetDemoDataAction(): Promise<ResetDemoDataState> {
  if (!isDemoMode()) {
    return { error: "Demo mode is not enabled on this deployment." };
  }

  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "master_admin")) {
    return { error: "Unauthorized." };
  }

  await seedDemoData();

  revalidatePath("/", "layout");
  return {};
}
