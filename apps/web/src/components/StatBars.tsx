import type { DailyPoint } from "../api";

/** One labelled number. */
export function StatTile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)" }}>
      <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </p>
      <p className="text-[26px] font-extrabold tabular-nums leading-8">{value.toLocaleString()}</p>
      {hint ? (
        <p className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function StatGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-[17px] font-extrabold mb-2">{title}</h2>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {children}
      </div>
    </section>
  );
}

/**
 * Posts per day.
 *
 * Bars drawn with plain elements rather than a charting library: it is one
 * series of fourteen values, and a dependency for that would be more code than
 * the chart. The scale is stated, because a bar chart with no axis is a shape,
 * not a measurement.
 */
export function DailyBars({ data, label }: { data: DailyPoint[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.posts));
  return (
    <section className="mb-6">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-[17px] font-extrabold">{label}</h2>
        <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
          peak {max} / day
        </span>
      </div>
      <div
        className="flex items-end gap-1 rounded-2xl border p-3"
        style={{ borderColor: "var(--color-border)", height: 140 }}
        role="img"
        aria-label={`${label}: ${data.map((d) => `${d.date}, ${d.posts}`).join("; ")}`}
      >
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
            <span className="text-[11px] tabular-nums" style={{ color: "var(--color-text-secondary)" }}>
              {d.posts || ""}
            </span>
            <div
              className="w-full rounded-t transition-[height] duration-500 ease-out"
              style={{
                height: `${Math.round((d.posts / max) * 100)}%`,
                minHeight: d.posts > 0 ? 3 : 1,
                background: d.posts > 0 ? "var(--color-primary)" : "var(--color-border)",
              }}
              title={`${d.date}: ${d.posts}`}
            />
            <span
              className="text-[10px] tabular-nums"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {d.date.slice(8)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
