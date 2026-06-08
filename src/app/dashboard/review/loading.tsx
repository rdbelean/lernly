import { LAYOUT } from "@/lib/layout";

export default function ReviewLoading() {
  return (
    <main>
      <div className={LAYOUT.pageContainerClass}>
        <div className="mx-auto max-w-[640px]">
          <div
            className="h-3 w-24 rounded"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <div
            className="mt-3 h-[38px] w-56 rounded-md"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <div
            className="relative mt-8 h-[420px] overflow-hidden rounded-2xl"
            style={{
              background: "rgba(20, 22, 28, 0.6)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div className="ln-skeleton-shimmer absolute inset-0" />
          </div>
        </div>
      </div>
    </main>
  );
}
