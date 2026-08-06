"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DeadlineRule, Recurrence } from "@/lib/tasks/recurrence-types";
import { createTaskAction, updateTaskAction } from "./actions";
import { AssigneeField } from "./assignee-field";
import { DeadlineRuleField } from "./deadline-rule-field";
import { RecurrenceField } from "./recurrence-field";
import { ScopeField } from "./scope-field";
import type { DimensionOption, MemberOption, TaskRow, TeamOption } from "./types";

export function TaskFormDialog({
  open,
  onOpenChange,
  dimensions,
  teams,
  members,
  countries,
  task,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimensions: DimensionOption[];
  teams: TeamOption[];
  members: MemberOption[];
  countries: string[];
  /** Omit for create mode. */
  task?: TaskRow;
}) {
  const isEdit = !!task;
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const [assigneeType, setAssigneeType] = useState<"team" | "person">(
    task?.assignee_type ?? "person",
  );
  const [assigneeId, setAssigneeId] = useState(
    task?.assignee_team_id ?? task?.assignee_profile_id ?? "",
  );
  const [scope, setScope] = useState<string[]>(task?.scope ?? []);
  const [recurrence, setRecurrence] = useState<Recurrence>(
    task?.recurrence ?? { type: "one_off", date: "" },
  );
  const [deadlineRule, setDeadlineRule] = useState<DeadlineRule>(task?.deadline_rule ?? null);

  function reset() {
    setAssigneeType(task?.assignee_type ?? "person");
    setAssigneeId(task?.assignee_team_id ?? task?.assignee_profile_id ?? "");
    setScope(task?.scope ?? []);
    setRecurrence(task?.recurrence ?? { type: "one_off", date: "" });
    setDeadlineRule(task?.deadline_rule ?? null);
    setError(undefined);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);

    if (!assigneeId) {
      setError(`Choose which ${assigneeType} this task is assigned to.`);
      return;
    }
    if (recurrence.type === "one_off" && !recurrence.date) {
      setError("Pick a due date for the one-off task.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = isEdit
        ? await updateTaskAction(task.id, {}, formData)
        : await createTaskAction({}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(isEdit ? "Task updated" : "Task created");
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-1 py-1">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required defaultValue={task?.title} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={task?.description ?? ""}
              />
            </div>

            <AssigneeField
              assigneeType={assigneeType}
              onAssigneeTypeChange={setAssigneeType}
              assigneeId={assigneeId}
              onAssigneeIdChange={setAssigneeId}
              teams={teams}
              members={members}
            />

            <ScopeField dimensions={dimensions} selected={scope} onChange={setScope} />

            <RecurrenceField value={recurrence} onChange={setRecurrence} countries={countries} />

            <DeadlineRuleField
              value={deadlineRule}
              onChange={setDeadlineRule}
              countries={countries}
            />

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
