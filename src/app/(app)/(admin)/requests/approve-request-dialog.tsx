"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { computeAssignmentWarning } from "@/lib/tasks/assignment-warning";
import { AbsenceWarningBanner } from "../tasks/absence-warning-banner";
import type { AbsenceWarningContext, MemberOption } from "../tasks/types";
import { approveReassignmentRequestAction } from "./actions";
import type { RequestRow } from "./types";

export function ApproveRequestDialog({
  open,
  onOpenChange,
  request,
  memberOptions,
  absenceWarningContext,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RequestRow;
  memberOptions: MemberOption[];
  absenceWarningContext: AbsenceWarningContext;
}) {
  const [assigneeId, setAssigneeId] = useState(request.suggestedAssigneeProfileId ?? "");
  const [decisionNote, setDecisionNote] = useState("");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const warning = useMemo(() => {
    if (!assigneeId || !request.taskRecurrence) return null;
    return computeAssignmentWarning({
      recurrence: request.taskRecurrence,
      deadlineRule: request.taskDeadlineRule,
      scope: request.taskScope,
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
  }, [assigneeId, request, absenceWarningContext]);

  const assigneeName = memberOptions.find((m) => m.id === assigneeId)?.label ?? "This person";

  function handleConfirm() {
    if (!assigneeId) {
      setError("Choose who this should be assigned to.");
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const result = await approveReassignmentRequestAction(request.id, assigneeId, decisionNote);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Request approved");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve reassignment — {request.taskTitle}</DialogTitle>
          <DialogDescription>
            {request.scope === "task"
              ? "Updates the task definition's assignee. Past instances are untouched."
              : "Sets an instance-level override on the requested companies only."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="new-assignee">New assignee</Label>
          <Select value={assigneeId} onValueChange={(v) => setAssigneeId(v ?? "")}>
            <SelectTrigger id="new-assignee" className="w-full">
              <SelectValue>
                {(v: string) => memberOptions.find((m) => m.id === v)?.label ?? "Select…"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {memberOptions.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                  {m.id === request.suggestedAssigneeProfileId ? " (suggested)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {warning && (
          <AbsenceWarningBanner warning={warning} assigneeName={assigneeName} canCover={false} />
        )}

        <div className="space-y-2">
          <Label htmlFor="approve-note">Decision note (optional)</Label>
          <Input id="approve-note" value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isPending} onClick={handleConfirm}>
            {isPending ? "Approving…" : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
