import type { ReactNode } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

export function AppShell({
  profile,
  pendingRequestsCount,
  demoMode,
  children,
}: {
  profile: Tables<"profiles">;
  pendingRequestsCount: number;
  demoMode: boolean;
  children: ReactNode;
}) {
  const isAdmin = profile.role === "admin" || profile.role === "master_admin";

  return (
    <div className="flex min-h-screen">
      {/*
        DESIGN.md's three-tier breakpoints: full 260px sidebar at desktop
        (xl, 1280px+), icon-only rail at tablet (md–xl, 768–1279px), and
        the MobileNav dropdown below md instead of this aside entirely.
      */}
      <aside className="hidden w-16 shrink-0 border-r bg-sidebar text-sidebar-foreground md:block xl:w-60">
        <Sidebar isAdmin={isAdmin} pendingRequestsCount={pendingRequestsCount} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {demoMode && (
          <div className="border-b border-primary/20 bg-primary/10 px-4 py-1.5 text-center text-xs font-medium text-primary">
            Demo environment. Data resets nightly.
          </div>
        )}
        <header className="flex items-center gap-4 border-b bg-card px-4 py-3 md:px-6">
          <MobileNav isAdmin={isAdmin} pendingRequestsCount={pendingRequestsCount} />
          <div className="ml-auto">
            <UserMenu profile={profile} />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
