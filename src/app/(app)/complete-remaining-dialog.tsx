"use client";

import { useTransition } from "react";
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
import { completeRemainingAction } from "./actions";

export function CompleteRemainingDialog({
  open,
  onOpenChange,
  taskTitle,
  openInstances,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  openInstances: { instanceId: string; companyName: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await completeRemainingAction(openInstances.map((i) => i.instanceId));
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Completed ${result.completed} ${result.completed === 1 ? "company" : "companies"}`,
      );
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete remaining companies?</DialogTitle>
          <DialogDescription>
            Marks every still-open company on &ldquo;{taskTitle}&rdquo; as complete. Each one gets
            its own stamp and audit entry.
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-48 list-disc overflow-y-auto rounded-md border p-3 pl-8 text-sm">
          {openInstances.map((i) => (
            <li key={i.instanceId}>{i.companyName}</li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isPending} onClick={handleConfirm}>
            {isPending ? "Completing…" : `Complete ${openInstances.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
