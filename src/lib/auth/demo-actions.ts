"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/is-demo-mode";

/**
 * Backs the "Explore as Admin" / "Explore as Member" buttons (spec
 * §9) — signs into one of the two fixed-credential demo accounts
 * server-side, so the raw password never reaches the browser. Both
 * accounts already have their role/profile set by the seed script, so
 * unlike the manual sign-in path this doesn't need
 * bootstrapMasterAdminIfNeeded.
 *
 * The isDemoMode()/credential checks here are defense in depth — the
 * login page only renders these buttons under the same conditions —
 * in case this action is ever reached another way.
 */
async function signInAsDemoUser(email: string | undefined, password: string | undefined) {
  if (!isDemoMode() || !email || !password) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect("/login");
  }

  redirect("/");
}

export async function exploreAsAdminAction() {
  await signInAsDemoUser(process.env.DEMO_ADMIN_EMAIL, process.env.DEMO_ADMIN_PASSWORD);
}

export async function exploreAsMemberAction() {
  await signInAsDemoUser(process.env.DEMO_MEMBER_EMAIL, process.env.DEMO_MEMBER_PASSWORD);
}
