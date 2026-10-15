"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TickMark } from "@/components/tick-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardCompanyInstance, DashboardTaskGroup } from "./dashboard-types";
import { useInstanceActions } from "./instance-actions";
import {
  DueLabel,
  groupProgress,
  RowMenu,
  StampStrip,
  StatusMark,
  stampText,
  stampTitle,
} from "./workpaper-parts";

/**
 * Task-first view: one row per task, companies listed beneath it. This is
 * the default on narrow screens and the alternate to the workpaper grid
 * on wide ones.
 */
export function DashboardTaskRow({
  group,
  todayISO,
  currentProfileId,
  isAdmin,
  showAssignee = false,
  onBulk,
  onRequest,
  onNa,
}: {
  group: DashboardTaskGroup;
  todayISO: string;
  currentProfileId: string;
  isAdmin: boolean;
  showAssignee?: boolean;
  onBulk: (group: DashboardTaskGroup) => void;
  onRequest: (group: DashboardTaskGroup) => void;
  onNa: (instance: DashboardCompanyInstance) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { total, resolved, open, allResolved } = groupProgress(group);

  return (
    <div data-testid="task-row" data-task-title={group.title} className="rounded-md border bg-card">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex min-h-11 min-w-0 flex-1 items-start gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-medium">{group.title}</span>
              {group.assigneeChip && (
                <span className="rounded-sm bg-secondary px-1.5 text-xs text-secondary-foreground">
                  {group.assigneeChip}
                </span>
              )}
              {group.scopeChips.map((chip) => (
                <span key={chip} className="rounded-sm border px-1.5 text-xs text-muted-foreground">
                  {chip}
                </span>
              ))}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <DueLabel group={group} todayISO={todayISO} />
              <StampStrip group={group} />
              <span data-tabular className="font-mono text-xs text-muted-foreground">
                {resolved}/{total} stamped
              </span>
            </span>
          </span>
        </button>

        <div className="flex items-center gap-1.5 sm:shrink-0">
          {allResolved ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-tick">
              <TickMark className="size-3.5" strokeWidth={3} />
              All stamped
            </span>
          ) : (
            <Button className="h-11 flex-1 sm:h-8 sm:flex-none" onClick={() => onBulk(group)}>
              Complete remaining ({open})
            </Button>
          )}
          <RowMenu group={group} isAdmin={isAdmin} onRequest={onRequest} />
        </div>
      </div>

      {expanded && (
        <ul className="divide-y border-t px-3 sm:px-4">
          {group.instances.map((instance) => (
            <InstanceRow
              key={instance.instanceId}
              instance={instance}
              currentProfileId={currentProfileId}
              originalAssigneeLabel={group.originalAssigneeLabel}
              showAssignee={showAssignee}
              onNa={onNa}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function InstanceRow({
  instance,
  currentProfileId,
  originalAssigneeLabel,
  showAssignee,
  onNa,
}: {
  instance: DashboardCompanyInstance;
  currentProfileId: string;
  originalAssigneeLabel: string;
  showAssignee: boolean;
  onNa: (instance: DashboardCompanyInstance) => void;
}) {
  const { isPending, complete, reopen } = useInstanceActions(instance);

  const overrideLabel = instance.isOverride
    ? instance.effectiveAssigneeProfileId === currentProfileId
      ? `Covering for ${originalAssigneeLabel}`
      : `Covered by ${instance.effectiveAssigneeName ?? "someone"}`
    : null;
  const assigneeLabel = !overrideLabel && showAssignee
    ? (instance.effectiveAssigneeName ?? originalAssigneeLabel)
    : null;

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-2.5">
        <StatusMark status={instance.status} />
        <span className="font-medium">{instance.companyName}</span>
        {[overrideLabel, assigneeLabel, instance.pendingReassignmentRequestId && "Reassignment requested"]
          .filter(Boolean)
          .map((text) => (
            <span key={text} className="rounded-sm border px-1.5 text-xs text-muted-foreground">
              {text}
            </span>
          ))}
      </div>

      {instance.status === "open" ? (
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-11 sm:h-7" disabled={isPending} onClick={() => onNa(instance)}>
            N/A
          </Button>
          <Button size="sm" className="h-11 sm:h-7" disabled={isPending} onClick={complete}>
            Complete
          </Button>
        </div>
      ) : (
        <div className="flex w-full items-center justify-between gap-2 pl-[1.625rem] sm:ml-auto sm:w-auto sm:justify-end sm:pl-0">
          <span
            data-tabular
            title={stampTitle(instance)}
            className={cn(
              "font-mono text-xs",
              instance.status === "completed" ? "text-tick" : "text-foreground/80",
            )}
          >
            {instance.status === "completed" ? "Stamped" : "N/A"} {stampText(instance)}
            {instance.naReason ? ` · ${instance.naReason}` : ""}
          </span>
          <Button size="sm" variant="ghost" className="h-11 sm:h-7" disabled={isPending} onClick={reopen}>
            Reopen
          </Button>
        </div>
      )}
    </li>
  );
}
