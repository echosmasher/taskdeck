import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { MembersSection } from "./members-section";
import { TeamsSection } from "./teams-section";
import type { MemberRow, TeamWithCount } from "./types";

export default async function TeamsPage() {
  const supabase = await createClient();

  const [teamsRes, profilesRes, viewer] = await Promise.all([
    supabase.from("teams").select("*").order("name"),
    supabase.from("profiles").select("*").order("full_name"),
    getCurrentProfile(),
  ]);

  const teams = teamsRes.data ?? [];
  const profiles = profilesRes.data ?? [];

  const teamsWithCount: TeamWithCount[] = teams.map((team) => ({
    ...team,
    memberCount: profiles.filter((p) => p.team_id === team.id && !p.is_archived).length,
  }));

  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));
  const members: MemberRow[] = profiles.map((profile) => ({
    ...profile,
    teamName: profile.team_id ? (teamNameById.get(profile.team_id) ?? null) : null,
  }));

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold">Teams & members</h1>
        <p className="text-muted-foreground">
          Manage teams and the people assigned to them.
          {viewer?.role === "master_admin" && " As master admin, you can also grant or revoke admin access."}
        </p>
      </div>
      <TeamsSection teams={teamsWithCount} />
      <MembersSection
        members={members}
        teams={teams.filter((t) => !t.is_archived)}
        isMasterAdmin={viewer?.role === "master_admin"}
      />
    </div>
  );
}
