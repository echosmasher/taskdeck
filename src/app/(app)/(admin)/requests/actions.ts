"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export interface RequestDecisionState {
  error?: string;
}

/**
 * Approve (addendum §15.4.2): instance scope writes the override on the
 * listed instances (same mechanism as the Coverage view's bulk action —
 * §15.3.3's per-row stamp/audit trigger does the rest); task scope
 * updates the task definition's own assignee, same as the existing
 * task-12 reassign action, leaving past instances untouched. Either way
 * a task_events row is written referencing the request, so History
 * shows *why* the assignee changed.
 */
export async function approveReassignmentRequestAction(
  requestId: string,
  newAssigneeProfileId: string,
  decisionNote: string,
): Promise<RequestDecisionState> {
  const supabase = await createClient();

  const { data: request, error: fetchError } = await supabase
    .from("reassignment_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (fetchError || !request) return { error: fetchError?.message ?? "Request not found." };
  if (request.status !== "pending") return { error: "This request was already decided." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.scope === "instance") {
    const { error } = await supabase
      .from("task_instances")
      .update({
        assignee_override_profile_id: newAssigneeProfileId,
        override_reason: `Reassignment request approved: ${request.reason}`,
      })
      .in("id", request.task_instance_ids);
    if (error) return { error: error.message };
  } else {
    const { data: before } = await supabase
      .from("tasks")
      .select("assignee_type, assignee_team_id, assignee_profile_id")
      .eq("id", request.task_id)
      .single();

    const { error } = await supabase
      .from("tasks")
      .update({
        assignee_type: "person",
        assignee_team_id: null,
        assignee_profile_id: newAssigneeProfileId,
      })
      .eq("id", request.task_id);
    if (error) return { error: error.message };

    await supabase.from("task_events").insert({
      task_id: request.task_id,
      event: "reassigned",
      actor_profile_id: user?.id,
      details: {
        reassignment_request_id: requestId,
        from: before,
        to: { type: "person", team_id: null, profile_id: newAssigneeProfileId },
      } as unknown as Json,
    });
  }

  const { error: decisionError } = await supabase
    .from("reassignment_requests")
    .update({ status: "approved", decision_note: decisionNote.trim() || null })
    .eq("id", requestId);
  if (decisionError) return { error: decisionError.message };

  revalidatePath("/requests");
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/coverage");
  return {};
}

export async function rejectReassignmentRequestAction(
  requestId: string,
  decisionNote: string,
): Promise<RequestDecisionState> {
  const note = decisionNote.trim();
  if (!note) return { error: "A decision note is required to reject a request." };

  const supabase = await createClient();
  const { data: request, error: fetchError } = await supabase
    .from("reassignment_requests")
    .select("task_id, status, requested_by_profile_id")
    .eq("id", requestId)
    .single();
  if (fetchError || !request) return { error: fetchError?.message ?? "Request not found." };
  if (request.status !== "pending") return { error: "This request was already decided." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("reassignment_requests")
    .update({ status: "rejected", decision_note: note })
    .eq("id", requestId);
  if (error) return { error: error.message };

  await supabase.from("task_events").insert({
    task_id: request.task_id,
    event: "edited",
    actor_profile_id: user?.id,
    details: {
      reassignment_request_id: requestId,
      reassignment_request_rejected: true,
      decision_note: note,
    } as unknown as Json,
  });

  revalidatePath("/requests");
  revalidatePath("/");
  return {};
}
