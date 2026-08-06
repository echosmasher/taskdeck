"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DashboardTaskGroup } from "./dashboard-types";

export function DashboardTaskRow({
  group,
  todayISO,
}: {
  group: DashboardTaskGroup;
  todayISO: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const total = group.instances.length;
  const resolved = group.instances.filter((i) => i.status !== "open").length;
  const allResolved = total > 0 && resolved === total;
  const isOverdue = group.dueDate < todayISO && !allResolved;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card",
        allResolved && "border-l-4 border-l-green-500",
        isOverdue && "border-l-4 border-l-destructive",
        !allResolved && !isOverdue && "border-l-4 border-l-transparent",
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 p-4 text-left"
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
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Due {group.dueDate}</p>
        </div>
        <div className="flex w-36 shrink-0 flex-col items-end gap-1.5">
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
      </button>

      {expanded && (
        <ul className="divide-y border-t px-4">
          {group.instances.map((instance) => (
            <li key={instance.instanceId} className="flex items-center justify-between py-2 text-sm">
              <span>{instance.companyName}</span>
              {instance.status === "open" && (
                <span className="text-xs text-muted-foreground">Open</span>
              )}
              {instance.status === "completed" && (
                <span className="text-xs text-green-600">
                  Completed
                  {instance.statusSetByName ? ` — ${instance.statusSetByName}` : ""}
                </span>
              )}
              {instance.status === "na" && (
                <span className="text-xs text-muted-foreground">N/A</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
