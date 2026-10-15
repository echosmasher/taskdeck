import { LoginForm } from "./login-form";
import { DemoLanding } from "./demo-landing";
import { LogoMark } from "@/components/app-shell/logo-mark";
import { FanOutPreview } from "./fan-out-preview";
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
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="flex items-center justify-center gap-2.5 text-2xl font-semibold tracking-tight">
            <LogoMark className="size-8" />
            TaskDeck
          </h1>
          <p className="text-balance text-sm text-muted-foreground">
            {demoMode
              ? "The same checklist across every company, client or branch you run, each one stamped with who completed it and when."
              : "Sign in to your account"}
          </p>
        </div>
        {demoMode && <FanOutPreview />}
        <div className="mx-auto w-full max-w-sm">{demoMode ? <DemoLanding /> : <LoginForm />}</div>
      </div>
    </main>
  );
}
