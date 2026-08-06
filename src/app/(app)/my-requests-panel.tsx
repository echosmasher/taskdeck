"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { withdrawReassignmentRequestAction } from "./reassignment-actions";
import type { ReassignmentRequestSummary, ReassignmentStatus } from "./reassignment-types";

function statusVariant(status: ReassignmentStatus): "secondary" | "outline" | "destructive" {
  if (status === "approved") return "secondary";
  if (status === "rejected") return "destructive";
  return "outline";
}

function statusLabel(status: ReassignmentStatus): string {
  return status[0].toUpperCase() + status.slice(1);
}

export function MyRequestsPanel({ requests }: { requests: ReassignmentRequestSummary[] }) {
  const [isPending, startTransition] = useTransition();

  if (requests.length === 0) return null;

  function handleWithdraw(id: string) {
    startTransition(async () => {
      const result = await withdrawReassignmentRequestAction(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Request withdrawn");
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <h2 className="text-sm font-semibold">My requests</h2>
      <ul className="flex flex-col gap-2">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span>{r.taskTitle}</span>
              <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
              {r.scope === "task" && <span className="text-xs text-muted-foreground">whole task</span>}
              {r.decisionNote && (
                <span className="text-xs text-muted-foreground">— {r.decisionNote}</span>
              )}
            </div>
            {r.status === "pending" && (
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => handleWithdraw(r.id)}
              >
                Withdraw
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
