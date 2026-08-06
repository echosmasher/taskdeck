"use client";

import { useState, useTransition } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { markInstanceNaAction } from "./actions";

export function NaReasonDialog({
  open,
  onOpenChange,
  instanceId,
  companyName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceId: string;
  companyName: string;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(undefined);
    startTransition(async () => {
      const result = await markInstanceNaAction(instanceId, reason);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Marked N/A");
      setReason("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setError(undefined);
          setReason("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark {companyName} as N/A</DialogTitle>
          <DialogDescription>
            Optional — note why this company doesn&apos;t apply to this occurrence.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="na-reason">Reason (optional)</Label>
          <Textarea
            id="na-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Company was dormant this month"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isPending} onClick={handleConfirm}>
            {isPending ? "Saving…" : "Mark N/A"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
