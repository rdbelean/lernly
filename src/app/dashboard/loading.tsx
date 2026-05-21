function SkeletonBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
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

export default function DashboardLoading() {
  return (
    <main className="px-6 py-12 md:py-16">
      <div className="mx-auto max-w-[1080px]">
        {/* Header */}
        <div className="mb-8">
          <div
            className="mb-3 h-3 w-32 rounded"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <div
            className="h-[50px] w-56 rounded-md"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
        </div>

        {/* Plan bar */}
        <SkeletonBlock className="mb-10 h-[58px]" />

        {/* Continue Learning hero skeleton */}
        <SkeletonBlock className="mb-10 h-[180px]" />

        {/* Grid skeleton */}
        <div
          className="mb-4 h-3 w-24 rounded"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <SkeletonBlock className="h-[200px]" />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
