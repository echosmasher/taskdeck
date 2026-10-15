"use client";

import { Clock, MoreHorizontal } from "lucide-react";
import { TickMark } from "@/components/tick-mark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { dueDDMM, dueLabel, formatShortDate, initialsOf, stampDate } from "@/lib/due-label";
import { formatLongDate } from "@/lib/dates";
import type { DashboardCompanyInstance, DashboardTaskGroup } from "./dashboard-types";

export function groupProgress(group: DashboardTaskGroup) {
  const total = group.instances.length;
  const resolved = group.instances.filter((i) => i.status !== "open").length;
  return { total, resolved, open: total - resolved, allResolved: total > 0 && resolved === total };
}

export function isGroupOverdue(group: DashboardTaskGroup, todayISO: string) {
  return group.dueDate < todayISO && !groupProgress(group).allResolved;
}

export function DueLabel({ group, todayISO }: { group: DashboardTaskGroup; todayISO: string }) {
  const overdue = isGroupOverdue(group, todayISO);
  const label = dueLabel(group.dueDate, todayISO);
  // Far-future labels already print the date; the mono form would repeat it.
  const showMono = !label.includes(formatShortDate(group.dueDate));
  return (
    <span
      title={formatLongDate(group.dueDate)}
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        overdue ? "font-medium text-destructive" : "text-muted-foreground",
      )}
    >
      {overdue && <Clock className="size-3" aria-hidden />}
      {label}
      {showMono && (
        <span data-tabular className="font-mono text-[11px] text-muted-foreground">
          {dueDDMM(group.dueDate)}
        </span>
      )}
    </span>
  );
}

/** "OL 15.10", the sign-off every stamped cell carries. */
export function stampText(instance: DashboardCompanyInstance): string {
  if (!instance.statusSetAt) return "";
  return `${initialsOf(instance.statusSetByName)} ${stampDate(instance.statusSetAt)}`;
}

export function stampTitle(instance: DashboardCompanyInstance): string {
  if (!instance.statusSetAt) return "";
  const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(instance.statusSetAt),
  );
  return `${instance.statusSetByName ?? "Someone"}, ${when}`;
}

/** The tick, the circled n/a, or the empty dashed box. Form carries state; colour only reinforces it. */
export function StatusMark({
  status,
  className,
}: {
  status: DashboardCompanyInstance["status"];
  className?: string;
}) {
  if (status === "completed") {
    return <TickMark className={cn("size-4 text-tick", className)} />;
  }
  if (status === "na") {
    return (
      <span
        aria-hidden
        className={cn(
          "rounded-full border border-destructive px-1.5 text-[11px] leading-4 font-medium text-destructive",
          className,
        )}
      >
        n/a
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "block size-4 rounded-[3px] border border-dashed border-muted-foreground/80",
        className,
      )}
    />
  );
}

/** One small mark per company: the shape of progress without a progress bar. */
export function StampStrip({ group }: { group: DashboardTaskGroup }) {
  const { total, resolved } = groupProgress(group);
  return (
    <span
      role="img"
      aria-label={`${resolved} of ${total} stamped`}
      className="inline-flex flex-wrap items-center gap-[3px]"
    >
      {group.instances.map((i) => (
        <span
          key={i.instanceId}
          aria-hidden
          className={cn(
            "size-2.5 rounded-[2px] border",
            i.status === "completed" && "border-tick bg-tick",
            i.status === "na" && "border-destructive [background:linear-gradient(to_top_right,transparent_42%,var(--destructive)_42%,var(--destructive)_58%,transparent_58%)]",
            i.status === "open" && "border-dashed border-muted-foreground/70",
          )}
        />
      ))}
    </span>
  );
}

export function RowMenu({
  group,
  isAdmin,
  onRequest,
}: {
  group: DashboardTaskGroup;
  isAdmin: boolean;
  onRequest: (group: DashboardTaskGroup) => void;
}) {
  const requested = !!group.pendingTaskReassignmentRequestId;
  if (isAdmin) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" className="size-11 lg:size-7" />}
        aria-label={`More actions for ${group.title}`}
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={requested} onClick={() => onRequest(group)}>
          {requested ? "Reassignment requested" : "Request reassignment"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
