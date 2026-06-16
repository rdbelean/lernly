import { LAYOUT } from "@/lib/layout";

// Skeleton shown while the pack page resolves (row → parallel exam/attempt/
// mastery reads). Mirrors PackHeader (breadcrumb → title → meta chips → exam
// pill) + PackView's tab bar + Hub so the layout doesn't jump when real data
// lands. Renders inside DashboardShell's <main>, so the sidebar stays put.

function Shimmer({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className ?? ""}`}
      style={{
        background: "rgba(20, 22, 28, 0.6)",
        border: "1px solid rgba(255,255,255,0.1)",
        ...style,
      }}
    >
      <div className="ln-skeleton-shimmer absolute inset-0" />
    </div>
  );
}

export default function PackLoading() {
  return (
    <main>
      <div className={LAYOUT.pageContainerClass}>
        {/* Breadcrumb */}
        <div
          className="h-3 w-40 rounded"
          style={{ background: "rgba(255,255,255,0.07)" }}
        />

        {/* Title + meta chips / exam pill row */}
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3 sm:mt-4 sm:flex-nowrap">
          <div className="min-w-0 flex-1">
            <div
              className="h-[34px] w-3/4 max-w-[420px] rounded-md"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {[64, 72, 56].map((w, i) => (
                <div
                  key={i}
                  className="h-6 rounded-md"
                  style={{ width: w, background: "rgba(255,255,255,0.05)" }}
                />
              ))}
            </div>
          </div>
          <div
            className="hidden h-8 w-40 shrink-0 rounded-full sm:block"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
        </div>

        {/* Tab bar — py-4 + 16px bars mirror PackView's real buttons
            (px-4 py-4 + 16px icon ≈ 49px row) so content below doesn't jump. */}
        <div
          className="mt-8 flex items-center gap-3 border-b py-4 sm:mt-10"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          {[44, 92, 84, 96, 88].map((w, i) => (
            <div
              key={i}
              className="h-4 rounded"
              style={{ width: w, background: "rgba(255,255,255,0.06)" }}
            />
          ))}
        </div>

        {/* Hub content */}
        <div className="py-6 sm:py-7 md:py-9">
          <Shimmer className="mb-5 h-[120px]" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Shimmer key={i} className="h-[150px]" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
