"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddDimensionDialog } from "./add-dimension-dialog";
import { AddValueInline } from "./add-value-inline";
import { DimensionBackfillDialog } from "./dimension-backfill-dialog";
import { DimensionValueRow } from "./dimension-value-row";
import type { DimensionWithValues } from "../types";

export function ManageDimensionsDialog({
  open,
  onOpenChange,
  dimensions,
  activeCompanies,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimensions: DimensionWithValues[];
  activeCompanies: { id: string; name: string }[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [backfillDimension, setBackfillDimension] = useState<{
    id: string;
    name: string;
    values: { id: string; value: string }[];
  } | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage dimensions</DialogTitle>
            <DialogDescription>
              Dimensions apply to every company. Add values here, or add a whole new dimension.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {dimensions.map((dimension) => (
              <div key={dimension.id} className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">{dimension.name}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {dimension.values.map((v) => (
                    <DimensionValueRow key={v.id} id={v.id} value={v.value} />
                  ))}
                </div>
                <AddValueInline dimensionId={dimension.id} />
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={() => setAddOpen(true)}>
            Add dimension
          </Button>
        </DialogContent>
      </Dialog>

      <AddDimensionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(dimension) => {
          if (activeCompanies.length > 0) {
            setBackfillDimension(dimension);
          }
        }}
      />

      {backfillDimension && (
        <DimensionBackfillDialog
          open={!!backfillDimension}
          onOpenChange={(open) => !open && setBackfillDimension(null)}
          dimension={backfillDimension}
          companies={activeCompanies}
        />
      )}
    </>
  );
}
