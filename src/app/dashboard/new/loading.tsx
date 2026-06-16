// Skeleton for the upload page during navigation. Mirrors the real
// max-w-[720px] column: back link → eyebrow → headline → dropzone block →
// format picker row. Renders inside DashboardShell's <main>.

export default function NewPackLoading() {
  return (
    <main className="px-6 py-12">
      <div className="mx-auto max-w-[720px]">
        <div
          className="h-3 w-24 rounded"
          style={{ background: "rgba(255,255,255,0.07)" }}
        />
        <div
          className="mt-6 h-3 w-28 rounded"
          style={{ background: "rgba(255,255,255,0.05)" }}
        />
        <div
          className="mt-3 h-[40px] w-2/3 max-w-[380px] rounded-md"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />

        {/* Dropzone */}
        <div
          className="relative mt-8 h-[220px] overflow-hidden rounded-2xl"
          style={{
            background: "rgba(20, 22, 28, 0.6)",
            border: "1px dashed rgba(255,255,255,0.14)",
          }}
        >
          <div className="ln-skeleton-shimmer absolute inset-0" />
        </div>

        {/* Format picker row */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="relative h-[84px] overflow-hidden rounded-xl"
              style={{
                background: "rgba(20, 22, 28, 0.6)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div className="ln-skeleton-shimmer absolute inset-0" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
