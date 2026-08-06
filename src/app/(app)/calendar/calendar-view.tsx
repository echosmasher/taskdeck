"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addDays, addMonths, datesInRange, monthRange, weekRange } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { CalendarCell } from "./calendar-cell";
import { CalendarLegend } from "./calendar-legend";
import type { CalendarMember, CalendarTeam, CalendarEntryStatus } from "./types";

type ViewMode = "day" | "week" | "month";
type SortMode = "team" | "name";

const NO_TEAM_KEY = "__no_team__";

function sortStorageKey(profileId: string): string {
  return `taskdeck.calendar.sort.${profileId}`;
}

function formatColumnHeader(dateISO: string, viewMode: ViewMode): { top: string; bottom: string } {
  const date = new Date(`${dateISO}T00:00:00Z`);
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: "UTC" }).format(date);
  const day = String(date.getUTCDate());
  if (viewMode === "month") return { top: weekday[0], bottom: day };
  return { top: weekday, bottom: day };
}

function formatRangeLabel(dates: string[], viewMode: ViewMode): string {
  if (viewMode === "day") {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeZone: "UTC" }).format(
      new Date(`${dates[0]}T00:00:00Z`),
    );
  }
  if (viewMode === "month") {
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: "UTC" }).format(
      new Date(`${dates[0]}T00:00:00Z`),
    );
  }
  const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
  return `${fmt.format(new Date(`${dates[0]}T00:00:00Z`))} – ${fmt.format(new Date(`${dates[dates.length - 1]}T00:00:00Z`))}`;
}

export function CalendarView({
  currentProfileId,
  isAdmin,
  todayISO,
  members,
  teams,
  entries,
}: {
  currentProfileId: string;
  isAdmin: boolean;
  todayISO: string;
  members: CalendarMember[];
  teams: CalendarTeam[];
  entries: { profile_id: string; date: string; status: CalendarEntryStatus }[];
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(todayISO);
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());

  useEffect(() => {
    // localStorage doesn't exist during SSR, so this can't be a lazy
    // useState initializer — reading it has to happen post-mount. One
    // setState here is the unavoidable cost of hydrating a preference
    // from a client-only store (spec §7.6: "persisted per user").
    const saved = localStorage.getItem(sortStorageKey(currentProfileId));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "team" || saved === "name") setSortMode(saved);
  }, [currentProfileId]);

  function changeSortMode(next: SortMode) {
    setSortMode(next);
    localStorage.setItem(sortStorageKey(currentProfileId), next);
  }

  const dates = useMemo(() => {
    if (viewMode === "day") return [anchor];
    if (viewMode === "week") {
      const { start, end } = weekRange(anchor);
      return datesInRange(start, end);
    }
    const { start, end } = monthRange(anchor);
    return datesInRange(start, end);
  }, [viewMode, anchor]);

  function navigate(direction: 1 | -1) {
    if (viewMode === "day") setAnchor((d) => addDays(d, direction));
    else if (viewMode === "week") setAnchor((d) => addDays(d, direction * 7));
    else setAnchor((d) => addMonths(d, direction));
  }

  const entriesByMember = useMemo(() => {
    const map = new Map<string, Record<string, CalendarEntryStatus>>();
    for (const e of entries) {
      const existing = map.get(e.profile_id);
      if (existing) existing[e.date] = e.status;
      else map.set(e.profile_id, { [e.date]: e.status });
    }
    return map;
  }, [entries]);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name)),
    [members],
  );

  const teamGroups = useMemo(() => {
    if (sortMode !== "team") return null;
    const groups = new Map<string, { name: string; members: CalendarMember[] }>();
    for (const team of [...teams].sort((a, b) => a.name.localeCompare(b.name))) {
      groups.set(team.id, { name: team.name, members: [] });
    }
    for (const member of sortedMembers) {
      const key = member.teamId ?? NO_TEAM_KEY;
      const existing = groups.get(key);
      if (existing) existing.members.push(member);
      else groups.set(key, { name: "No team", members: [member] });
    }
    // "No team" sorts last regardless of where it landed above.
    const groupEntries = [...groups.entries()];
    groupEntries.sort((a, b) => {
      if (a[0] === NO_TEAM_KEY) return 1;
      if (b[0] === NO_TEAM_KEY) return -1;
      return a[1].name.localeCompare(b[1].name);
    });
    return groupEntries;
  }, [sortMode, teams, sortedMembers]);

  function toggleTeamCollapsed(key: string) {
    setCollapsedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const gridTemplateColumns = `220px repeat(${dates.length}, minmax(44px, 1fr))`;

  function renderMemberRow(member: CalendarMember) {
    const memberEntries = entriesByMember.get(member.id) ?? {};
    return (
      <div
        key={member.id}
        className="contents"
      >
        <div className="sticky left-0 flex items-center border-b bg-background px-3 py-2 text-sm">
          {member.name}
          <span className="ml-1 text-muted-foreground">
            — {member.teamName ?? "No team"}
          </span>
        </div>
        {dates.map((date) => (
          <div key={date} className="flex items-center border-b p-1">
            <CalendarCell
              profileId={member.id}
              date={date}
              status={memberEntries[date]}
              editable={isAdmin}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setAnchor(todayISO)}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 font-medium">{formatRangeLabel(dates, viewMode)}</span>
        </div>

        <div className="flex items-center gap-3">
          <Tabs value={sortMode} onValueChange={(v) => changeSortMode(v as SortMode)}>
            <TabsList>
              <TabsTrigger value="name">By name</TabsTrigger>
              <TabsTrigger value="team">By team</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <CalendarLegend />

      <div className="overflow-x-auto rounded-md border">
        <div className="grid min-w-max" style={{ gridTemplateColumns }}>
          <div className="sticky left-0 border-b bg-muted/50 px-3 py-2 text-sm font-medium">
            Member
          </div>
          {dates.map((date) => {
            const header = formatColumnHeader(date, viewMode);
            const isToday = date === todayISO;
            return (
              <div
                key={date}
                className={cn(
                  "flex flex-col items-center justify-center border-b bg-muted/50 py-1 text-xs",
                  isToday && "bg-primary/10 font-semibold",
                )}
              >
                <span className="text-muted-foreground">{header.top}</span>
                <span>{header.bottom}</span>
              </div>
            );
          })}

          {sortMode === "name" &&
            sortedMembers.map((member) => renderMemberRow(member))}

          {sortMode === "team" &&
            teamGroups?.flatMap(([key, group]) => {
              const collapsed = collapsedTeams.has(key);
              return [
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleTeamCollapsed(key)}
                  className="sticky left-0 z-10 flex items-center gap-1.5 border-b bg-muted px-3 py-2 text-left text-sm font-medium"
                  style={{ gridColumn: `1 / span ${dates.length + 1}` }}
                >
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", collapsed && "-rotate-90")} />
                  {group.name}
                  {group.members.length === 0 && (
                    <span className="font-normal text-muted-foreground">— no members</span>
                  )}
                </button>,
                ...(collapsed ? [] : group.members.map((member) => renderMemberRow(member))),
              ];
            })}
        </div>
      </div>
    </div>
  );
}
