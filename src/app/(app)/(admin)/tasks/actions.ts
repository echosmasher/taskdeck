"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseDeadlineRule, parseRecurrence } from "@/lib/tasks/recurrence-validate";
import type { DeadlineRule, Recurrence } from "@/lib/tasks/recurrence-types";
import type { Json } from "@/lib/supabase/database.types";

export interface TaskActionState {
  error?: string;
}

function readScope(formData: FormData): string[] {
  return formData.getAll("scope").map(String);
}

function readJson(formData: FormData, key: string): unknown {
  const raw = formData.get(key);
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined; // signals malformed JSON to the caller
  }
}

interface ParsedTaskForm {
  title: string;
  description: string | null;
  assigneeType: "team" | "person";
  assigneeTeamId: string | null;
  assigneeProfileId: string | null;
  scope: string[];
  recurrence: Recurrence;
  deadlineRule: DeadlineRule;
}

function parseTaskForm(formData: FormData): ParsedTaskForm | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };

  const description = String(formData.get("description") ?? "").trim() || null;

  const assigneeType = String(formData.get("assignee_type") ?? "");
  if (assigneeType !== "team" && assigneeType !== "person") {
    return { error: "Choose whether this task is assigned to a team or a person." };
  }
  const assigneeId = String(formData.get("assignee_id") ?? "");
  if (!assigneeId) {
    return { error: `Choose which ${assigneeType} this task is assigned to.` };
  }

  const scope = readScope(formData);

  const recurrenceRaw = readJson(formData, "recurrence");
  if (recurrenceRaw === undefined) return { error: "Recurrence data is malformed." };
  const recurrenceResult = parseRecurrence(recurrenceRaw);
  if ("error" in recurrenceResult) return { error: recurrenceResult.error };

  const deadlineRaw = readJson(formData, "deadline_rule");
  if (deadlineRaw === undefined) return { error: "Deadline override data is malformed." };
  const deadlineResult = parseDeadlineRule(deadlineRaw);
  if ("error" in deadlineResult) return { error: deadlineResult.error };

  return {
    title,
    description,
    assigneeType,
    assigneeTeamId: assigneeType === "team" ? assigneeId : null,
    assigneeProfileId: assigneeType === "person" ? assigneeId : null,
    scope,
    recurrence: recurrenceResult.recurrence,
    deadlineRule: deadlineResult.deadlineRule,
  };
}

export async function createTaskAction(
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const parsed = parseTaskForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: created, error } = await supabase
    .from("tasks")
    .insert({
      title: parsed.title,
      description: parsed.description,
      assignee_type: parsed.assigneeType,
      assignee_team_id: parsed.assigneeTeamId,
      assignee_profile_id: parsed.assigneeProfileId,
      scope: parsed.scope,
      recurrence: parsed.recurrence,
      deadline_rule: parsed.deadlineRule,
      created_by: user?.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // Non-blocking absence warning (addendum §15.3.2): "the warning is
  // recorded in task_events details so the decision is traceable" —
  // only written when the client actually showed one at save time.
  const absenceWarning = readJson(formData, "absence_warning");
  if (created && absenceWarning) {
    await supabase.from("task_events").insert({
      task_id: created.id,
      event: "edited",
      actor_profile_id: user?.id,
      details: { absence_warning: absenceWarning } as unknown as Json,
    });
  }

  revalidatePath("/tasks");
  return {};
}

export async function updateTaskAction(
  taskId: string,
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const parsed = parseTaskForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();

  const [{ data: before }, { data: userData }] = await Promise.all([
    supabase.from("tasks").select("*").eq("id", taskId).single(),
    supabase.auth.getUser(),
  ]);

  const { error } = await supabase
    .from("tasks")
    .update({
      title: parsed.title,
      description: parsed.description,
      assignee_type: parsed.assigneeType,
      assignee_team_id: parsed.assigneeTeamId,
      assignee_profile_id: parsed.assigneeProfileId,
      scope: parsed.scope,
      recurrence: parsed.recurrence,
      deadline_rule: parsed.deadlineRule,
    })
    .eq("id", taskId);
  if (error) return { error: error.message };

  // §5 "reassignment is logged in task_events" — a separate, more
  // specific event than the generic edit, so History can show exactly
  // when and by whom a task changed hands.
  if (before) {
    const actorId = userData.user?.id;
    const reassigned =
      before.assignee_type !== parsed.assigneeType ||
      before.assignee_team_id !== parsed.assigneeTeamId ||
      before.assignee_profile_id !== parsed.assigneeProfileId;

    const otherFieldsChanged =
      before.title !== parsed.title ||
      before.description !== parsed.description ||
      JSON.stringify(before.scope) !== JSON.stringify(parsed.scope) ||
      JSON.stringify(before.recurrence) !== JSON.stringify(parsed.recurrence) ||
      JSON.stringify(before.deadline_rule) !== JSON.stringify(parsed.deadlineRule);

    const events: {
      task_id: string;
      event: "reassigned" | "edited";
      actor_profile_id?: string;
      details: Json;
    }[] = [];

    if (reassigned) {
      events.push({
        task_id: taskId,
        event: "reassigned",
        actor_profile_id: actorId,
        details: {
          from: { type: before.assignee_type, team_id: before.assignee_team_id, profile_id: before.assignee_profile_id },
          to: { type: parsed.assigneeType, team_id: parsed.assigneeTeamId, profile_id: parsed.assigneeProfileId },
        },
      });
    }
    if (otherFieldsChanged) {
      events.push({
        task_id: taskId,
        event: "edited",
        actor_profile_id: actorId,
        details: {},
      });
    }

    const absenceWarning = readJson(formData, "absence_warning");
    if (absenceWarning) {
      events.push({
        task_id: taskId,
        event: "edited",
        actor_profile_id: actorId,
        details: { absence_warning: absenceWarning } as unknown as Json,
      });
    }

    if (events.length > 0) {
      await supabase.from("task_events").insert(events);
    }
  }

  revalidatePath("/tasks");
  return {};
}

export async function setTaskArchivedAction(taskId: string, archived: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ is_archived: archived })
    .eq("id", taskId);
  if (error) return { error: error.message };

  revalidatePath("/tasks");
  return {};
}

export interface OverridableInstance {
  instanceId: string;
  companyName: string;
  dueDate: string;
}

/**
 * The instances "Assign and cover" can act on: this task's still-open
 * instances already generated within the absence warning's affected
 * date range. Only ever non-empty in edit mode — a brand-new task has
 * no instances yet, so there's nothing to pre-fill until the next
 * generation run (the Coverage view will surface it then).
 */
export async function findOverridableInstancesAction(
  taskId: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<OverridableInstance[]> {
  const supabase = await createClient();
  const [{ data: instances }, { data: companies }] = await Promise.all([
    supabase
      .from("task_instances")
      .select("id, company_id, due_date")
      .eq("task_id", taskId)
      .eq("status", "open")
      .gte("due_date", rangeStart)
      .lte("due_date", rangeEnd),
    supabase.from("companies").select("id, name"),
  ]);

  const companyNameById = new Map((companies ?? []).map((c) => [c.id, c.name]));
  return (instances ?? []).map((i) => ({
    instanceId: i.id,
    companyName: companyNameById.get(i.company_id) ?? "Unknown company",
    dueDate: i.due_date,
  }));
}
