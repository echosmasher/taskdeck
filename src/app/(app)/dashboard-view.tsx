"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCheck, Inbox, LayoutList, SearchX, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { type DashboardPeriod, periodRange } from "@/lib/dates";
import { formatShortDate } from "@/lib/due-label";
import { CompleteRemainingDialog } from "./complete-remaining-dialog";
import { DashboardFilters, type DashboardFilterState } from "./dashboard-filters";
import { DashboardTaskRow } from "./dashboard-task-row";
import type {
  CompanyDimensionValues,
  DashboardCompanyInstance,
  DashboardDimensionOption,
  DashboardFilterOption,
  DashboardTaskGroup,
} from "./dashboard-types";
import { MyRequestsPanel } from "./my-requests-panel";
import { NaReasonDialog } from "./na-reason-dialog";
import type { ReassignmentRequestSummary } from "./reassignment-types";
import { RequestReassignmentDialog } from "./request-reassignment-dialog";
import { type GridSort, WorkpaperGrid } from "./workpaper-grid";

type DashboardScope = "mine" | "all";
type DashboardLayout = "grid" | "list";

const EMPTY_FILTERS: DashboardFilterState = { teamId: null, assigneeId: null, dimensionValues: {} };

export function DashboardView({
  currentProfileId,
  isAdmin,
  todayCount,
  overdueCount,
  weekCount,
  todayISO,
  groups,
  teamOptions,
  assigneeOptions,
  dimensionOptions,
  companyDimensionValues,
  myRequests,
  pendingRequestsCount,
}: {
  currentProfileId: string;
  isAdmin: boolean;
  todayCount: number;
  overdueCount: number;
  weekCount: number;
  todayISO: string;
  groups: DashboardTaskGroup[];
  teamOptions: DashboardFilterOption[];
  assigneeOptions: DashboardFilterOption[];
  dimensionOptions: DashboardDimensionOption[];
  companyDimensionValues: CompanyDimensionValues;
  myRequests: ReassignmentRequestSummary[];
  pendingRequestsCount: number;
}) {
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const [scope, setScope] = useState<DashboardScope>("mine");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [filters, setFilters] = useState<DashboardFilterState>(EMPTY_FILTERS);
  const [layout, setLayout] = useState<DashboardLayout>("grid");
  const [sort, setSort] = useState<GridSort>("due");

  // Dialogs live here, once, instead of inside every row, so the grid and
  // the list can share them.
  const [bulkGroup, setBulkGroup] = useState<DashboardTaskGroup | null>(null);
  const [requestGroup, setRequestGroup] = useState<DashboardTaskGroup | null>(null);
  const [naInstance, setNaInstance] = useState<DashboardCompanyInstance | null>(null);

  const range = periodRange(period, todayISO);

  const visible = useMemo(() => {
    const { start, end } = periodRange(period, todayISO);

    const filtered = groups.filter((g) => {
      if (scope === "mine" && !g.isMine) return false;

      const hasOpenOverdueInstance = g.dueDate < todayISO && g.instances.some((i) => i.status === "open");
      if (overdueOnly) {
        if (!hasOpenOverdueInstance) return false;
      } else if (!(hasOpenOverdueInstance || (g.dueDate >= start && g.dueDate <= end))) {
        return false;
      }

      if (scope === "all") {
        if (filters.teamId && g.assigneeTeamId !== filters.teamId) return false;
        if (filters.assigneeId && g.assigneeProfileId !== filters.assigneeId) return false;
        for (const [dimensionId, valueId] of Object.entries(filters.dimensionValues)) {
          if (!valueId) continue;
          const matches = g.instances.some(
            (i) => companyDimensionValues[i.companyId]?.[dimensionId] === valueId,
          );
          if (!matches) return false;
        }
      }

      return true;
    });

    return sort === "title"
      ? [...filtered].sort((a, b) => a.title.localeCompare(b.title) || a.dueDate.localeCompare(b.dueDate))
      : filtered;
  }, [groups, scope, period, todayISO, overdueOnly, filters, companyDimensionValues, sort]);

  const showAssigneePerInstance = scope === "all" && filters.assigneeId === null;
  const hasActiveFilters =
    overdueOnly ||
    !!filters.teamId ||
    !!filters.assigneeId ||
    Object.values(filters.dimensionValues).some(Boolean);

  const periodCaption =
    period === "today"
      ? "Overdue tasks and tasks due today."
      : `Overdue tasks and tasks due ${formatShortDate(range.start)} to ${formatShortDate(range.end)}.`;

  function clearFilters() {
    setOverdueOnly(false);
    setFilters(EMPTY_FILTERS);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <span data-tabular>
              <strong className="font-semibold text-foreground">{todayCount}</strong> due today
            </span>
            <span aria-hidden>·</span>
            {overdueCount > 0 ? (
              <button
                type="button"
                aria-pressed={overdueOnly}
                onClick={() => setOverdueOnly((v) => !v)}
                data-tabular
                className={cn(
                  "rounded-sm border px-1.5 py-0.5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  overdueOnly
                    ? "border-destructive bg-destructive text-white"
                    : "border-destructive/50 text-destructive hover:bg-destructive/10",
                )}
              >
                {overdueCount} overdue{overdueOnly ? " · showing only" : ""}
              </button>
            ) : (
              <span data-tabular>0 overdue</span>
            )}
            <span aria-hidden>·</span>
            <span data-tabular>
              <strong className="font-semibold text-foreground">{weekCount}</strong> later this week
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <Tabs value={scope} onValueChange={(v) => setScope(v as DashboardScope)}>
          <TabsList>
            <TabsTrigger value="mine">My tasks</TabsTrigger>
            <TabsTrigger value="all">All tasks</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as DashboardPeriod)}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">This week</TabsTrigger>
              <TabsTrigger value="month">This month</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="hidden items-center rounded-lg bg-muted p-[3px] lg:inline-flex" role="group" aria-label="Layout">
            <LayoutToggle active={layout === "grid"} onClick={() => setLayout("grid")} label="Workpaper grid">
              <Table2 />
            </LayoutToggle>
            <LayoutToggle active={layout === "list"} onClick={() => setLayout("list")} label="Task list">
              <LayoutList />
            </LayoutToggle>
          </div>
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">{periodCaption}</p>

      {scope === "all" && (
        <DashboardFilters
          teamOptions={teamOptions}
          assigneeOptions={assigneeOptions}
          dimensionOptions={dimensionOptions}
          value={filters}
          onChange={setFilters}
        />
      )}

      {!isAdmin && <MyRequestsPanel requests={myRequests} />}

      {isAdmin && pendingRequestsCount > 0 && (
        <Link
          href="/requests"
          className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <Inbox className="size-4" aria-hidden />
          {pendingRequestsCount} reassignment {pendingRequestsCount === 1 ? "request" : "requests"}{" "}
          awaiting your decision
        </Link>
      )}

      {visible.length === 0 ? (
        <EmptyState
          filtered={hasActiveFilters}
          period={period}
          onClear={clearFilters}
          onWeek={() => setPeriod("week")}
        />
      ) : (
        <>
          <div className={cn(layout === "list" ? "hidden" : "hidden lg:block")}>
            <WorkpaperGrid
              groups={visible}
              todayISO={todayISO}
              isAdmin={isAdmin}
              sort={sort}
              onSortChange={setSort}
              onBulk={setBulkGroup}
              onRequest={setRequestGroup}
              onNa={setNaInstance}
            />
          </div>
          <div className={cn("flex flex-col gap-2.5", layout === "grid" ? "lg:hidden" : "")}>
            {visible.map((group) => (
              <DashboardTaskRow
                key={group.key}
                group={group}
                todayISO={todayISO}
                currentProfileId={currentProfileId}
                isAdmin={isAdmin}
                showAssignee={showAssigneePerInstance}
                onBulk={setBulkGroup}
                onRequest={setRequestGroup}
                onNa={setNaInstance}
              />
            ))}
          </div>
        </>
      )}

      {bulkGroup && (
        <CompleteRemainingDialog
          open
          onOpenChange={(o) => !o && setBulkGroup(null)}
          taskTitle={bulkGroup.title}
          openInstances={bulkGroup.instances
            .filter((i) => i.status === "open")
            .map((i) => ({ instanceId: i.instanceId, companyName: i.companyName }))}
        />
      )}
      {requestGroup && (
        <RequestReassignmentDialog
          open
          onOpenChange={(o) => !o && setRequestGroup(null)}
          taskId={requestGroup.taskId}
          taskTitle={requestGroup.title}
          instances={requestGroup.instances.map((i) => ({
            instanceId: i.instanceId,
            companyName: i.companyName,
            isMine: i.isMine,
          }))}
          assigneeOptions={assigneeOptions}
        />
      )}
      {naInstance && (
        <NaReasonDialog
          open
          onOpenChange={(o) => !o && setNaInstance(null)}
          instanceId={naInstance.instanceId}
          companyName={naInstance.companyName}
        />
      )}
    </div>
  );
}

function LayoutToggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex size-[26px] items-center justify-center rounded-md text-foreground/60 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-4",
        active && "bg-background text-foreground shadow-sm",
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({
  filtered,
  period,
  onClear,
  onWeek,
}: {
  filtered: boolean;
  period: DashboardPeriod;
  onClear: () => void;
  onWeek: () => void;
}) {
  if (filtered) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-dashed bg-card px-6 py-12 text-center">
        <SearchX className="size-6 text-muted-foreground" aria-hidden />
        <p className="font-medium">No tasks match these filters</p>
        <p className="text-sm text-muted-foreground">Filters are hiding everything in this period.</p>
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed bg-card px-6 py-12 text-center">
      <CheckCheck className="size-6 text-tick" aria-hidden />
      <p className="font-medium">All caught up</p>
      <p className="text-sm text-muted-foreground">
        Nothing is open {period === "today" ? "today" : period === "week" ? "this week" : "this month"}.
      </p>
      {period === "today" && (
        <Button variant="outline" size="sm" onClick={onWeek}>
          See this week
        </Button>
      )}
    </div>
  );
}
