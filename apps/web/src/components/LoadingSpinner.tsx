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

/**
 * The shape of a post, while the real one loads.
 *
 * A skeleton rather than a spinner, because the timeline is a known layout:
 * showing it means nothing jumps when the data arrives.
 */
export function PostSkeleton() {
  return (
    <div
      className="flex gap-3 px-4 py-3 border-b"
      style={{ borderColor: "var(--color-border)" }}
      aria-hidden="true"
    >
      <div className="skeleton shrink-0" style={{ width: 40, height: 40, borderRadius: 9999 }} />
      <div className="flex-1 min-w-0">
        <div className="skeleton" style={{ width: "40%", height: 14 }} />
        <div className="skeleton mt-2" style={{ width: "92%", height: 12 }} />
        <div className="skeleton mt-1.5" style={{ width: "70%", height: 12 }} />
        <div className="flex gap-8 mt-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ width: 22, height: 14 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** A few of them, for a list that has not loaded yet. */
export function TimelineSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading posts">
      {Array.from({ length: rows }, (_, i) => (
        <PostSkeleton key={i} />
      ))}
      <span className="sr-only">Loading posts…</span>
    </div>
  );
}
