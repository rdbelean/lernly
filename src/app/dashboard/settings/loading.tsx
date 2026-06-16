// Skeleton for the settings page while its server reads (user, plan/billing,
// reminder prefs) resolve. Mirrors the real max-w-[720px] column: back link →
// section label → stacked setting cards. Renders inside DashboardShell's <main>.

function Card({ h }: { h: number }) {
  return (
    <div
      className="relative mt-4 overflow-hidden rounded-2xl"
      style={{
        height: h,
        background: "rgba(20, 22, 28, 0.6)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div className="ln-skeleton-shimmer absolute inset-0" />
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <main className="px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-[720px]">
        <div
          className="h-3 w-24 rounded"
          style={{ background: "rgba(255,255,255,0.07)" }}
        />
        <div
          className="mt-6 mb-3 h-3 w-32 rounded"
          style={{ background: "rgba(255,255,255,0.05)" }}
        />
        <Card h={120} />
        <Card h={96} />
        <Card h={88} />
        <Card h={72} />
      </div>
    </main>
  );
}
