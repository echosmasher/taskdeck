import "server-only";

/**
 * Gates every demo-only surface (spec §9): the landing-page "Explore
 * as…" buttons, the "Demo environment" banner, the nightly reset cron,
 * and the admin "reset demo data" action. Off by default — a real
 * deployment must opt in explicitly, since `reset_demo_data()` wipes
 * every company/task/instance in the database and this flag is the
 * only thing standing between a real production dataset and that RPC.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}
