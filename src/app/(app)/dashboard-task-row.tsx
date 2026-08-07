"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { completeInstanceAction, reopenInstanceAction } from "./actions";
import { CompleteRemainingDialog } from "./complete-remaining-dialog";
import type { DashboardCompanyInstance, DashboardFilterOption, DashboardTaskGroup } from "./dashboard-types";
import { NaReasonDialog } from "./na-reason-dialog";
import { RequestReassignmentDialog } from "./request-reassignment-dialog";

function formatStamp(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}

export function DashboardTaskRow({
  group,
  todayISO,
  currentProfileId,
  isAdmin,
  assigneeOptions,
}: {
  group: DashboardTaskGroup;
  todayISO: string;
  currentProfileId: string;
  isAdmin: boolean;
  assigneeOptions: DashboardFilterOption[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  const total = group.instances.length;
  const resolved = group.instances.filter((i) => i.status !== "open").length;
  const allResolved = total > 0 && resolved === total;
  const isOverdue = group.dueDate < todayISO && !allResolved;
  const openInstances = group.instances.filter((i) => i.status === "open");

  return (
    <div
      className={cn(
        "rounded-lg border bg-card",
        allResolved && "border-l-4 border-l-green-500",
        isOverdue && "border-l-4 border-l-destructive",
        !allResolved && !isOverdue && "border-l-4 border-l-transparent",
      )}
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex min-w-0 items-center gap-3 text-left sm:flex-1"
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{group.title}</span>
              {group.assigneeChip && <Badge variant="secondary">{group.assigneeChip}</Badge>}
              {group.scopeChips.map((chip) => (
                <Badge key={chip} variant="outline">
                  {chip}
                </Badge>
              ))}
              {isOverdue && <Badge variant="destructive">Overdue</Badge>}
              {group.pendingTaskReassignmentRequestId && (
                <Badge variant="outline">Reassignment requested</Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Due {group.dueDate}</p>
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-3 sm:shrink-0 sm:justify-end">
          {!isAdmin && !group.pendingTaskReassignmentRequestId && (
            <Button size="sm" variant="ghost" onClick={() => setRequestOpen(true)}>
              Request reassignment
            </Button>
          )}

          {!allResolved && total > 0 && (
            <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
              Complete remaining
            </Button>
          )}

          <div className="flex w-full shrink-0 flex-col items-end gap-1.5 sm:w-36">
            <span className="text-sm text-muted-foreground">
              {resolved}/{total} companies
            </span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", allResolved ? "bg-green-500" : "bg-primary")}
                style={{ width: `${total > 0 ? (resolved / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <ul className="divide-y border-t px-4">
          {group.instances.map((instance) => (
            <InstanceRow
              key={instance.instanceId}
              instance={instance}
              currentProfileId={currentProfileId}
              originalAssigneeLabel={group.originalAssigneeLabel}
            />
          ))}
        </ul>
      )}

      <CompleteRemainingDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        taskTitle={group.title}
        openInstances={openInstances.map((i) => ({
          instanceId: i.instanceId,
          companyName: i.companyName,
        }))}
      />

      <RequestReassignmentDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        taskId={group.taskId}
        taskTitle={group.title}
        instances={group.instances.map((i) => ({
          instanceId: i.instanceId,
          companyName: i.companyName,
          isMine: i.isMine,
        }))}
        assigneeOptions={assigneeOptions}
      />
    </div>
  );
}

function InstanceRow({
  instance,
  currentProfileId,
  originalAssigneeLabel,
}: {
  instance: DashboardCompanyInstance;
  currentProfileId: string;
  originalAssigneeLabel: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [naDialogOpen, setNaDialogOpen] = useState(false);

  function handleComplete() {
    startTransition(async () => {
      const result = await completeInstanceAction(instance.instanceId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${instance.companyName} marked complete`);
    });
  }

  function handleReopen() {
    startTransition(async () => {
      const result = await reopenInstanceAction(instance.instanceId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${instance.companyName} reopened`);
    });
  }

  const stamp =
    instance.statusSetAt &&
    `${instance.statusSetByName ?? "Someone"}, ${formatStamp(instance.statusSetAt)}`;

  const overrideLabel = instance.isOverride
    ? instance.effectiveAssigneeProfileId === currentProfileId
      ? `Covering for ${originalAssigneeLabel}`
      : `Covered by ${instance.effectiveAssigneeName ?? "someone"}`
    : null;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span>{instance.companyName}</span>
        {overrideLabel && (
          <Badge variant="outline" className="text-xs">
            {overrideLabel}
          </Badge>
        )}
        {instance.pendingReassignmentRequestId && (
          <Badge variant="outline" className="text-xs">
            Reassignment requested
          </Badge>
        )}
      </div>

      {instance.status === "open" && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => setNaDialogOpen(true)}
          >
            N/A
          </Button>
          <Button size="sm" disabled={isPending} onClick={handleComplete}>
            Complete
          </Button>
        </div>
      )}

      {instance.status === "completed" && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-green-600">Completed{stamp ? ` — ${stamp}` : ""}</span>
          <Button size="sm" variant="ghost" disabled={isPending} onClick={handleReopen}>
            Reopen
          </Button>
        </div>
      )}

      {instance.status === "na" && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            N/A{stamp ? ` — ${stamp}` : ""}
            {instance.naReason ? ` (${instance.naReason})` : ""}
          </span>
          <Button size="sm" variant="ghost" disabled={isPending} onClick={handleReopen}>
            Reopen
          </Button>
        </div>
      )}

      <NaReasonDialog
        open={naDialogOpen}
        onOpenChange={setNaDialogOpen}
        instanceId={instance.instanceId}
        companyName={instance.companyName}
      />
    </li>
  );
}
