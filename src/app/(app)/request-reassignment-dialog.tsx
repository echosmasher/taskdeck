"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createReassignmentRequestAction } from "./reassignment-actions";
import type { DashboardFilterOption } from "./dashboard-types";

const ANY = "none";

export function RequestReassignmentDialog({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  instances,
  assigneeOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  instances: { instanceId: string; companyName: string; isMine: boolean }[];
  assigneeOptions: DashboardFilterOption[];
}) {
  const [scope, setScope] = useState<"instance" | "task">("instance");
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<Set<string>>(
    () => new Set(instances.filter((i) => i.isMine).map((i) => i.instanceId)),
  );
  const [reason, setReason] = useState("");
  const [suggestedAssigneeId, setSuggestedAssigneeId] = useState(ANY);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function toggleInstance(instanceId: string) {
    setSelectedInstanceIds((prev) => {
      const next = new Set(prev);
      if (next.has(instanceId)) next.delete(instanceId);
      else next.add(instanceId);
      return next;
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setScope("instance");
      setSelectedInstanceIds(new Set(instances.filter((i) => i.isMine).map((i) => i.instanceId)));
      setReason("");
      setSuggestedAssigneeId(ANY);
      setError(undefined);
    }
    onOpenChange(next);
  }

  function handleSubmit() {
    setError(undefined);
    startTransition(async () => {
      const result = await createReassignmentRequestAction({
        taskId,
        scope,
        taskInstanceIds: scope === "instance" ? [...selectedInstanceIds] : [],
        reason,
        suggestedAssigneeProfileId: suggestedAssigneeId === ANY ? null : suggestedAssigneeId,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Reassignment requested");
      handleOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request reassignment — {taskTitle}</DialogTitle>
          <DialogDescription>
            An admin decides — this only sends a request, it doesn&apos;t reassign anything
            itself.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Scope</Label>
          <Select value={scope} onValueChange={(v) => v && setScope(v as "instance" | "task")}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(v: "instance" | "task") =>
                  v === "instance" ? "This occurrence" : "The whole task"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instance">This occurrence</SelectItem>
              <SelectItem value="task">The whole task (all future occurrences)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {scope === "instance" && (
          <div className="space-y-2">
            <Label>Companies</Label>
            <div className="flex flex-col gap-2 rounded-md border p-3">
              {instances.map((i) => (
                <label key={i.instanceId} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedInstanceIds.has(i.instanceId)}
                    onCheckedChange={() => toggleInstance(i.instanceId)}
                  />
                  {i.companyName}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="reassignment-reason">Reason</Label>
          <Textarea
            id="reassignment-reason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="suggested-assignee">Suggested assignee (optional)</Label>
          <Select value={suggestedAssigneeId} onValueChange={(v) => setSuggestedAssigneeId(v ?? ANY)}>
            <SelectTrigger id="suggested-assignee" className="w-full">
              <SelectValue>
                {(v: string) =>
                  v === ANY ? "No suggestion" : assigneeOptions.find((a) => a.id === v)?.label
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>No suggestion</SelectItem>
              {assigneeOptions.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            A suggestion only — the admin always confirms the assignee explicitly.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isPending} onClick={handleSubmit}>
            {isPending ? "Sending…" : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
