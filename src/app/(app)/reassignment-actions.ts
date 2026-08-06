"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ReassignmentActionState {
  error?: string;
}

/**
 * Members can never reassign a task directly (addendum §15.4) — this
 * only ever creates a pending request. RLS (reassignment_requests_insert)
 * independently enforces requested_by = the caller and status = pending,
 * so even a tampered client payload can't self-approve or impersonate.
 */
export async function createReassignmentRequestAction(input: {
  taskId: string;
  scope: "instance" | "task";
  taskInstanceIds: string[];
  reason: string;
  suggestedAssigneeProfileId: string | null;
}): Promise<ReassignmentActionState> {
  const reason = input.reason.trim();
  if (!reason) return { error: "A reason is required." };
  if (input.scope === "instance" && input.taskInstanceIds.length === 0) {
    return { error: "Pick at least one company instance." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase.from("reassignment_requests").insert({
    requested_by_profile_id: user.id,
    scope: input.scope,
    task_id: input.taskId,
    task_instance_ids: input.scope === "instance" ? input.taskInstanceIds : [],
    reason,
    suggested_assignee_profile_id: input.suggestedAssigneeProfileId,
  });
  if (error) return { error: error.message };

  revalidatePath("/");
  return {};
}

export async function withdrawReassignmentRequestAction(
  requestId: string,
): Promise<ReassignmentActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reassignment_requests")
    .update({ status: "withdrawn" })
    .eq("id", requestId)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "That request can no longer be withdrawn." };

  revalidatePath("/");
  return {};
}
