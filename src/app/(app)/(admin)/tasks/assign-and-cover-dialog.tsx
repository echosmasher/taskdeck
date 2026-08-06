"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setInstanceOverridesAction } from "../coverage/actions";
import { findOverridableInstancesAction, type OverridableInstance } from "./actions";
import type { MemberOption } from "./types";

export function AssignAndCoverDialog({
  open,
  onOpenChange,
  taskId,
  rangeStart,
  rangeEnd,
  excludeProfileId,
  members,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  rangeStart: string;
  rangeEnd: string;
  /** The absent original assignee — not offered as a covering option. */
  excludeProfileId: string;
  members: MemberOption[];
}) {
  const [instances, setInstances] = useState<OverridableInstance[] | null>(null);
  const [coveringProfileId, setCoveringProfileId] = useState("");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    findOverridableInstancesAction(taskId, rangeStart, rangeEnd).then(setInstances);
  }, [open, taskId, rangeStart, rangeEnd]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setInstances(null);
      setCoveringProfileId("");
      setReason("");
    }
    onOpenChange(next);
  }

  const coveringOptions = members.filter((m) => m.id !== excludeProfileId);

  function handleConfirm() {
    if (!instances || instances.length === 0 || !coveringProfileId) return;
    startTransition(async () => {
      const result = await setInstanceOverridesAction(
        instances.map((i) => i.instanceId),
        coveringProfileId,
        reason,
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Coverage assigned for ${result.updated} instance(s)`);
      handleOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign and cover</DialogTitle>
          <DialogDescription>
            Sets an instance-level override so someone else completes these while the original
            assignee is away — the task definition itself is untouched.
          </DialogDescription>
        </DialogHeader>

        {instances === null && <p className="text-sm text-muted-foreground">Loading…</p>}

        {instances && instances.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No generated instances fall in this date range yet — check the Coverage view once
            they have.
          </p>
        )}

        {instances && instances.length > 0 && (
          <>
            <ul className="max-h-40 list-disc overflow-y-auto rounded-md border p-3 pl-8 text-sm">
              {instances.map((i) => (
                <li key={i.instanceId}>
                  {i.companyName} — due {i.dueDate}
                </li>
              ))}
            </ul>
            <div className="space-y-2">
              <Label htmlFor="covering-profile">Covering member</Label>
              <Select value={coveringProfileId} onValueChange={(v) => setCoveringProfileId(v ?? "")}>
                <SelectTrigger id="covering-profile" className="w-full">
                  <SelectValue>
                    {(v: string) => coveringOptions.find((m) => m.id === v)?.label ?? "Select…"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {coveringOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cover-reason">Reason (optional)</Label>
              <Input id="cover-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          {instances && instances.length > 0 && (
            <Button type="button" disabled={isPending || !coveringProfileId} onClick={handleConfirm}>
              {isPending ? "Assigning…" : "Assign coverage"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
