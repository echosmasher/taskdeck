import type { Tables } from "@/lib/supabase/database.types";

export type Team = Tables<"teams">;
export type Profile = Tables<"profiles">;

export interface TeamWithCount extends Team {
  memberCount: number;
}

export interface MemberRow extends Profile {
  teamName: string | null;
}
