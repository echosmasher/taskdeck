"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

export function CoverageTable({
  rows,
  profileOptions,
}: {
  rows: CoverageRow[];
  profileOptions: ProfileOption[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [coveringProfileId, setCoveringProfileId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.instanceId)));
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
        [...selected],
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
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
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
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-56"
          />
          <Button size="sm" disabled={isPending} onClick={handleAssign}>
            {isPending ? "Assigning…" : "Assign coverage"}
          </Button>
        </div>
      )}

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
            <TableHead>Task</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Absence status</TableHead>
            <TableHead>Expected return</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No coverage gaps right now.
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
    </div>
  );
}
