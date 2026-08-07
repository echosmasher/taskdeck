/**
 * "Members can never reassign a task directly — they can only ask"
 * (task 24, addendum §15.4 intro). Covers three layers that together
 * make that true:
 *  - tasks_write (20260806122731_tasks_instances_events.sql): admin-only
 *    for all writes, so a member can't change a task's assignee_* at all.
 *  - guard_task_instance_override (20260806160000_task_instance_overrides.sql):
 *    a trigger blocking non-admins from touching
 *    assignee_override_profile_id/override_reason, even though the RLS
 *    policy alone (can_manage_task_instance) would otherwise let the
 *    task's own assignee through — the trigger is the real gate here.
 *  - reassignment_requests (20260806170000_reassignment_requests.sql):
 *    a member can create/withdraw only their own pending request, never
 *    decide one (approve/reject is admin-only, enforced by
 *    guard_reassignment_request_update).
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

describe("tasks RLS — direct reassignment", () => {
  it("member cannot change a task's assignee", async () => {
    // tasks_write's USING clause is admin-only, so a member's UPDATE
    // isn't a policy *error* — Postgres just filters the row out before
    // the write, so PostgREST reports 0 rows affected. select() forces
    // the response to include the (empty) affected-rows array so that's
    // actually observable, instead of only checking `error` (which
    // would stay null and make this assertion pass for the wrong reason).
    const { error, data } = await fx.memberA
      .from("tasks")
      .update({ assignee_profile_id: fx.memberBId })
      .eq("id", fx.taskId)
      .select();
    expect(error).toBeNull();
    expect(data).toHaveLength(0);

    const { data: after } = await fx.serviceRole.from("tasks").select("assignee_profile_id").eq("id", fx.taskId).single();
    expect(after?.assignee_profile_id).toBe(fx.memberAId);
  });

  it("admin can change a task's assignee", async () => {
    const { error } = await fx.admin
      .from("tasks")
      .update({ assignee_profile_id: fx.memberBId })
      .eq("id", fx.taskId);
    expect(error).toBeNull();

    // Restore for other tests/re-runs.
    await fx.serviceRole.from("tasks").update({ assignee_profile_id: fx.memberAId }).eq("id", fx.taskId);
  });
});

describe("task_instances RLS — override is admin-only", () => {
  it("member cannot set an assignee override, even on their own instance", async () => {
    const { error } = await fx.memberA
      .from("task_instances")
      .update({ assignee_override_profile_id: fx.memberBId, override_reason: "trying to self-serve" })
      .eq("id", fx.instanceId);
    expect(error).not.toBeNull();

    const { data } = await fx.serviceRole
      .from("task_instances")
      .select("assignee_override_profile_id")
      .eq("id", fx.instanceId)
      .single();
    expect(data?.assignee_override_profile_id).toBeNull();
  });

  it("admin can set an assignee override", async () => {
    const { error } = await fx.admin
      .from("task_instances")
      .update({ assignee_override_profile_id: fx.memberBId, override_reason: "covering for member A" })
      .eq("id", fx.instanceId);
    expect(error).toBeNull();

    const { data } = await fx.serviceRole
      .from("task_instances")
      .select("assignee_override_profile_id")
      .eq("id", fx.instanceId)
      .single();
    expect(data?.assignee_override_profile_id).toBe(fx.memberBId);

    // Restore for other tests/re-runs.
    await fx.serviceRole
      .from("task_instances")
      .update({ assignee_override_profile_id: null, override_reason: null })
      .eq("id", fx.instanceId);
  });

  it("member CAN update their own instance's status (positive control)", async () => {
    const { error } = await fx.memberA
      .from("task_instances")
      .update({ status: "completed" })
      .eq("id", fx.instanceId);
    expect(error).toBeNull();

    // Restore.
    await fx.serviceRole.from("task_instances").update({ status: "open" }).eq("id", fx.instanceId);
  });
});

describe("reassignment_requests RLS", () => {
  it("member can create a pending request in their own name", async () => {
    const { error } = await fx.memberA.from("reassignment_requests").insert({
      requested_by_profile_id: fx.memberAId,
      scope: "task",
      task_id: fx.taskId,
      task_instance_ids: [],
      reason: "RLS test — own pending request",
      status: "pending",
    });
    expect(error).toBeNull();
  });

  it("member cannot create a request on someone else's behalf", async () => {
    const { error } = await fx.memberA.from("reassignment_requests").insert({
      requested_by_profile_id: fx.memberBId,
      scope: "task",
      task_id: fx.taskId,
      task_instance_ids: [],
      reason: "RLS test — impersonation attempt",
      status: "pending",
    });
    expect(error).not.toBeNull();
  });

  it("member cannot create a pre-decided request", async () => {
    const { error } = await fx.memberA.from("reassignment_requests").insert({
      requested_by_profile_id: fx.memberAId,
      scope: "task",
      task_id: fx.taskId,
      task_instance_ids: [],
      reason: "RLS test — pre-approved attempt",
      status: "approved",
    });
    expect(error).not.toBeNull();
  });

  it("member can withdraw their own pending request, but cannot approve it", async () => {
    const { data: request, error: insertError } = await fx.memberA
      .from("reassignment_requests")
      .insert({
        requested_by_profile_id: fx.memberAId,
        scope: "task",
        task_id: fx.taskId,
        task_instance_ids: [],
        reason: "RLS test — withdraw path",
        status: "pending",
      })
      .select("id")
      .single();
    expect(insertError).toBeNull();

    const { error: selfApproveError } = await fx.memberA
      .from("reassignment_requests")
      .update({ status: "approved" })
      .eq("id", request!.id);
    expect(selfApproveError).not.toBeNull();

    const { error: withdrawError } = await fx.memberA
      .from("reassignment_requests")
      .update({ status: "withdrawn" })
      .eq("id", request!.id);
    expect(withdrawError).toBeNull();
  });

  it("member cannot update another member's pending request", async () => {
    const { data: request, error: insertError } = await fx.serviceRole
      .from("reassignment_requests")
      .insert({
        requested_by_profile_id: fx.memberBId,
        scope: "task",
        task_id: fx.taskId,
        task_instance_ids: [],
        reason: "RLS test — belongs to member B",
        status: "pending",
      })
      .select("id")
      .single();
    expect(insertError).toBeNull();

    // Same USING-filters-the-row-out shape as the tasks test above: not
    // an error, just 0 rows affected.
    const { error, data } = await fx.memberA
      .from("reassignment_requests")
      .update({ status: "withdrawn" })
      .eq("id", request!.id)
      .select();
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("admin can approve a pending request", async () => {
    const { data: request, error: insertError } = await fx.memberA
      .from("reassignment_requests")
      .insert({
        requested_by_profile_id: fx.memberAId,
        scope: "task",
        task_id: fx.taskId,
        task_instance_ids: [],
        reason: "RLS test — admin decides",
        status: "pending",
      })
      .select("id")
      .single();
    expect(insertError).toBeNull();

    const { error } = await fx.admin
      .from("reassignment_requests")
      .update({ status: "approved", decision_note: "looks fine" })
      .eq("id", request!.id);
    expect(error).toBeNull();

    const { data: decided } = await fx.serviceRole
      .from("reassignment_requests")
      .select("decided_by_profile_id, decided_at")
      .eq("id", request!.id)
      .single();
    expect(decided?.decided_by_profile_id).toBe(fx.adminId);
    expect(decided?.decided_at).not.toBeNull();
  });
});
