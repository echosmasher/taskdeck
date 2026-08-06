import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { APP_TIMEZONE } from "@/lib/config";
import { getTodayInTimezone } from "@/lib/dates";
import { CalendarView } from "./calendar-view";
import type { CalendarMember, CalendarTeam } from "./types";

export default async function CalendarPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [profilesRes, teamsRes, entriesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, team_id")
      .eq("is_archived", false)
      .order("full_name"),
    supabase.from("teams").select("id, name").eq("is_archived", false).order("name"),
    supabase.from("calendar_entries").select("profile_id, date, status"),
  ]);

  const teamNameById = new Map((teamsRes.data ?? []).map((t) => [t.id, t.name]));

  const members: CalendarMember[] = (profilesRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.full_name ?? p.email,
    teamId: p.team_id,
    teamName: p.team_id ? (teamNameById.get(p.team_id) ?? null) : null,
  }));

  const teams: CalendarTeam[] = (teamsRes.data ?? []).map((t) => ({ id: t.id, name: t.name }));
  const isAdmin = profile.role === "admin" || profile.role === "master_admin";

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Office calendar</h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? "Click a cell to set a member's status for that day."
            : "Member availability — view only."}
        </p>
      </div>
      <CalendarView
        currentProfileId={profile.id}
        isAdmin={isAdmin}
        todayISO={getTodayInTimezone(APP_TIMEZONE)}
        members={members}
        teams={teams}
        entries={entriesRes.data ?? []}
      />
    </div>
  );
}
