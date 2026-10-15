export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="1.5" y="1.5" width="29" height="29" rx="3" fill="none" stroke="var(--index)" strokeWidth="2.5" />
      <path
        d="M6.5 17.6 12.4 24.2 25.6 7.6"
        fill="none"
        stroke="var(--tick)"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
