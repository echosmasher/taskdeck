/**
 * The three calendar_entries edit-permission modes (addendum §15.2,
 * task 24) — `can_edit_calendar_entry()` in
 * supabase/migrations/20260806150000_calendar_edit_permissions.sql.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type RlsFixtures, setupRlsFixtures, teardownRlsFixtures } from "./fixtures";

type CalendarEditPermission = "admins_only" | "members_own" | "members_all";

const TEST_DATE = "2026-02-02";

let fx: RlsFixtures;

beforeAll(async () => {
  fx = await setupRlsFixtures();
});

afterAll(async () => {
  await teardownRlsFixtures(fx);
});

afterEach(async () => {
  await fx.serviceRole.from("calendar_entries").delete().eq("date", TEST_DATE);
});

async function setPermission(mode: CalendarEditPermission) {
  const { error } = await fx.serviceRole
    .from("app_settings")
    .update({ calendar_edit_permission: mode })
    .eq("id", true);
  if (error) throw new Error(`set calendar_edit_permission: ${error.message}`);
}

describe("calendar_entries RLS — admin", () => {
  beforeEach(() => setPermission("admins_only"));

  it("admin can always write any profile's row, regardless of mode", async () => {
    const { error } = await fx.admin
      .from("calendar_entries")
      .upsert(
        { profile_id: fx.memberBId, date: TEST_DATE, status: "in_office" },
        { onConflict: "profile_id,date" },
      );
    expect(error).toBeNull();
  });
});

describe("calendar_entries RLS — admins_only", () => {
  beforeEach(() => setPermission("admins_only"));

  it("member cannot write their own row", async () => {
    const { error } = await fx.memberA
      .from("calendar_entries")
      .upsert(
        { profile_id: fx.memberAId, date: TEST_DATE, status: "in_office" },
        { onConflict: "profile_id,date" },
      );
    expect(error).not.toBeNull();
  });

  it("member cannot write another member's row", async () => {
    const { error } = await fx.memberA
      .from("calendar_entries")
      .upsert(
        { profile_id: fx.memberBId, date: TEST_DATE, status: "in_office" },
        { onConflict: "profile_id,date" },
      );
    expect(error).not.toBeNull();
  });
});

describe("calendar_entries RLS — members_own", () => {
  beforeEach(() => setPermission("members_own"));

  it("member can write their own row", async () => {
    const { error } = await fx.memberA
      .from("calendar_entries")
      .upsert(
        { profile_id: fx.memberAId, date: TEST_DATE, status: "remote" },
        { onConflict: "profile_id,date" },
      );
    expect(error).toBeNull();
  });

  it("member cannot write another member's row", async () => {
    const { error } = await fx.memberA
      .from("calendar_entries")
      .upsert(
        { profile_id: fx.memberBId, date: TEST_DATE, status: "remote" },
        { onConflict: "profile_id,date" },
      );
    expect(error).not.toBeNull();
  });
});

describe("calendar_entries RLS — members_all", () => {
  beforeEach(() => setPermission("members_all"));

  it("member can write their own row", async () => {
    const { error } = await fx.memberA
      .from("calendar_entries")
      .upsert(
        { profile_id: fx.memberAId, date: TEST_DATE, status: "sick" },
        { onConflict: "profile_id,date" },
      );
    expect(error).toBeNull();
  });

  it("member can write another member's row", async () => {
    const { error } = await fx.memberA
      .from("calendar_entries")
      .upsert(
        { profile_id: fx.memberBId, date: TEST_DATE, status: "sick" },
        { onConflict: "profile_id,date" },
      );
    expect(error).toBeNull();
  });
});
