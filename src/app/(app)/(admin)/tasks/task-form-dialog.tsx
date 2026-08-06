"use client";

import { useMemo, useRef, useState, useTransition } from "react";
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
import { computeAssignmentWarning } from "@/lib/tasks/assignment-warning";
import type { DeadlineRule, Recurrence } from "@/lib/tasks/recurrence-types";
import { AbsenceWarningBanner } from "./absence-warning-banner";
import { createTaskAction, updateTaskAction } from "./actions";
import { AssigneeField } from "./assignee-field";
import { AssignAndCoverDialog } from "./assign-and-cover-dialog";
import { CopyTaskPicker } from "./copy-task-picker";
import { DeadlineRuleField } from "./deadline-rule-field";
import { RecurrenceField } from "./recurrence-field";
import { ScopeField } from "./scope-field";
import type {
  AbsenceWarningContext,
  DimensionOption,
  MemberOption,
  TaskRow,
  TeamOption,
} from "./types";

const DEFAULT_RECURRENCE: Recurrence = { type: "one_off", date: "" };

export function TaskFormDialog({
  open,
  onOpenChange,
  dimensions,
  teams,
  members,
  countries,
  task,
  allTasksForCopy,
  absenceWarningContext,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimensions: DimensionOption[];
  teams: TeamOption[];
  members: MemberOption[];
  countries: string[];
  /** Omit for create mode. */
  task?: TaskRow;
  /** Only needed in create mode, for the "copy from existing" picker. */
  allTasksForCopy?: TaskRow[];
  absenceWarningContext: AbsenceWarningContext;
}) {
  const isEdit = !!task;
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string>();
  const [copyWarning, setCopyWarning] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [assigneeType, setAssigneeType] = useState<"team" | "person">(
    task?.assignee_type ?? "person",
  );
  const [assigneeId, setAssigneeId] = useState(
    task?.assignee_team_id ?? task?.assignee_profile_id ?? "",
  );
  const [scope, setScope] = useState<string[]>(task?.scope ?? []);
  const [recurrence, setRecurrence] = useState<Recurrence>(task?.recurrence ?? DEFAULT_RECURRENCE);
  const [deadlineRule, setDeadlineRule] = useState<DeadlineRule>(task?.deadline_rule ?? null);
  const [assignAndCoverOpen, setAssignAndCoverOpen] = useState(false);

  // Assignment-time absence warning (addendum §15.3.2) — team
  // assignments aren't warned on, since a team task is completable by
  // any member and absence self-heals.
  const warning = useMemo(() => {
    if (assigneeType !== "person" || !assigneeId) return null;
    return computeAssignmentWarning({
      recurrence,
      deadlineRule,
      scope,
      assigneeEntriesByDate: new Map(
        Object.entries(absenceWarningContext.entriesByProfile[assigneeId] ?? {}),
      ),
      companies: absenceWarningContext.companies.map((c) => ({
        id: c.id,
        dimensionValues: new Map(Object.entries(c.dimensionValues)),
      })),
      dimensionValueToDimension: new Map(
        Object.entries(absenceWarningContext.dimensionValueToDimension),
      ),
      holidaysByCountry: new Map(
        Object.entries(absenceWarningContext.holidaysByCountry).map(([k, v]) => [k, new Set(v)]),
      ),
      classifyOptions: {
        longAbsenceStatuses: absenceWarningContext.longAbsenceStatuses,
        longAbsenceMinDays: absenceWarningContext.longAbsenceMinDays,
        holidays: new Set(Object.values(absenceWarningContext.holidaysByCountry).flat()),
      },
      todayISO: absenceWarningContext.todayISO,
    });
  }, [assigneeType, assigneeId, recurrence, deadlineRule, scope, absenceWarningContext]);

  const assigneeName = members.find((m) => m.id === assigneeId)?.label ?? "This person";

  function reset() {
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setAssigneeType(task?.assignee_type ?? "person");
    setAssigneeId(task?.assignee_team_id ?? task?.assignee_profile_id ?? "");
    setScope(task?.scope ?? []);
    setRecurrence(task?.recurrence ?? DEFAULT_RECURRENCE);
    setDeadlineRule(task?.deadline_rule ?? null);
    setError(undefined);
    setCopyWarning(undefined);
  }

  function handleCopy(source: TaskRow) {
    setTitle(source.title);
    setDescription(source.description ?? "");
    setAssigneeType(source.assignee_type);
    setScope(source.scope);
    setRecurrence(source.recurrence);
    setDeadlineRule(source.deadline_rule);

    const sourceAssigneeId = source.assignee_team_id ?? source.assignee_profile_id ?? "";
    const activeOptions = source.assignee_type === "team" ? teams : members;
    const stillActive = activeOptions.some((option) => option.id === sourceAssigneeId);

    if (stillActive) {
      setAssigneeId(sourceAssigneeId);
      setCopyWarning(undefined);
    } else {
      setAssigneeId("");
      setCopyWarning(
        `Copied from "${source.title}", but the original ${source.assignee_type} is archived — pick a new assignee.`,
      );
    }
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
          <div className="flex items-center justify-between gap-4">
            <DialogTitle>{isEdit ? "Edit task" : "New task"}</DialogTitle>
            {!isEdit && allTasksForCopy && allTasksForCopy.length > 0 && (
              <CopyTaskPicker tasks={allTasksForCopy} onCopy={handleCopy} />
            )}
          </div>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-1 py-1">
            {copyWarning && (
              <p role="alert" className="text-sm text-amber-600 dark:text-amber-400">
                {copyWarning}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <AssigneeField
              assigneeType={assigneeType}
              onAssigneeTypeChange={(type) => {
                setAssigneeType(type);
                setAssigneeId("");
              }}
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

            {warning && (
              <AbsenceWarningBanner
                warning={warning}
                assigneeName={assigneeName}
                canCover={isEdit}
                onAssignAndCover={
                  isEdit && warning.longTerm ? () => setAssignAndCoverOpen(true) : undefined
                }
              />
            )}
            {warning?.longTerm && (
              <input
                type="hidden"
                name="absence_warning"
                value={JSON.stringify({ assigneeId, assigneeName, ...warning.longTerm })}
              />
            )}

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

      {isEdit && warning?.longTerm && (
        <AssignAndCoverDialog
          open={assignAndCoverOpen}
          onOpenChange={setAssignAndCoverOpen}
          taskId={task.id}
          rangeStart={warning.longTerm.rangeStart}
          rangeEnd={warning.longTerm.rangeEnd}
          excludeProfileId={assigneeId}
          members={members}
        />
      )}
    </Dialog>
  );
}
