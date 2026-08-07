/**
 * Runs once before the whole E2E suite (task 24). Seeds the local demo
 * dataset via the exact same seedDemoData() the nightly reset job and
 * `pnpm seed` use, so every run starts from the same known state, then
 * gives one already-seeded member (Nora, per src/lib/demo/seed-data.ts)
 * a fixed password so a spec can sign into her account manually (via
 * the existing LoginForm, not a new UI surface) to play the "new
 * assignee" role in the request -> approve -> override flow.
 *
 * Relative imports on purpose — Playwright's config/globalSetup loader
 * isn't guaranteed to resolve the `@/` tsconfig path alias the app code
 * uses everywhere else. Doesn't import lib/demo/is-demo-mode.ts either:
 * that file has `import "server-only"`, which is correct for its real
 * (Next.js server-context) callers but throws under plain Node — same
 * reason seed-demo-data.ts itself avoids that import (see its own
 * doc comment).
 */
import { createAdminClient } from "../../src/lib/supabase/admin";
import { seedDemoData } from "../../src/lib/demo/seed-demo-data";

export const E2E_COVERING_MEMBER_EMAIL = "nora@taskdeck.local";
export const E2E_COVERING_MEMBER_PASSWORD = "e2e-test-password-not-for-production";

export default async function globalSetup() {
  if (process.env.DEMO_MODE !== "true") {
    throw new Error(
      "E2E tests require DEMO_MODE=true (they sign in via the demo landing page's " +
        "Explore as Admin/Member buttons) — set it in .env.local.",
    );
  }

  await seedDemoData();

  const admin = createAdminClient();
  const { data: users, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);

  const nora = users.users.find((u) => u.email === E2E_COVERING_MEMBER_EMAIL);
  if (!nora) throw new Error(`Expected seeded user ${E2E_COVERING_MEMBER_EMAIL} not found.`);

  const { error: pwError } = await admin.auth.admin.updateUserById(nora.id, {
    password: E2E_COVERING_MEMBER_PASSWORD,
  });
  if (pwError) throw new Error(`updateUserById(${E2E_COVERING_MEMBER_EMAIL}): ${pwError.message}`);
}
