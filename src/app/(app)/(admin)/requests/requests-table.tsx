"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AbsenceWarningContext, MemberOption } from "../tasks/types";
import { ApproveRequestDialog } from "./approve-request-dialog";
import { RejectRequestDialog } from "./reject-request-dialog";
import type { RequestRow } from "./types";
import type { ReassignmentStatus } from "@/app/(app)/reassignment-types";

function statusVariant(status: ReassignmentStatus): "secondary" | "outline" | "destructive" {
  if (status === "approved") return "secondary";
  if (status === "rejected") return "destructive";
  return "outline";
}

export function RequestsTable({
  rows,
  memberOptions,
  absenceWarningContext,
}: {
  rows: RequestRow[];
  memberOptions: MemberOption[];
  absenceWarningContext: AbsenceWarningContext;
}) {
  const [statusFilter, setStatusFilter] = useState<ReassignmentStatus | "all">("pending");
  const [approving, setApproving] = useState<RequestRow | null>(null);
  const [rejecting, setRejecting] = useState<RequestRow | null>(null);

  const filtered = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter],
  );

  return (
    <div className="space-y-4">
      <Tabs value={statusFilter} onValueChange={(v) => v && setStatusFilter(v as typeof statusFilter)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="withdrawn">Withdrawn</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Requester</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Suggested</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-40" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No requests here.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.requesterName}</TableCell>
              <TableCell>
                <p className="font-medium">{r.taskTitle}</p>
                <p className="text-xs text-muted-foreground">Currently: {r.currentAssigneeLabel}</p>
              </TableCell>
              <TableCell>
                {r.scope === "task" ? (
                  "Whole task"
                ) : (
                  <div className="flex flex-col text-xs">
                    {r.instances.map((i) => (
                      <span key={i.instanceId}>
                        {i.companyName} — {i.dueDate}
                      </span>
                    ))}
                  </div>
                )}
              </TableCell>
              <TableCell className="max-w-56 truncate" title={r.reason}>
                {r.reason}
              </TableCell>
              <TableCell>{r.suggestedAssigneeName ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(r.status)}>
                  {r.status[0].toUpperCase() + r.status.slice(1)}
                </Badge>
                {r.decisionNote && (
                  <p className="mt-1 max-w-40 text-xs text-muted-foreground">{r.decisionNote}</p>
                )}
              </TableCell>
              <TableCell>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setApproving(r)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRejecting(r)}>
                      Reject
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {approving && (
        <ApproveRequestDialog
          open={!!approving}
          onOpenChange={(open) => !open && setApproving(null)}
          request={approving}
          memberOptions={memberOptions}
          absenceWarningContext={absenceWarningContext}
        />
      )}

      {rejecting && (
        <RejectRequestDialog
          open={!!rejecting}
          onOpenChange={(open) => !open && setRejecting(null)}
          request={rejecting}
        />
      )}
    </div>
  );
}
