import "server-only";
import { redirect } from "next/navigation";
import { getCurrentProfile, type CurrentProfile } from "./get-current-profile";

/** Any signed-in user. Defense in depth alongside middleware's redirect. */
export async function requireProfile(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

/**
 * Server-side enforcement for admin-only pages — never rely on hiding nav
 * items alone (spec §3). Members hitting an admin URL directly are bounced
 * to the dashboard before any admin markup renders.
 */
export async function requireAdminProfile(): Promise<CurrentProfile> {
  const profile = await requireProfile();
  if (profile.role !== "admin" && profile.role !== "master_admin") {
    redirect("/");
  }
  return profile;
}
