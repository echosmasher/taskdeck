"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

export function Sidebar({
  isAdmin,
  pendingRequestsCount,
}: {
  isAdmin: boolean;
  pendingRequestsCount: number;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="flex flex-col gap-1 p-4">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
            )}
          >
            {item.label}
            {item.href === "/requests" && pendingRequestsCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 justify-center px-1">
                {pendingRequestsCount}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
