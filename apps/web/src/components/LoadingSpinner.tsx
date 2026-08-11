/** Compact spinner for inline / page loading states. */
export function LoadingSpinner({
  size = 28,
  className = "",
  label = "Loading",
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span
        className="horizon-spinner"
        style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 12)) }}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Full-width centered loading block used on pages while data loads. */
export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 animate-fade-in">
      <LoadingSpinner size={32} label={label} />
      <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </p>
    </div>
  );
}
