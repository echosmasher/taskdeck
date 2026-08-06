import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Promotes the just-created profile to master_admin if its email matches
 * SEED_MASTER_ADMIN_EMAIL and no master_admin exists yet (spec §12 —
 * "on first login with that email"). Safe to call on every login: the
 * `profiles_role_change_guard` trigger makes the promotion a no-op once a
 * master_admin already exists, so this never re-promotes after a demotion.
 *
 * Uses the service-role client because, at this exact moment, the caller
 * has no session with a master_admin role to authorize the change under
 * RLS — that's the chicken-and-egg problem this bootstrap solves once.
 */
export async function bootstrapMasterAdminIfNeeded(profileId: string, email: string) {
  const seedEmail = process.env.SEED_MASTER_ADMIN_EMAIL;
  if (!seedEmail || email.toLowerCase() !== seedEmail.toLowerCase()) return;

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ role: "master_admin" })
    .eq("id", profileId)
    .eq("role", "member");
}
