"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { type DashboardPeriod, periodRange } from "@/lib/dates";
import { DashboardFilters, type DashboardFilterState } from "./dashboard-filters";
import { DashboardTaskRow } from "./dashboard-task-row";
import type {
  CompanyDimensionValues,
  DashboardDimensionOption,
  DashboardFilterOption,
  DashboardTaskGroup,
} from "./dashboard-types";
import { MyRequestsPanel } from "./my-requests-panel";
import type { ReassignmentRequestSummary } from "./reassignment-types";

type DashboardScope = "mine" | "all";

const EMPTY_FILTERS: DashboardFilterState = { teamId: null, assigneeId: null, dimensionValues: {} };

export function DashboardView({
  currentProfileId,
  isAdmin,
  firstName,
  todayCount,
  overdueCount,
  todayISO,
  groups,
  teamOptions,
  assigneeOptions,
  dimensionOptions,
  companyDimensionValues,
  myRequests,
}: {
  currentProfileId: string;
  isAdmin: boolean;
  firstName: string;
  todayCount: number;
  overdueCount: number;
  todayISO: string;
  groups: DashboardTaskGroup[];
  teamOptions: DashboardFilterOption[];
  assigneeOptions: DashboardFilterOption[];
  dimensionOptions: DashboardDimensionOption[];
  companyDimensionValues: CompanyDimensionValues;
  myRequests: ReassignmentRequestSummary[];
}) {
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const [scope, setScope] = useState<DashboardScope>("mine");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [filters, setFilters] = useState<DashboardFilterState>(EMPTY_FILTERS);

  const visible = useMemo(() => {
    const { start, end } = periodRange(period, todayISO);

    return groups.filter((g) => {
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
  }, [groups, scope, period, todayISO, overdueOnly, filters, companyDimensionValues]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Hello {firstName}!</h1>
          <p className="text-muted-foreground">
            You have {todayCount} {todayCount === 1 ? "task" : "tasks"} to complete today.
          </p>
        </div>
        {overdueCount > 0 && (
          <button
            type="button"
            onClick={() => setOverdueOnly((v) => !v)}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
              overdueOnly
                ? "border-destructive bg-destructive text-white"
                : "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20",
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            You have {overdueCount} overdue {overdueCount === 1 ? "task" : "tasks"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs value={scope} onValueChange={(v) => setScope(v as DashboardScope)}>
          <TabsList>
            <TabsTrigger value="mine">My tasks</TabsTrigger>
            <TabsTrigger value="all">All tasks</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as DashboardPeriod)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This week</TabsTrigger>
            <TabsTrigger value="month">This month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

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

      <div className="flex flex-col gap-3">
        {visible.length === 0 && (
          <p className="text-muted-foreground">No tasks in this view.</p>
        )}
        {visible.map((group) => (
          <DashboardTaskRow
            key={group.key}
            group={group}
            todayISO={todayISO}
            currentProfileId={currentProfileId}
            isAdmin={isAdmin}
            assigneeOptions={assigneeOptions}
          />
        ))}
      </div>
    </div>
  );
}
