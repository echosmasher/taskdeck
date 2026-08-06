import { cn } from "@/lib/utils";
import { CALENDAR_STATUSES } from "./calendar-status";

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      {CALENDAR_STATUSES.map((s) => (
        <span key={s.value} className="flex items-center gap-1.5">
          <span className={cn("h-3 w-3 rounded-sm border", s.className)} />
          {s.label}
        </span>
      ))}
    </div>
  );
}
