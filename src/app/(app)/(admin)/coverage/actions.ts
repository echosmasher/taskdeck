"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SetOverridesState {
  error?: string;
  updated?: number;
}

/**
 * Bulk-assigns one covering member to several instances at once (the
 * coverage view's bulk action, and the task form's "Assign and cover").
 * RLS (can_manage_task_instance via can_edit... no — the override guard
 * trigger) already restricts this to admins; a single UPDATE ... WHERE
 * id IN (...) still gets each row its own override_set_by/at stamp and
 * its own task_events row, since those come from per-row triggers.
 */
export async function setInstanceOverridesAction(
  instanceIds: string[],
  coveringProfileId: string,
  reason: string,
): Promise<SetOverridesState> {
  if (instanceIds.length === 0) return { updated: 0 };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_instances")
    .update({
      assignee_override_profile_id: coveringProfileId,
      override_reason: reason.trim() || null,
    })
    .in("id", instanceIds)
    .select("id");

  if (error) return { error: error.message };

  revalidatePath("/coverage");
  revalidatePath("/");
  revalidatePath("/history");
  return { updated: data?.length ?? 0 };
}
