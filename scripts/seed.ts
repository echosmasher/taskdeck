/**
 * CLI entry point for the idempotent demo-data seed (spec §9, addendum
 * §15.5). Run with `pnpm seed` (loads .env.local automatically via
 * --env-file). The actual seeding logic lives in
 * src/lib/demo/seed-demo-data.ts so it can also be called from the
 * nightly reset job / admin "reset demo data" action (task 22) without
 * going through a CLI process.
 */
import { seedDemoData } from "../src/lib/demo/seed-demo-data";

seedDemoData().catch((err) => {
  console.error(err);
  process.exit(1);
});
