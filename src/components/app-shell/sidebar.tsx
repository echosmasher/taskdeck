"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo-mark";
import { NAV_ITEMS, type NavItem } from "./nav-items";

function NavLink({
  item,
  active,
  pendingRequestsCount,
}: {
  item: NavItem;
  active: boolean;
  pendingRequestsCount: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      title={item.label}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors xl:justify-start",
        "justify-center",
        active
          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="hidden min-w-0 flex-1 truncate xl:block">{item.label}</span>
      {item.href === "/requests" && pendingRequestsCount > 0 && (
        <Badge
          variant="destructive"
          className="hidden h-5 min-w-5 shrink-0 justify-center px-1 xl:flex"
        >
          {pendingRequestsCount}
        </Badge>
      )}
    </Link>
  );
}

export function Sidebar({
  isAdmin,
  pendingRequestsCount,
}: {
  isAdmin: boolean;
  pendingRequestsCount: number;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const mainItems = items.filter((item) => item.href !== "/settings");
  const settingsItem = items.find((item) => item.href === "/settings");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-center gap-2 border-b p-4 xl:justify-start">
        <LogoMark className="size-8 shrink-0" />
        <span className="hidden text-lg font-semibold tracking-tight xl:inline">TaskDeck</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2 xl:p-4">
        {mainItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={pathname === item.href}
            pendingRequestsCount={pendingRequestsCount}
          />
        ))}
      </nav>
      {settingsItem && (
        <nav className="border-t p-2 xl:p-4">
          <NavLink
            item={settingsItem}
            active={pathname === settingsItem.href}
            pendingRequestsCount={pendingRequestsCount}
          />
        </nav>
      )}
    </div>
  );
}
