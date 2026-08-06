import type { Tables } from "@/lib/supabase/database.types";

export function describeEvent(event: Tables<"task_events">["event"]): string {
  switch (event) {
    case "created":
      return "Created";
    case "completed":
      return "Completed";
    case "marked_na":
      return "Marked N/A";
    case "reopened":
      return "Reopened";
    case "reassigned":
      return "Reassigned";
    case "edited":
      return "Edited";
  }
}

export function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}
