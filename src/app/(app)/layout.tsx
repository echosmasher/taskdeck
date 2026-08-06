import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin" || profile.role === "master_admin";

  let pendingRequestsCount = 0;
  if (isAdmin) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("reassignment_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pendingRequestsCount = count ?? 0;
  }

  return (
    <AppShell profile={profile} pendingRequestsCount={pendingRequestsCount}>
      {children}
    </AppShell>
  );
}
