"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APP_TIMEZONE } from "@/lib/config";
import { getTodayInTimezone } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { describeEvent, formatTimestamp } from "./history-format";
import type { FilterOption, HistoryEvent, HistoryRow } from "./types";

const ANY = "any";
type StatusFilter = "all" | "completed" | "na";
type SortKey = "dueDate" | "companyName" | "statusSetAt";
type SortDir = "asc" | "desc";

function currentMonth(): string {
  return getTodayInTimezone(APP_TIMEZONE).slice(0, 7);
}

export function HistoryTable({
  rows,
  eventsByInstanceId,
  taskOptions,
  companyOptions,
  assigneeOptions,
}: {
  rows: HistoryRow[];
  eventsByInstanceId: Record<string, HistoryEvent[]>;
  taskOptions: FilterOption[];
  companyOptions: FilterOption[];
  assigneeOptions: FilterOption[];
}) {
  const [month, setMonth] = useState(currentMonth());
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleExpanded(instanceId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(instanceId)) next.delete(instanceId);
      else next.add(instanceId);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const result = rows.filter((r) => {
      if (month && !r.dueDate.startsWith(month)) return false;
      if (companyId && r.companyId !== companyId) return false;
      if (taskId && r.taskId !== taskId) return false;
      if (status !== "all" && r.status !== status) return false;
      if (assigneeId && r.statusSetById !== assigneeId) return false;
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    result.sort((a, b) => {
      if (sortKey === "companyName") return dir * a.companyName.localeCompare(b.companyName);
      if (sortKey === "statusSetAt") {
        return dir * (a.statusSetAt ?? "").localeCompare(b.statusSetAt ?? "");
      }
      return dir * a.dueDate.localeCompare(b.dueDate);
    });

    return result;
  }, [rows, month, companyId, taskId, status, assigneeId, sortKey, sortDir]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-40"
          aria-label="Filter by month"
        />

        <Select value={companyId ?? ANY} onValueChange={(v) => setCompanyId(v === ANY ? null : v)}>
          <SelectTrigger className="w-44" aria-label="Filter by company">
            <SelectValue>
              {(v: string) => companyOptions.find((c) => c.id === v)?.label ?? "Any company"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any company</SelectItem>
            {companyOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={taskId ?? ANY} onValueChange={(v) => setTaskId(v === ANY ? null : v)}>
          <SelectTrigger className="w-44" aria-label="Filter by task">
            <SelectValue>{(v: string) => taskOptions.find((t) => t.id === v)?.label ?? "Any task"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any task</SelectItem>
            {taskOptions.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-36" aria-label="Filter by status">
            <SelectValue>
              {(v: StatusFilter) =>
                v === "completed" ? "Completed" : v === "na" ? "N/A" : "Any status"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="na">N/A</SelectItem>
          </SelectContent>
        </Select>

        <Select value={assigneeId ?? ANY} onValueChange={(v) => setAssigneeId(v === ANY ? null : v)}>
          <SelectTrigger className="w-44" aria-label="Filter by assignee">
            <SelectValue>
              {(v: string) => assigneeOptions.find((a) => a.id === v)?.label ?? "Any assignee"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any assignee</SelectItem>
            {assigneeOptions.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Task</TableHead>
            <TableHead>
              <SortHeader
                label="Company"
                sortKeyValue="companyName"
                activeKey={sortKey}
                onSort={toggleSort}
              />
            </TableHead>
            <TableHead>
              <SortHeader
                label="Due date"
                sortKeyValue="dueDate"
                activeKey={sortKey}
                onSort={toggleSort}
              />
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Set by</TableHead>
            <TableHead>
              <SortHeader
                label="Set at"
                sortKeyValue="statusSetAt"
                activeKey={sortKey}
                onSort={toggleSort}
              />
            </TableHead>
            <TableHead>N/A reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                No history for this filter.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((row) => {
            const isExpanded = expanded.has(row.instanceId);
            const events = eventsByInstanceId[row.instanceId] ?? [];
            return (
              <Fragment key={row.instanceId}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => toggleExpanded(row.instanceId)}
                >
                  <TableCell>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{row.taskTitle}</TableCell>
                  <TableCell>{row.companyName}</TableCell>
                  <TableCell>{row.dueDate}</TableCell>
                  <TableCell>
                    {row.status === "completed" ? (
                      <Badge variant="secondary">Completed</Badge>
                    ) : (
                      <Badge variant="outline">N/A</Badge>
                    )}
                  </TableCell>
                  <TableCell>{row.statusSetByName ?? "—"}</TableCell>
                  <TableCell>{row.statusSetAt ? formatTimestamp(row.statusSetAt) : "—"}</TableCell>
                  <TableCell className="max-w-48 truncate">{row.naReason ?? "—"}</TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow>
                    <TableCell />
                    <TableCell colSpan={7} className="bg-muted/30">
                      <ol className="flex flex-col gap-2 py-2">
                        {events.map((event) => (
                          <li key={event.id} className="flex items-center gap-3 text-sm">
                            <Badge variant="outline">{describeEvent(event.event)}</Badge>
                            <span>{event.actorName ?? "System"}</span>
                            <span className="text-muted-foreground">
                              {formatTimestamp(event.occurredAt)}
                            </span>
                            {typeof event.details.na_reason === "string" && (
                              <span className="text-muted-foreground">
                                ({event.details.na_reason})
                              </span>
                            )}
                          </li>
                        ))}
                        {events.length === 0 && (
                          <li className="text-sm text-muted-foreground">No events recorded.</li>
                        )}
                      </ol>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SortHeader({
  label,
  sortKeyValue,
  activeKey,
  onSort,
}: {
  label: string;
  sortKeyValue: SortKey;
  activeKey: SortKey;
  onSort: (key: SortKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(sortKeyValue)}
      className="flex items-center gap-1 font-medium"
    >
      {label}
      <ChevronsUpDown
        className={cn(
          "h-3.5 w-3.5",
          activeKey === sortKeyValue ? "text-foreground" : "text-muted-foreground/50",
        )}
      />
    </button>
  );
}
