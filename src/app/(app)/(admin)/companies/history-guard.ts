import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Whether a company has any task history, which blocks hard delete (§4
 * "hard delete only permitted for records with zero task history").
 */
export async function companyHasHistory(companyId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("task_instances")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  return !!count && count > 0;
}
