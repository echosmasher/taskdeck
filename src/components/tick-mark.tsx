/**
 * The workpaper tickmark: one slightly slanted pencil stroke, authored once
 * and reused for the stamped cell, the key, the login example and the logo.
 */
export function TickMark({ className, strokeWidth = 2.6 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path
        d="M2.4 9.1 6.3 13.2 13.9 2.8"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
