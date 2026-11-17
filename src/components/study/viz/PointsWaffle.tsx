import { StatusLegend } from "@/components/study/StatusLegend";
import { STATUS_BG_SOLID } from "@/lib/study/status";
import type { TopicStatus } from "@/lib/study/types";
import type { PointsVizVariantProps } from "./PointsBar";
import { TopicTable } from "./TopicTable";

type WaffleCell = {
  key: string;
  filled: boolean;
  status: TopicStatus;
  topicName: string;
};

export function PointsWaffle({ topics }: PointsVizVariantProps) {
  const cells: WaffleCell[] = [];
  for (const topic of topics) {
    const filledCount = Math.round((topic.points * topic.mastery) / 100);
    for (let i = 0; i < topic.points; i++) {
      cells.push({
        key: `${topic.id}-${i}`,
        filled: i < filledCount,
        status: topic.status,
        topicName: topic.name,
      });
    }
  }

  return (
    <section
      aria-label="Punkte-Waffel: 1 Quadrat entspricht 1 Punkt"
      className="mt-10 grid grid-cols-1 gap-10 sm:mt-12 lg:grid-cols-[auto_1fr] lg:items-start"
    >
      <div>
        <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
          1 Quadrat = 1 Punkt
        </h2>

        <div className="mt-3 grid w-[276px] grid-cols-10 gap-[5px]">
          {cells.map((cell) => (
            <span
              key={cell.key}
              title={cell.topicName}
              className={`h-[23px] w-[23px] rounded-[3px] ${
                cell.filled
                  ? STATUS_BG_SOLID[cell.status]
                  : "border border-line bg-surface"
              }`}
            />
          ))}
        </div>

        <StatusLegend className="mt-3.5" />
      </div>

      <TopicTable topics={topics} />
    </section>
  );
}
