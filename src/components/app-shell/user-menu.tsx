import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";
import type { Tables } from "@/lib/supabase/database.types";

export function UserMenu({ profile }: { profile: Tables<"profiles"> }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right text-sm">
        <p className="font-medium leading-none">{profile.full_name ?? profile.email}</p>
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
