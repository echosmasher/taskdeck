import { exploreAsAdminAction, exploreAsMemberAction } from "@/lib/auth/demo-actions";
import { Button } from "@/components/ui/button";
import { LoginForm } from "./login-form";

/**
 * Portfolio-critical landing (spec §9): a recruiter should be able to
 * explore the app in under 30 seconds with zero signup. Both buttons
 * are plain forms posting to a server action — no client JS required
 * to sign in, only to get here.
 */
export function DemoLanding() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <form action={exploreAsAdminAction}>
          <Button type="submit" className="h-9 w-full">
            Explore as Admin
          </Button>
        </form>
        <form action={exploreAsMemberAction}>
          <Button type="submit" variant="outline" className="h-9 w-full border-primary text-primary hover:bg-primary/5 hover:text-primary">
            Explore as Member
          </Button>
        </form>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Demo environment. Data resets nightly.
      </p>
      <details className="group text-sm">
        <summary className="cursor-pointer text-center text-muted-foreground select-none">
          Sign in with an account instead
        </summary>
        <div className="mt-4">
          <LoginForm />
        </div>
      </details>
    </div>
  );
}
