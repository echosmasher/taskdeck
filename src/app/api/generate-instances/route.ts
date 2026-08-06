import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { generateTaskInstances } from "@/lib/tasks/generate-instances";

/**
 * Triggers instance generation (§6). Two authorized callers:
 *  - Vercel Cron, which invokes this route via GET and sends the
 *    standard `Authorization: Bearer ${CRON_SECRET}` header
 *    automatically for scheduled invocations (see vercel.json).
 *  - An admin/master_admin session (POST), for a manual "regenerate"
 *    trigger.
 * Anyone else gets 401 — this must never be reachable by a plain member.
 */
async function handle(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const isCron = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isCron) {
    const profile = await getCurrentProfile();
    if (!profile || (profile.role !== "admin" && profile.role !== "master_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await generateTaskInstances();
  return NextResponse.json(result);
}

export const GET = handle;
export const POST = handle;
