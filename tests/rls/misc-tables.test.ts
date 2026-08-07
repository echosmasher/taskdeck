/**
 * Lighter-weight read/write boundary checks for tables not individually
 * named in spec §8/task 24 — everyone reads, only admin/master_admin
 * writes is the dominant shape across this schema (companies, teams,
 * dimensions, app_settings all follow it).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type RlsFixtures, setupRlsFixtures, teardownRlsFixtures } from "./fixtures";

let fx: RlsFixtures;

beforeAll(async () => {
  fx = await setupRlsFixtures();
});

afterAll(async () => {
  await teardownRlsFixtures(fx);
});

describe("companies RLS", () => {
  it("member can read companies", async () => {
    const { data, error } = await fx.memberA.from("companies").select("id").eq("id", fx.companyId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("member cannot rename a company", async () => {
    // companies_write's USING clause is admin-only — a member's UPDATE
    // matches 0 rows rather than erroring, so select() to actually see
    // that instead of trusting `error` to be non-null.
    const { error, data } = await fx.memberA
      .from("companies")
      .update({ name: "Hijacked" })
      .eq("id", fx.companyId)
      .select();
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("admin can rename a company", async () => {
    const { error } = await fx.admin
      .from("companies")
      .update({ name: "RLS Test Co" })
      .eq("id", fx.companyId);
    expect(error).toBeNull();
  });
});

describe("teams RLS", () => {
  it("member cannot create a team", async () => {
    const { error } = await fx.memberA.from("teams").insert({ name: "Member-created team" });
    expect(error).not.toBeNull();
  });

  it("admin can update a team", async () => {
    const { error } = await fx.admin.from("teams").update({ name: "RLS Test Team" }).eq("id", fx.teamId);
    expect(error).toBeNull();
  });

  it("a plain admin (not master_admin) cannot delete a team", async () => {
    // teams_delete's USING clause matches 0 rows for a non-master_admin
    // rather than erroring — select() to observe that directly. Deleting
    // would break other tests/re-runs anyway if it *did* succeed — this
    // fixture's "admin" is intentionally role='admin', not
    // 'master_admin', so this should always be denied.
    const { error, data } = await fx.admin.from("teams").delete().eq("id", fx.teamId).select();
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});

describe("app_settings RLS", () => {
  it("member can read app_settings", async () => {
    const { error } = await fx.memberA.from("app_settings").select("*").eq("id", true).single();
    expect(error).toBeNull();
  });

  it("member cannot update app_settings", async () => {
    // app_settings_update's USING clause is admin-only — same 0-rows,
    // no-error shape as the other USING-only denials in this file.
    const { error, data } = await fx.memberA
      .from("app_settings")
      .update({ long_absence_min_days: 1 })
      .eq("id", true)
      .select();
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("admin can update app_settings", async () => {
    const { data: before } = await fx.serviceRole
      .from("app_settings")
      .select("long_absence_min_days")
      .eq("id", true)
      .single();

    const { error } = await fx.admin
      .from("app_settings")
      .update({ long_absence_min_days: before!.long_absence_min_days })
      .eq("id", true);
    expect(error).toBeNull();
  });
});
