import { StatusLegend } from "@/components/study/StatusLegend";
import { formatTopicPoints } from "@/lib/study/seed";
import { STATUS_BG_SOFT, STATUS_TEXT_INK } from "@/lib/study/status";
import type { StudyTopic } from "@/lib/study/types";

export type PointsVizVariantProps = {
  topics: readonly StudyTopic[];
};

export function PointsBar({ topics }: PointsVizVariantProps) {
  return (
    <section aria-label="Wo die Punkte liegen" className="mt-10 sm:mt-12">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
          Wo die Punkte liegen
        </h2>
        <StatusLegend className="hidden lg:flex" />
      </div>

      <div className="mt-3.5 flex w-full gap-1.5">
        {topics.map((topic) => (
          <div
            key={topic.id}
            style={{ flexGrow: topic.points, flexBasis: 0 }}
            className="min-w-0"
          >
            <p
              title={topic.name}
              className="truncate text-[12px] font-semibold text-text sm:text-[13px]"
            >
              {topic.shortName}
            </p>
            <div
              role="img"
              aria-label={`${topic.name}: ${formatTopicPoints(topic)} Punkte, ${topic.mastery} Prozent sicher`}
              className="relative mt-2 h-[54px] w-full overflow-hidden rounded-btn border border-line bg-surface sm:h-[58px]"
            >
              {topic.mastery > 0 ? (
                <div
                  className={`h-full ${STATUS_BG_SOFT[topic.status]}`}
                  style={{ width: `${topic.mastery}%` }}
                />
              ) : null}
            </div>
            <p
              className={`mt-2 text-[14px] font-semibold sm:text-[15px] ${STATUS_TEXT_INK[topic.status]}`}
            >
              {formatTopicPoints(topic)}
            </p>
          </div>
        ))}
      </div>

      {/* iPad portrait places the legend directly beneath the bar */}
      <StatusLegend className="mt-3.5 lg:hidden" />
    </section>
  );
}
