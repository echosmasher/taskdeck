"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type DashboardPeriod, periodRange } from "@/lib/dates";
import { DashboardTaskRow } from "./dashboard-task-row";
import type { DashboardTaskGroup } from "./dashboard-types";

type DashboardScope = "mine" | "all";

export function DashboardView({
  firstName,
  todayCount,
  todayISO,
  groups,
}: {
  firstName: string;
  todayCount: number;
  todayISO: string;
  groups: DashboardTaskGroup[];
}) {
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const [scope, setScope] = useState<DashboardScope>("mine");

  const visible = useMemo(() => {
    const { start, end } = periodRange(period, todayISO);
    return groups.filter((g) => {
      if (scope === "mine" && !g.isMine) return false;
      const isOpenOverdue = g.dueDate < todayISO && g.instances.some((i) => i.status === "open");
      return isOpenOverdue || (g.dueDate >= start && g.dueDate <= end);
    });
  }, [groups, scope, period, todayISO]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Hello {firstName}!</h1>
        <p className="text-muted-foreground">
          You have {todayCount} {todayCount === 1 ? "task" : "tasks"} to complete today.
        </p>
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

      <div className="flex flex-col gap-3">
        {visible.length === 0 && (
          <p className="text-muted-foreground">No tasks in this view.</p>
        )}
        {visible.map((group) => (
          <DashboardTaskRow key={group.key} group={group} todayISO={todayISO} />
        ))}
      </div>
    </div>
  );
}
