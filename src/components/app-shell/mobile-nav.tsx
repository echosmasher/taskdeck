"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_ITEMS } from "./nav-items";

export function MobileNav({
  isAdmin,
  pendingRequestsCount,
}: {
  isAdmin: boolean;
  pendingRequestsCount: number;
}) {
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon" className="md:hidden" />}
        aria-label="Open navigation menu"
      >
        <Menu className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
              <span className="flex flex-1 items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">{item.label}</span>
                {item.href === "/requests" && pendingRequestsCount > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 justify-center px-1">
                    {pendingRequestsCount}
                  </Badge>
                )}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
