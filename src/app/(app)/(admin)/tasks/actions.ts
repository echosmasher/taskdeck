"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseDeadlineRule, parseRecurrence } from "@/lib/tasks/recurrence-validate";
import type { DeadlineRule, Recurrence } from "@/lib/tasks/recurrence-types";

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
  console.log("DEBUG formData entries:", [...formData.entries()]);
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

  const { error } = await supabase.from("tasks").insert({
    title: parsed.title,
    description: parsed.description,
    assignee_type: parsed.assigneeType,
    assignee_team_id: parsed.assigneeTeamId,
    assignee_profile_id: parsed.assigneeProfileId,
    scope: parsed.scope,
    recurrence: parsed.recurrence,
    deadline_rule: parsed.deadlineRule,
    created_by: user?.id,
  });
  if (error) return { error: error.message };

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
