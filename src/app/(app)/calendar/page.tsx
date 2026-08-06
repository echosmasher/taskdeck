import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/app-settings";
import { getTodayInTimezone } from "@/lib/dates";
import { CalendarView } from "./calendar-view";
import type { CalendarEntry, CalendarMember, CalendarTeam } from "./types";

export default async function CalendarPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const settings = await getAppSettings();

  const [profilesRes, teamsRes, entriesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, team_id")
      .eq("is_archived", false)
      .order("full_name"),
    supabase.from("teams").select("id, name").eq("is_archived", false).order("name"),
    supabase
      .from("calendar_entries")
      .select("profile_id, date, status, set_by_profile_id, set_at"),
  ]);

  const teamNameById = new Map((teamsRes.data ?? []).map((t) => [t.id, t.name]));
  const profileNameById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p.full_name ?? p.email]),
  );

  const members: CalendarMember[] = (profilesRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.full_name ?? p.email,
    teamId: p.team_id,
    teamName: p.team_id ? (teamNameById.get(p.team_id) ?? null) : null,
  }));

  const teams: CalendarTeam[] = (teamsRes.data ?? []).map((t) => ({ id: t.id, name: t.name }));
  const isAdmin = profile.role === "admin" || profile.role === "master_admin";
  const todayISO = getTodayInTimezone(settings.timezone);

  const entries: CalendarEntry[] = (entriesRes.data ?? []).map((e) => ({
    profileId: e.profile_id,
    date: e.date,
    status: e.status,
    setByProfileId: e.set_by_profile_id,
    setByName: e.set_by_profile_id ? (profileNameById.get(e.set_by_profile_id) ?? null) : null,
    setAt: e.set_at,
  }));

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Office calendar</h1>
      </div>
      <CalendarView
        currentProfileId={profile.id}
        isAdmin={isAdmin}
        calendarEditPermission={settings.calendar_edit_permission}
        todayISO={todayISO}
        members={members}
        teams={teams}
        entries={entries}
      />
    </div>
  );
}
