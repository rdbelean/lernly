import { StatusLegend } from "@/components/study/StatusLegend";
import { formatTopicPoints } from "@/lib/study/seed";
import { STATUS_BG_SOLID } from "@/lib/study/status";
import type { StudyTopic } from "@/lib/study/types";
import type { PointsVizVariantProps } from "./PointsBar";
import { TopicTable } from "./TopicTable";

function splitIntoColumns(topics: readonly StudyTopic[]): StudyTopic[][] {
  if (topics.length === 7) {
    return [topics.slice(0, 2), topics.slice(2, 4), topics.slice(4, 7)];
  }
  const cols: StudyTopic[][] = [[], [], []];
  const sums = [0, 0, 0];
  for (const topic of topics) {
    const idx = sums.indexOf(Math.min(...sums));
    cols[idx].push(topic);
    sums[idx] += topic.points;
  }
  return cols;
}

export function PointsMiniMap({ topics }: PointsVizVariantProps) {
  const columns = splitIntoColumns(topics);
  const colWeights = columns.map((col) =>
    col.reduce((sum, topic) => sum + topic.points, 0),
  );

  return (
    <section
      aria-label="Punkte-Mini-Karte"
      className="mt-10 grid grid-cols-1 gap-10 sm:mt-12 lg:grid-cols-2"
    >
      <TopicTable topics={topics} />

      <div>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
            Fläche = Punkte
          </h2>
          <StatusLegend />
        </div>

        <div className="mt-3 flex h-[300px] w-full gap-1.5">
          {columns.map((col, colIndex) => (
            <div
              key={colIndex}
              style={{ flexGrow: colWeights[colIndex], flexBasis: 0 }}
              className="flex flex-col gap-1.5"
            >
              {col.map((topic) => {
                const labelOnFill = topic.mastery >= 80;
                const labelSize =
                  topic.points >= 18
                    ? "text-[26px]"
                    : topic.points >= 11
                      ? "text-[20px]"
                      : "text-[14px]";
                return (
                  <div
                    key={topic.id}
                    style={{ flexGrow: topic.points, flexBasis: 0 }}
                    title={`${topic.name}: ${formatTopicPoints(topic)} P (${topic.mastery} %)`}
                    className="relative overflow-hidden rounded-btn bg-surface-2 p-2.5"
                  >
                    {topic.mastery > 0 ? (
                      <div
                        className={`absolute inset-x-0 bottom-0 ${STATUS_BG_SOLID[topic.status]}`}
                        style={{ height: `${topic.mastery}%` }}
                      />
                    ) : null}
                    <span
                      className={`relative z-10 font-display font-semibold leading-none ${labelSize} ${
                        labelOnFill ? "text-on-primary" : "text-text"
                      }`}
                    >
                      {formatTopicPoints(topic)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
