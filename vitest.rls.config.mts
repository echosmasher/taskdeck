import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Separate from vitest.config.mts (task 24): these are integration
 * tests that hit a live local Supabase instance (same precondition as
 * `pnpm seed`), not fast/hermetic unit tests, so they're excluded from
 * `pnpm test` / CI's default run and only run via `pnpm test:rls`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/rls/**/*.test.ts"],
    // RLS assertions issue real network round-trips to local Postgrest;
    // the default 5s can be tight on a cold Supabase container.
    testTimeout: 15000,
    // Specs share global, mutable state against the same local DB (the
    // app_settings singleton row, the fixture task/instance) — running
    // files in parallel would race on that shared state.
    fileParallelism: false,
  },
});
