import { StatusLegend } from "@/components/study/StatusLegend";
import { formatTopicPoints } from "@/lib/study/seed";
import {
  STATUS_BG_SOLID,
  STATUS_LABEL,
  STATUS_TEXT_INK,
} from "@/lib/study/status";
import type { PointsVizVariantProps } from "./PointsBar";

export function PointsHorizontalBars({ topics }: PointsVizVariantProps) {
  const maxPoints = Math.max(...topics.map((t) => t.points), 1);

  return (
    <section
      aria-label="Thema: Länge entspricht Punkten, Füllung entspricht sicher"
      className="mt-10 sm:mt-12"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
          Thema · Länge = Punkte, Füllung = sicher
        </h2>
        <StatusLegend />
      </div>

      <ol className="mt-3 divide-y divide-line border-t border-b border-line">
        {topics.map((topic) => {
          const trackWidthPct = (topic.points / maxPoints) * 100;
          return (
            <li
              key={topic.id}
              className="grid grid-cols-[28px_180px_1fr_52px_40px] items-center gap-4 py-3.5"
            >
              <span className="text-[12px] font-medium text-text-dim">
                {topic.order}
              </span>
              <span className="truncate text-[14px] font-semibold text-text">
                {topic.name}
              </span>
              <div className="w-full pr-4">
                <div
                  className="h-[11px] overflow-hidden rounded-[2px] bg-surface-2"
                  style={{ width: `${trackWidthPct}%` }}
                >
                  {topic.mastery > 0 ? (
                    <div
                      className={`h-full rounded-[2px] ${STATUS_BG_SOLID[topic.status]}`}
                      style={{ width: `${topic.mastery}%` }}
                    />
                  ) : null}
                </div>
              </div>
              <span
                className={`text-right text-[12px] font-semibold ${STATUS_TEXT_INK[topic.status]}`}
              >
                {STATUS_LABEL[topic.status]}
              </span>
              <span className="text-right text-[14px] font-semibold text-text">
                {formatTopicPoints(topic)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
