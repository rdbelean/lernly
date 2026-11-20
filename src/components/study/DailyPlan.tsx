import Link from "next/link";
import type { DailyPlanItem } from "@/lib/study/types";

type DailyPlanProps = {
  items: readonly DailyPlanItem[];
  totalMinutes: number;
};

export function DailyPlan({ items, totalMinutes }: DailyPlanProps) {
  return (
    <section aria-label="Tagesplan" className="mt-10 sm:mt-12">
      <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
        Heute · {totalMinutes} Min
      </h2>

      <ol className="mt-3 divide-y divide-line border-t border-b border-line">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="group flex items-center justify-between gap-4 py-4 transition-opacity hover:opacity-75"
            >
              <div className="flex min-w-0 items-baseline gap-5">
                <span className="shrink-0 text-[13px] font-medium text-text-dim">
                  {item.order}
                </span>
                <span className="truncate text-[16px] font-semibold text-text">
                  {item.title}
                </span>
              </div>
              <span className="shrink-0 text-[15px] font-semibold text-text">
                {item.minutes} Min
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
