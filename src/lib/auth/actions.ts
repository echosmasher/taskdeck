"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { bootstrapMasterAdminIfNeeded } from "./bootstrap-master-admin";

export interface SignInState {
  error?: string;
}

export async function signInAction(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Invalid email or password." };
  }

  await bootstrapMasterAdminIfNeeded(data.user.id, data.user.email ?? email);

  redirect("/");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
