import type { ReactNode } from "react";

// Card chrome for every chart: title (+ optional subtitle), an optional
// top-right action slot (e.g. a PostHog link), and an empty-state fallback.
// The chart children own their own empty state too, so `isEmpty` is only for
// whole-section "no data" cases.
export default function ChartCard({
  title,
  subtitle,
  action,
  isEmpty = false,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  isEmpty?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "#141930", borderColor: "rgba(255,255,255,0.06)" }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p
            className="text-[11px] uppercase tracking-[0.16em]"
            style={{ color: "var(--color-text-faint)" }}
          >
            {title}
          </p>
          {subtitle && (
            <p className="mt-1 text-[12px]" style={{ color: "var(--color-text-dim)" }}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {isEmpty ? (
        <div
          className="flex h-[140px] items-center justify-center text-[12.5px]"
          style={{ color: "var(--color-text-faint)" }}
        >
          noch keine Daten
        </div>
      ) : (
        children
      )}
    </div>
  );
}
