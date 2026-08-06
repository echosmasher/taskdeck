"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { memberHasHistory } from "./history-guard";

export interface MemberActionState {
  error?: string;
}

function readTeamId(formData: FormData): string | null {
  const value = String(formData.get("team_id") ?? "");
  return value && value !== "none" ? value : null;
}

export async function createMemberAction(
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim() || null;
  const teamId = readTeamId(formData);

  if (!fullName) return { error: "Name is required." };
  if (!email) return { error: "Email is required." };

  const admin = createAdminClient();
  const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });
  if (inviteError || !data.user) {
    return { error: inviteError?.message ?? "Failed to invite member." };
  }

  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ position, team_id: teamId })
    .eq("id", data.user.id);
  if (profileError) return { error: profileError.message };

  revalidatePath("/teams");
  return {};
}

export async function updateMemberAction(
  profileId: string,
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim() || null;
  const teamId = readTeamId(formData);

  if (!fullName) return { error: "Name is required." };
  if (!email) return { error: "Email is required." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", profileId)
    .single();

  if (existing && existing.email !== email) {
    const admin = createAdminClient();
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(profileId, { email });
    if (authUpdateError) return { error: authUpdateError.message };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, email, position, team_id: teamId })
    .eq("id", profileId);
  if (error) return { error: error.message };

  revalidatePath("/teams");
  return {};
}

export async function setMemberArchivedAction(profileId: string, archived: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_archived: archived })
    .eq("id", profileId);
  if (error) return { error: error.message };

  revalidatePath("/teams");
  return {};
}

export async function deleteMemberAction(profileId: string): Promise<MemberActionState> {
  if (await memberHasHistory(profileId)) {
    return { error: "This member has task history and can't be deleted — archive them instead." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) return { error: error.message };

  revalidatePath("/teams");
  return {};
}

/**
 * Master-admin-only toggle between 'member' and 'admin' (§3 "grant/revoke
 * admin role"). The DB trigger (profiles_role_change_guard) is the real
 * authority here — this check exists to fail with a clear message instead
 * of a raw Postgres error, per "never rely on UI hiding alone."
 */
export async function setMemberRoleAction(
  profileId: string,
  role: "member" | "admin",
): Promise<MemberActionState> {
  const viewer = await getCurrentProfile();
  if (viewer?.role !== "master_admin") {
    return { error: "Only the master admin can change roles." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);
  if (error) return { error: error.message };

  revalidatePath("/teams");
  return {};
}
