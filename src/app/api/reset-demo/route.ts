import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isDemoMode } from "@/lib/demo/is-demo-mode";
import { seedDemoData } from "@/lib/demo/seed-demo-data";

/**
 * Nightly demo reset (spec §9). Two authorized callers, same shape as
 * /api/generate-instances:
 *  - Vercel Cron (GET, `Authorization: Bearer ${CRON_SECRET}`, see
 *    vercel.json).
 *  - An admin/master_admin session (POST), for the "Reset demo data"
 *    button on the Settings page.
 *
 * Gated on DEMO_MODE regardless of caller: reset_demo_data() deletes
 * every company/task/instance/calendar entry in the database, so this
 * must be unreachable — even with a valid CRON_SECRET or an admin
 * session — on any deployment that isn't explicitly running as the
 * public demo.
 */
async function handle(request: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const authHeader = request.headers.get("authorization");
  const isCron = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isCron) {
    const profile = await getCurrentProfile();
    if (!profile || (profile.role !== "admin" && profile.role !== "master_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await seedDemoData();
  return NextResponse.json(result);
}

export const GET = handle;
export const POST = handle;
