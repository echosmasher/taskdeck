import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";
import type { Tables } from "@/lib/supabase/database.types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

export function UserMenu({ profile }: { profile: Tables<"profiles"> }) {
  const displayName = profile.full_name ?? profile.email;

  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarFallback className="bg-sidebar-accent text-sm font-medium text-sidebar-accent-foreground">
          {initials(displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="hidden text-right text-sm sm:block">
        <p className="font-medium leading-none">{displayName}</p>
        <Badge variant="outline" className="mt-1 capitalize">
          {profile.role.replace("_", " ")}
        </Badge>
      </div>
      <form action={signOutAction}>
        <Button type="submit" variant="ghost" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
