"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { clearCalendarEntryAction, setCalendarEntryAction } from "./actions";
import { CALENDAR_STATUSES } from "./calendar-status";
import type { CalendarEntryStatus } from "./types";

export function CalendarCell({
  profileId,
  date,
  status,
  editable,
}: {
  profileId: string;
  date: string;
  status: CalendarEntryStatus | undefined;
  editable: boolean;
}) {
  const statusConfig = status ? CALENDAR_STATUSES.find((s) => s.value === status) : undefined;
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const cellClassName = cn(
    "h-9 w-full rounded-md border text-xs",
    statusConfig ? statusConfig.className : "border-transparent bg-transparent",
  );

  if (!editable) {
    return (
      <div className={cellClassName} title={statusConfig?.label} aria-label={statusConfig?.label} />
    );
  }

  function handleSelect(next: CalendarEntryStatus) {
    startTransition(async () => {
      const result = await setCalendarEntryAction(profileId, date, next);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
    });
  }

  function handleClear() {
    startTransition(async () => {
      const result = await clearCalendarEntryAction(profileId, date);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={isPending}
            className={cn(cellClassName, "cursor-pointer hover:opacity-80")}
            aria-label={statusConfig?.label ?? "Set status"}
          />
        }
      />
      <PopoverContent className="w-56 p-1" align="start">
        {CALENDAR_STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => handleSelect(s.value)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
          >
            <span className={cn("h-3 w-3 shrink-0 rounded-sm border", s.className)} />
            {s.label}
          </button>
        ))}
        {status && (
          <button
            type="button"
            onClick={handleClear}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
          >
            Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
