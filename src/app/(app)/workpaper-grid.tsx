"use client";

import { ArrowRightLeft, ChevronsUpDown, MoreVertical, UserCheck } from "lucide-react";
import { TickMark } from "@/components/tick-mark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { DashboardCompanyInstance, DashboardTaskGroup } from "./dashboard-types";
import { useInstanceActions } from "./instance-actions";
import {
  DueLabel,
  groupProgress,
  RowMenu,
  StatusMark,
  stampText,
  stampTitle,
} from "./workpaper-parts";

export type GridSort = "due" | "title";

interface GridProps {
  groups: DashboardTaskGroup[];
  todayISO: string;
  isAdmin: boolean;
  sort: GridSort;
  onSortChange: (sort: GridSort) => void;
  onBulk: (group: DashboardTaskGroup) => void;
  onRequest: (group: DashboardTaskGroup) => void;
  onNa: (instance: DashboardCompanyInstance) => void;
}

export function WorkpaperGrid({
  groups,
  todayISO,
  isAdmin,
  sort,
  onSortChange,
  onBulk,
  onRequest,
  onNa,
}: GridProps) {
  const companies = [
    ...new Map(
      groups.flatMap((g) => g.instances.map((i) => [i.companyId, i.companyName] as const)),
    ).entries(),
  ]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="relative max-h-[calc(100vh-13rem)] min-h-64 overflow-auto rounded-md border bg-card">
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <caption className="sr-only">Tasks by company. Each cell is stamped with initials and date.</caption>
        <thead>
          <tr>
            <th
              scope="col"
              aria-sort={sort === "due" ? "ascending" : "none"}
              className="sticky top-0 left-0 z-30 min-w-[16rem] border-r border-b bg-card px-3 py-2 text-left text-xs font-semibold"
            >
              <button
                type="button"
                onClick={() => onSortChange(sort === "due" ? "title" : "due")}
                className="inline-flex items-center gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Task · sorted by {sort === "due" ? "due date" : "name"}
                <ChevronsUpDown className="size-3 text-muted-foreground" aria-hidden />
              </button>
            </th>
            {companies.map((c) => (
              <th
                key={c.id}
                scope="col"
                className="sticky top-0 z-20 w-[5.25rem] min-w-[5.25rem] border-b bg-card px-1.5 py-2 text-center align-bottom text-xs font-medium text-muted-foreground"
              >
                <span className="line-clamp-2 leading-tight" title={c.name}>
                  {c.name}
                </span>
              </th>
            ))}
            <th
              scope="col"
              className="sticky top-0 right-0 z-30 min-w-[10.5rem] border-b border-l bg-card px-3 py-2 text-right text-xs font-semibold"
            >
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const byCompany = new Map(group.instances.map((i) => [i.companyId, i]));
            const { total, resolved, open, allResolved } = groupProgress(group);
            return (
              <tr key={group.key} data-testid="task-row" data-task-title={group.title} className="group/row">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-r border-b bg-card px-3 py-2.5 text-left font-normal"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
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
                  </div>
                  <div className="mt-0.5 flex items-center gap-3">
                    <DueLabel group={group} todayISO={todayISO} />
                    <span data-tabular className="font-mono text-xs text-muted-foreground">
                      {resolved}/{total} stamped
                    </span>
                  </div>
                </th>
                {companies.map((c) => {
                  const instance = byCompany.get(c.id);
                  return (
                    <td key={c.id} className="border-b p-0 text-center">
                      {instance ? (
                        <GridCell
                          instance={instance}
                          taskTitle={group.title}
                          onNa={onNa}
                        />
                      ) : (
                        <span className="block py-3 text-muted-foreground/50" title="Not in this task's scope">
                          <span aria-hidden>–</span>
                          <span className="sr-only">Not in scope</span>
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="sticky right-0 z-10 border-b border-l bg-card px-3 py-2">
                  <div className="flex items-center justify-end gap-1.5">
                    {allResolved ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-tick">
                        <TickMark className="size-3.5" strokeWidth={3} />
                        All stamped
                      </span>
                    ) : (
                      <Button size="sm" onClick={() => onBulk(group)} aria-label={`Complete remaining (${open}) for ${group.title}`}>
                        Complete ({open})
                      </Button>
                    )}
                    <RowMenu group={group} isAdmin={isAdmin} onRequest={onRequest} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Legend hint={companies.length > 7} />
    </div>
  );
}

function GridCell({
  instance,
  taskTitle,
  onNa,
}: {
  instance: DashboardCompanyInstance;
  taskTitle: string;
  onNa: (instance: DashboardCompanyInstance) => void;
}) {
  const { isPending, complete, reopen } = useInstanceActions(instance);
  const label = `${instance.companyName}, ${taskTitle}`;
  const isOpen = instance.status === "open";

  return (
    <div className="group/cell relative flex min-h-[3.25rem] items-center justify-center">
      {isOpen ? (
        <button
          type="button"
          disabled={isPending}
          onClick={complete}
          aria-label={`Stamp complete: ${label}`}
          title="Stamp complete"
          className="flex h-9 w-14 items-center justify-center rounded-sm outline-none hover:bg-tick/10 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <StatusMark status="open" className="size-5" />
        </button>
      ) : (
        <div
          title={`${instance.status === "na" ? `N/A${instance.naReason ? `: ${instance.naReason}` : ""}. ` : ""}${stampTitle(instance)}`}
          className="flex flex-col items-center gap-0.5 py-1.5"
        >
          <StatusMark status={instance.status} />
          <span data-tabular className="font-mono text-xs leading-none text-foreground/80">
            {stampText(instance)}
          </span>
          <span className="sr-only">
            {instance.status === "na" ? "Not applicable" : "Completed"}: {label}
            {instance.naReason ? `, reason: ${instance.naReason}` : ""}. {stampTitle(instance)}
          </span>
        </div>
      )}

      {(instance.isOverride || instance.pendingReassignmentRequestId) && (
        <span
          className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-primary"
          title={instance.pendingReassignmentRequestId ? "Reassignment requested" : "Covering assignment"}
        >
          {instance.pendingReassignmentRequestId ? (
            <ArrowRightLeft className="size-3.5" aria-label="Reassignment requested" />
          ) : (
            <UserCheck className="size-3.5" aria-label="Covering assignment" />
          )}
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              disabled={isPending}
              className={cn(
                "absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded-sm text-muted-foreground outline-none",
                "opacity-0 group-hover/cell:opacity-100 group-focus-within/cell:opacity-100 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
              )}
            />
          }
          aria-label={`Options for ${label}`}
        >
          <MoreVertical className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isOpen ? (
            <DropdownMenuItem onClick={() => onNa(instance)}>Mark N/A…</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={reopen}>Reopen</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Legend({ hint }: { hint: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t px-3 py-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Key</span>
      <span className="inline-flex items-center gap-1.5">
        <StatusMark status="completed" /> stamped with initials and date
      </span>
      <span className="inline-flex items-center gap-1.5">
        <StatusMark status="na" /> not applicable
      </span>
      <span className="inline-flex items-center gap-1.5">
        <StatusMark status="open" /> open, click to stamp
      </span>
      {hint && <span className="ml-auto">Scroll sideways for more companies</span>}
    </div>
  );
}
