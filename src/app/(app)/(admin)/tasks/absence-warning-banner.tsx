import type { AssignmentWarningResult } from "@/lib/tasks/assignment-warning";

export function AbsenceWarningBanner({
  warning,
  assigneeName,
  onAssignAndCover,
  canCover,
}: {
  warning: AssignmentWarningResult;
  assigneeName: string;
  onAssignAndCover?: () => void;
  canCover: boolean;
}) {
  if (warning.longTerm) {
    const { rangeStart, rangeEnd, occurrenceCount, companyInstanceCount } = warning.longTerm;
    return (
      <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
        <p className="font-medium text-amber-900 dark:text-amber-200">
          {assigneeName} is long-term absent from {rangeStart} to {rangeEnd}. {occurrenceCount}{" "}
          {occurrenceCount === 1 ? "occurrence" : "occurrences"} ({companyInstanceCount} company{" "}
          {companyInstanceCount === 1 ? "instance" : "instances"}) fall in this period.
        </p>
        <p className="text-amber-800 dark:text-amber-300">
          This won&apos;t block saving — assign anyway by saving normally, or cover the affected
          instances now.
        </p>
        {onAssignAndCover && (
          <button
            type="button"
            onClick={onAssignAndCover}
            disabled={!canCover}
            className="text-sm font-medium text-amber-900 underline decoration-amber-900/40 underline-offset-2 hover:decoration-amber-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-200"
            title={canCover ? undefined : "No generated instances yet for the affected dates"}
          >
            Assign and cover…
          </button>
        )}
      </div>
    );
  }

  if (warning.shortTermOccurrenceCount > 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {assigneeName} has {warning.shortTermOccurrenceCount} short-term absence{" "}
        {warning.shortTermOccurrenceCount === 1 ? "overlap" : "overlaps"} in the next 60 days —
        informational only.
      </p>
    );
  }

  return null;
}
