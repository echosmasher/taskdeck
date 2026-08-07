import { LoginForm } from "./login-form";
import { DemoLanding } from "./demo-landing";
import { isDemoMode } from "@/lib/demo/is-demo-mode";

export default function LoginPage() {
  // Both credential pairs must actually be configured, not just the
  // flag — otherwise the "Explore as…" buttons would render and then
  // fail server-side on click.
  const demoMode =
    isDemoMode() &&
    !!process.env.DEMO_ADMIN_EMAIL &&
    !!process.env.DEMO_ADMIN_PASSWORD &&
    !!process.env.DEMO_MEMBER_EMAIL &&
    !!process.env.DEMO_MEMBER_PASSWORD;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">TaskDeck</h1>
          <p className="text-sm text-muted-foreground">
            {demoMode
              ? "A recurring-task tracker for finance shared-service teams."
              : "Sign in to your account"}
          </p>
        </div>
        {demoMode ? <DemoLanding /> : <LoginForm />}
      </div>
    </main>
  );
}
