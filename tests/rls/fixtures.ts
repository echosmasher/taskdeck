/**
 * Shared setup for the RLS integration suite (task 24, spec §8 — "RLS
 * policies tested... with two role clients"). Runs against the local
 * Supabase stack (same precondition as `pnpm seed`), using dedicated
 * `rls-test-*@taskdeck.local` accounts kept separate from the demo
 * seed's fixed accounts so `pnpm seed` / the nightly reset job and this
 * suite never clobber each other.
 *
 * Two *signed-in* clients are created (admin, member A) — enough to
 * probe every policy in this suite as "self" vs "not admin"; a third
 * bystander profile (member B) exists purely as a distinct target row
 * owner for the calendar_entries "another member's row" assertions and
 * is never itself signed into.
 *
 * Fixtures are upserted by a fixed natural key and never torn down by
 * deletion: `task_events` is append-only with no DELETE grant even for
 * service_role (by design — see its migration), and it plus
 * `reassignment_requests` hold plain (non-cascading) FKs to
 * `tasks`/`task_instances`, so once a test triggers any audit-log
 * insert (e.g. the override-set trigger), deleting the fixture task
 * becomes a permission error or a FK violation. Re-running this suite
 * locally just reuses the same rows instead of accumulating duplicates
 * — accepted trade-off for a local-only integration suite.
 */
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const RLS_TEST_PASSWORD = "rls-test-password-not-for-production";

const ADMIN_EMAIL = "rls-test-admin@taskdeck.local";
const MEMBER_A_EMAIL = "rls-test-member-a@taskdeck.local";
const MEMBER_B_EMAIL = "rls-test-member-b@taskdeck.local";
const TEAM_NAME = "RLS Test Team";
const COMPANY_NAME = "RLS Test Co";
const TASK_TITLE = "RLS test task (fixture)";
const INSTANCE_DUE_DATE = "2026-01-05";

export interface RlsFixtures {
  serviceRole: ReturnType<typeof createAdminClient>;
  admin: SupabaseClient<Database>;
  memberA: SupabaseClient<Database>;
  adminId: string;
  memberAId: string;
  memberBId: string;
  teamId: string;
  companyId: string;
  /** A task assigned directly to member A (person assignment). */
  taskId: string;
  /** A single open instance of that task, for the fixture company. */
  instanceId: string;
}

function anonClient(): SupabaseClient<Database> {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

async function ensureUser(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  role: Database["public"]["Enums"]["user_role"],
  fullName: string,
): Promise<string> {
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let id = existing?.users.find((u) => u.email === email)?.id;

  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: RLS_TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`createUser(${email}): ${error.message}`);
    id = data.user!.id;
  } else {
    const { error } = await admin.auth.admin.updateUserById(id, { password: RLS_TEST_PASSWORD });
    if (error) throw new Error(`updateUserById(${email}): ${error.message}`);
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name: fullName, role, is_archived: false })
    .eq("id", id);
  if (profileError) throw new Error(`update profile(${email}): ${profileError.message}`);

  return id;
}

async function signIn(email: string): Promise<SupabaseClient<Database>> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password: RLS_TEST_PASSWORD });
  if (error) throw new Error(`signInWithPassword(${email}): ${error.message}`);
  return client;
}

async function ensureTeam(serviceRole: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data: existing } = await serviceRole
    .from("teams")
    .select("id")
    .eq("name", TEAM_NAME)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await serviceRole
    .from("teams")
    .insert({ name: TEAM_NAME })
    .select("id")
    .single();
  if (error) throw new Error(`insert team: ${error.message}`);
  return data.id;
}

async function ensureCompany(serviceRole: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data: existing } = await serviceRole
    .from("companies")
    .select("id")
    .eq("name", COMPANY_NAME)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await serviceRole
    .from("companies")
    .insert({ name: COMPANY_NAME })
    .select("id")
    .single();
  if (error) throw new Error(`insert company: ${error.message}`);
  return data.id;
}

async function ensureTask(
  serviceRole: ReturnType<typeof createAdminClient>,
  memberAId: string,
  adminId: string,
): Promise<string> {
  const { data: existing } = await serviceRole
    .from("tasks")
    .select("id")
    .eq("title", TASK_TITLE)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await serviceRole
    .from("tasks")
    .insert({
      title: TASK_TITLE,
      assignee_type: "person",
      assignee_profile_id: memberAId,
      scope: [],
      recurrence: { type: "weekly", weekday: 1 },
      deadline_rule: null,
      created_by: adminId,
    })
    .select("id")
    .single();
  if (error) throw new Error(`insert task: ${error.message}`);
  return data.id;
}

async function ensureInstance(
  serviceRole: ReturnType<typeof createAdminClient>,
  taskId: string,
  companyId: string,
): Promise<string> {
  const { data: existing } = await serviceRole
    .from("task_instances")
    .select("id")
    .eq("task_id", taskId)
    .eq("company_id", companyId)
    .eq("due_date", INSTANCE_DUE_DATE)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await serviceRole
    .from("task_instances")
    .insert({ task_id: taskId, company_id: companyId, due_date: INSTANCE_DUE_DATE, status: "open" })
    .select("id")
    .single();
  if (error) throw new Error(`insert task_instance: ${error.message}`);
  return data.id;
}

export async function setupRlsFixtures(): Promise<RlsFixtures> {
  const serviceRole = createAdminClient();

  const adminId = await ensureUser(serviceRole, ADMIN_EMAIL, "admin", "RLS Test Admin");
  const memberAId = await ensureUser(serviceRole, MEMBER_A_EMAIL, "member", "RLS Test Member A");
  const memberBId = await ensureUser(serviceRole, MEMBER_B_EMAIL, "member", "RLS Test Member B");

  const teamId = await ensureTeam(serviceRole);
  const { error: assignTeamError } = await serviceRole
    .from("profiles")
    .update({ team_id: teamId })
    .in("id", [memberAId, memberBId]);
  if (assignTeamError) throw new Error(`assign team: ${assignTeamError.message}`);

  const companyId = await ensureCompany(serviceRole);
  const taskId = await ensureTask(serviceRole, memberAId, adminId);
  const instanceId = await ensureInstance(serviceRole, taskId, companyId);

  // Reset per-run state that individual specs mutate, so each test file
  // starts from the same baseline regardless of run order.
  const { error: resetInstanceError } = await serviceRole
    .from("task_instances")
    .update({
      status: "open",
      assignee_override_profile_id: null,
      override_reason: null,
    })
    .eq("id", instanceId);
  if (resetInstanceError) throw new Error(`reset instance: ${resetInstanceError.message}`);

  const { error: resetTaskError } = await serviceRole
    .from("tasks")
    .update({ assignee_type: "person", assignee_team_id: null, assignee_profile_id: memberAId })
    .eq("id", taskId);
  if (resetTaskError) throw new Error(`reset task: ${resetTaskError.message}`);

  const admin = await signIn(ADMIN_EMAIL);
  const memberA = await signIn(MEMBER_A_EMAIL);

  return {
    serviceRole,
    admin,
    memberA,
    adminId,
    memberAId,
    memberBId,
    teamId,
    companyId,
    taskId,
    instanceId,
  };
}

export async function teardownRlsFixtures(fx: RlsFixtures): Promise<void> {
  await fx.admin.auth.signOut();
  await fx.memberA.auth.signOut();
}
