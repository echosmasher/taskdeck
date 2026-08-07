"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { resetDemoDataAction } from "./actions";

export function ResetDemoSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="max-w-xl space-y-2 border-t pt-6">
      <h2 className="font-medium">Demo data</h2>
      <p className="text-sm text-muted-foreground">
        Wipes every company, task, instance, and calendar entry and rebuilds the seed dataset from
        scratch — the same thing the nightly reset does. Anything a visitor has done since the
        last reset is lost.
      </p>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Reset demo data
      </Button>
      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        title="Reset demo data?"
        description="This immediately wipes and rebuilds the entire demo dataset. This can't be undone."
        onConfirm={() => resetDemoDataAction()}
        successMessage="Demo data reset"
        confirmLabel="Reset"
        pendingLabel="Resetting…"
        variant="destructive"
      />
    </div>
  );
}
