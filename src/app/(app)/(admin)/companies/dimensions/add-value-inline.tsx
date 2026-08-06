"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDimensionValueAction } from "./actions";

export function AddValueInline({ dimensionId }: { dimensionId: string }) {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("value", value);
      const result = await addDimensionValueAction(dimensionId, {}, formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setValue("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add value…"
        className="h-7 w-32"
      />
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        Add
      </Button>
    </form>
  );
}
