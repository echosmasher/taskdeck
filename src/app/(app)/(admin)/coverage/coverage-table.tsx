"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { setInstanceOverridesAction } from "./actions";
import type { CoverageRow, ProfileOption } from "./types";

type SortKey = "taskTitle" | "companyName" | "dueDate" | "assigneeName" | "expectedReturnDate";
type SortState = { key: SortKey; dir: "asc" | "desc" } | null;

const ALL = "all";

export function CoverageTable({
  rows: allRows,
  profileOptions,
}: {
  rows: CoverageRow[];
  profileOptions: ProfileOption[];
}) {
  const [companyFilter, setCompanyFilter] = useState(ALL);
  const [assigneeFilter, setAssigneeFilter] = useState(ALL);
  const [sort, setSort] = useState<SortState>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [coveringProfileId, setCoveringProfileId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const companies = useMemo(
    () => [...new Set(allRows.map((r) => r.companyName))].sort((a, b) => a.localeCompare(b)),
    [allRows],
  );
  const assignees = useMemo(
    () =>
      [...new Map(allRows.map((r) => [r.assigneeProfileId, r.assigneeName] as const))]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allRows],
  );

  const rows = useMemo(() => {
    const filtered = allRows.filter(
      (r) =>
        (companyFilter === ALL || r.companyName === companyFilter) &&
        (assigneeFilter === ALL || r.assigneeProfileId === assigneeFilter),
    );
    if (!sort) return filtered;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => factor * a[sort.key].localeCompare(b[sort.key]));
  }, [allRows, companyFilter, assigneeFilter, sort]);

  const isFiltered = companyFilter !== ALL || assigneeFilter !== ALL;
  const selectedCount = rows.filter((r) => selected.has(r.instanceId)).length;
  const allSelected = rows.length > 0 && selectedCount === rows.length;

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev?.key !== key ? { key, dir: "asc" } : prev.dir === "asc" ? { key, dir: "desc" } : null,
    );
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.instanceId)));
  }

  function sortableHead(key: SortKey, label: string) {
    const active = sort?.key === key ? sort.dir : null;
    const Icon = active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ChevronsUpDown;
    return (
      <TableHead aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : "none"}>
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className="inline-flex items-center gap-1 rounded-sm [font:inherit] [letter-spacing:inherit] [text-transform:inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {label}
          <Icon className={active ? "size-3.5" : "size-3.5 text-muted-foreground"} aria-hidden />
        </button>
      </TableHead>
    );
  }

  function toggleOne(instanceId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(instanceId)) next.delete(instanceId);
      else next.add(instanceId);
      return next;
    });
  }

  const coveringOptions = useMemo(
    () =>
      profileOptions.filter(
        (p) => !rows.some((r) => selected.has(r.instanceId) && r.assigneeProfileId === p.id),
      ),
    [profileOptions, rows, selected],
  );

  function handleAssign() {
    if (!coveringProfileId) {
      toast.error("Pick who's covering first.");
      return;
    }
    startTransition(async () => {
      const result = await setInstanceOverridesAction(
        rows.filter((r) => selected.has(r.instanceId)).map((r) => r.instanceId),
        coveringProfileId,
        reason,
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Assigned coverage for ${result.updated} instance(s)`);
      setSelected(new Set());
      setCoveringProfileId("");
      setReason("");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={companyFilter} onValueChange={(v) => setCompanyFilter(v ?? ALL)}>
          <SelectTrigger className="w-52" aria-label="Filter by company">
            <SelectValue>{(v: string) => (v === ALL ? "All companies" : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={(v) => setAssigneeFilter(v ?? ALL)}>
          <SelectTrigger className="w-48" aria-label="Filter by assignee">
            <SelectValue>
              {(v: string) => (v === ALL ? "All assignees" : (assignees.find((a) => a.id === v)?.name ?? "All assignees"))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All assignees</SelectItem>
            {assignees.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCompanyFilter(ALL);
              setAssigneeFilter(ALL);
            }}
          >
            Clear filters
          </Button>
        )}
        <span aria-live="polite" className="ml-auto text-sm text-muted-foreground">
          {isFiltered ? `${rows.length} of ${allRows.length}` : `${allRows.length}`} instance
          {allRows.length === 1 ? "" : "s"}
        </span>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-3">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <Select value={coveringProfileId} onValueChange={(v) => setCoveringProfileId(v ?? "")}>
            <SelectTrigger className="w-48" aria-label="Covering member">
              <SelectValue>
                {(v: string) => coveringOptions.find((p) => p.id === v)?.label ?? "Assign to…"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {coveringOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Reason (optional)"
            aria-label="Coverage reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-56"
          />
          <Button size="sm" disabled={isPending} onClick={handleAssign}>
            {isPending ? "Assigning…" : "Assign coverage"}
          </Button>
        </div>
      )}

      <Card className="gap-0 py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all"
              />
            </TableHead>
            {sortableHead("taskTitle", "Task")}
            {sortableHead("companyName", "Company")}
            {sortableHead("dueDate", "Due date")}
            {sortableHead("assigneeName", "Assignee")}
            <TableHead>Absence status</TableHead>
            {sortableHead("expectedReturnDate", "Expected return")}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                {isFiltered ? "No instances match these filters." : "No coverage gaps right now."}
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => (
            <TableRow key={row.instanceId}>
              <TableCell>
                <Checkbox
                  checked={selected.has(row.instanceId)}
                  onCheckedChange={() => toggleOne(row.instanceId)}
                  aria-label={`Select ${row.taskTitle} — ${row.companyName}`}
                />
              </TableCell>
              <TableCell className="font-medium">{row.taskTitle}</TableCell>
              <TableCell>{row.companyName}</TableCell>
              <TableCell>{row.dueDate}</TableCell>
              <TableCell>{row.assigneeName}</TableCell>
              <TableCell className="text-muted-foreground">Long-term absent</TableCell>
              <TableCell>{row.expectedReturnDate}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </Card>
    </div>
  );
}
