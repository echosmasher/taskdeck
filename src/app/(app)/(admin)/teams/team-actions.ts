"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { teamHasHistory } from "./history-guard";

export interface TeamActionState {
  error?: string;
}

export async function createTeamAction(
  _prevState: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Team name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({ name });
  if (error) return { error: error.message };

  revalidatePath("/teams");
  return {};
}

export async function updateTeamAction(
  teamId: string,
  _prevState: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Team name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("teams").update({ name }).eq("id", teamId);
  if (error) return { error: error.message };

  revalidatePath("/teams");
  return {};
}

export async function setTeamArchivedAction(teamId: string, archived: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("teams").update({ is_archived: archived }).eq("id", teamId);
  if (error) return { error: error.message };

  revalidatePath("/teams");
  return {};
}

export async function deleteTeamAction(teamId: string): Promise<TeamActionState> {
  if (await teamHasHistory(teamId)) {
    return { error: "This team has task history and can't be deleted — archive it instead." };
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);
  if (count && count > 0) {
    return { error: "This team still has members — reassign them before deleting." };
  }

  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) return { error: error.message };

  revalidatePath("/teams");
  return {};
}
