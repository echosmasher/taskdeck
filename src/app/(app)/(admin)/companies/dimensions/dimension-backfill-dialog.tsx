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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { backfillCompanyDimensionValuesAction } from "./actions";

export function DimensionBackfillDialog({
  open,
  onOpenChange,
  dimension,
  companies,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimension: { id: string; name: string; values: { id: string; value: string }[] };
  companies: { id: string; name: string }[];
}) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await backfillCompanyDimensionValuesAction(
        dimension.id,
        companies.map((c) => ({ companyId: c.id, dimensionValueId: selections[c.id] ?? "" })),
      );
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      const filledCount = Object.values(selections).filter(Boolean).length;
      const remaining = companies.length - filledCount;
      toast.success(
        remaining > 0
          ? `Saved ${filledCount} of ${companies.length}. ${remaining} left incomplete — you can finish later.`
          : `${dimension.name} set for all ${companies.length} companies.`,
      );
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set {dimension.name} for existing companies</DialogTitle>
          <DialogDescription>
            Leave any row blank to fill it in later — a warning will stay on the Companies page
            until every active company has a value for every dimension.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 space-y-3 overflow-y-auto py-2">
          {companies.map((company) => (
            <div key={company.id} className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">{company.name}</span>
              <Select
                value={selections[company.id] ?? ""}
                onValueChange={(value) =>
                  setSelections((prev) => ({ ...prev, [company.id]: value ?? "" }))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Fill later" />
                </SelectTrigger>
                <SelectContent>
                  {dimension.values.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fill later for all
          </Button>
          <Button type="button" disabled={isPending} onClick={handleSave}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
