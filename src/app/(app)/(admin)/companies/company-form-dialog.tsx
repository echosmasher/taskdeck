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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCompanyAction, updateCompanyAction } from "./actions";
import type { CompanyWithDimensions, DimensionWithValues } from "./types";

export function CompanyFormDialog({
  open,
  onOpenChange,
  dimensions,
  company,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimensions: DimensionWithValues[];
  /** Omit for create mode. */
  company?: CompanyWithDimensions;
}) {
  const isEdit = !!company;
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = isEdit
        ? await updateCompanyAction(company.id, {}, formData)
        : await createCompanyAction({}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      toast.success(isEdit ? "Company updated" : "Company created");
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(undefined);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit company" : "New company"}</DialogTitle>
          <DialogDescription>
            Every dimension must have a value selected before saving.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required defaultValue={company?.name} />
          </div>
          {dimensions.map((dimension) => (
            <div key={dimension.id} className="space-y-2">
              <Label htmlFor={`dimension:${dimension.id}`}>{dimension.name}</Label>
              <Select
                name={`dimension:${dimension.id}`}
                required
                defaultValue={company?.values[dimension.id]}
              >
                <SelectTrigger id={`dimension:${dimension.id}`} className="w-full">
                  <SelectValue placeholder={`Select ${dimension.name.toLowerCase()}…`} />
                </SelectTrigger>
                <SelectContent>
                  {dimension.values.map((value) => (
                    <SelectItem key={value.id} value={value.id}>
                      {value.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
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
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Create company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
