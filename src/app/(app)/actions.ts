"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface InstanceActionState {
  error?: string;
}

/**
 * Every mutation here relies on the task_instances RLS update policy
 * (can_manage_task_instance) to enforce who may touch which instance —
 * admins can touch any, members only ones assigned to them or their
 * team. A permission failure doesn't error the query, it just matches
 * zero rows, so `.select("id")` is required to tell "updated" from
 * "silently not allowed" apart.
 */
async function updateInstanceStatus(
  instanceId: string,
  patch: { status: "open" | "completed" | "na"; na_reason: string | null },
): Promise<InstanceActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_instances")
    .update(patch)
    .eq("id", instanceId)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "You don't have permission to update this task." };
  }

  revalidatePath("/");
  return {};
}

export async function completeInstanceAction(instanceId: string): Promise<InstanceActionState> {
  return updateInstanceStatus(instanceId, { status: "completed", na_reason: null });
}

export async function markInstanceNaAction(
  instanceId: string,
  reason: string,
): Promise<InstanceActionState> {
  return updateInstanceStatus(instanceId, { status: "na", na_reason: reason.trim() || null });
}

export async function reopenInstanceAction(instanceId: string): Promise<InstanceActionState> {
  return updateInstanceStatus(instanceId, { status: "open", na_reason: null });
}

export interface BulkCompleteState {
  error?: string;
  completed?: number;
}

/**
 * "Complete remaining" (§7.1): a single UPDATE affecting several rows,
 * not a loop — the per-row stamp/na_reason-clear trigger and the
 * per-row task_events insert trigger both fire once per affected row,
 * so the audit trail still ends up one row per company even though
 * this is one statement.
 */
export async function completeRemainingAction(instanceIds: string[]): Promise<BulkCompleteState> {
  if (instanceIds.length === 0) return { completed: 0 };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_instances")
    .update({ status: "completed", na_reason: null })
    .in("id", instanceIds)
    .eq("status", "open")
    .select("id");

  if (error) return { error: error.message };

  revalidatePath("/");
  return { completed: data?.length ?? 0 };
}
