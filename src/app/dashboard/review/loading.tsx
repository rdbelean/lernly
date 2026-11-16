import { LAYOUT } from "@/lib/layout";

export default function ReviewLoading() {
  return (
    <main>
      <div className={LAYOUT.pageContainerClass}>
        <div className="mx-auto max-w-[640px]">
          <div
            className="h-3 w-24 rounded"
            style={{ background: "var(--color-ink-a10)" }}
          />
          <div
            className="mt-3 h-[38px] w-56 rounded-md"
            style={{ background: "var(--color-ink-a10)" }}
          />
          <div
            className="relative mt-8 h-[420px] overflow-hidden rounded-2xl"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-ink-a10)",
            }}
          >
            <div className="ln-skeleton-shimmer absolute inset-0" />
          </div>
        </div>
      </div>
    </main>
  );
}
