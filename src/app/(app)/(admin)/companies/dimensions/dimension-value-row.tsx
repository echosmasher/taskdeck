"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { renameDimensionValueAction } from "./actions";

export function DimensionValueRow({ id, value }: { id: string; value: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await renameDimensionValueAction(id, draft);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={`Rename ${value}`}
          className="h-7 w-32"
          autoFocus
        />
        <Button type="button" size="sm" disabled={isPending} onClick={handleSave}>
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setDraft(value);
            setEditing(false);
          }}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm">
      {value}
      <button
        type="button"
        aria-label={`Rename ${value}`}
        className="text-muted-foreground hover:text-foreground"
        onClick={() => setEditing(true)}
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}
