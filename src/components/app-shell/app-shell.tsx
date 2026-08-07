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
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:block">
        <div className="border-b p-4 text-lg font-semibold">TaskDeck</div>
        <Sidebar isAdmin={isAdmin} pendingRequestsCount={pendingRequestsCount} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {demoMode && (
          <div className="border-b border-amber-300 bg-amber-50 px-4 py-1.5 text-center text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Demo environment — data resets nightly.
          </div>
        )}
        <header className="flex items-center gap-4 border-b px-4 py-3 md:px-6">
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
