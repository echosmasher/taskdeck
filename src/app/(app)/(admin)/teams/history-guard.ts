import "server-only";

/**
 * Whether a team or member has any task history, which blocks hard
 * delete (§4). Always false until task_instances exists — task 10
 * replaces these with real queries once that table lands.
 */
export async function teamHasHistory(_teamId: string): Promise<boolean> {
  return false;
}

export async function memberHasHistory(_profileId: string): Promise<boolean> {
  return false;
}
