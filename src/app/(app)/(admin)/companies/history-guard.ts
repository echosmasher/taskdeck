import "server-only";

/**
 * Whether a company has any task history, which blocks hard delete (§4
 * "hard delete only permitted for records with zero task history").
 * Always false until task_instances exists — task 10 replaces this with
 * a real query once that table lands.
 */
export async function companyHasHistory(_companyId: string): Promise<boolean> {
  return false;
}
