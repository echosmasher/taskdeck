"use client";

import { useId, useState, useTransition } from "react";
import { X } from "lucide-react";
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
import { createDimensionAction } from "./actions";

export function AddDimensionDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new dimension after a successful create. */
  onCreated: (dimension: {
    id: string;
    name: string;
    values: { id: string; value: string }[];
  }) => void;
}) {
  const baseId = useId();
  const [rowIds, setRowIds] = useState<string[]>([`${baseId}-0`, `${baseId}-1`]);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function reset() {
    setRowIds([`${baseId}-0`, `${baseId}-1`]);
    setError(undefined);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createDimensionAction({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Dimension created");
      onOpenChange(false);
      reset();
      if (result.dimensionId && result.dimensionName && result.values) {
        onCreated({ id: result.dimensionId, name: result.dimensionName, values: result.values });
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add dimension</DialogTitle>
          <DialogDescription>
            Give it a name and at least one allowed value. You can add more values later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dimension-name">Name</Label>
            <Input id="dimension-name" name="name" required placeholder="e.g. Size" />
          </div>
          <div className="space-y-2">
            <Label>Values</Label>
            {rowIds.map((rowId, index) => (
              <div key={rowId} className="flex items-center gap-2">
                <Input name="value" placeholder={`Value ${index + 1}`} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove value"
                  disabled={rowIds.length === 1}
                  onClick={() => setRowIds((ids) => ids.filter((id) => id !== rowId))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRowIds((ids) => [...ids, `${baseId}-${ids.length}-${Date.now()}`])}
            >
              Add another value
            </Button>
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create dimension"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
