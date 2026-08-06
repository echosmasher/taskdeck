import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth/require-profile";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  return <AppShell profile={profile}>{children}</AppShell>;
}
