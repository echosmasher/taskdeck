export default function Loading() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-live="polite">
      <span className="sr-only">Loading your tasks…</span>
      <div className="space-y-2">
        <div className="h-6 w-40 animate-pulse rounded-sm bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-sm bg-muted" />
      </div>
      <div className="h-8 w-60 animate-pulse rounded-lg bg-muted" />
      <div className="overflow-hidden rounded-md border bg-card">
        {Array.from({ length: 5 }, (_, row) => (
          <div key={row} className="flex items-center gap-4 border-b px-3 py-4 last:border-b-0">
            <div className="h-9 w-64 animate-pulse rounded-sm bg-muted" />
            <div className="hidden flex-1 gap-3 lg:flex">
              {Array.from({ length: 6 }, (_, cell) => (
                <div key={cell} className="size-5 animate-pulse rounded-[3px] border border-dashed bg-transparent" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
