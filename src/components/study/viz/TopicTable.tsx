import { formatTopicPoints } from "@/lib/study/seed";
import { STATUS_LABEL, STATUS_TEXT_INK } from "@/lib/study/status";
import type { StudyTopic } from "@/lib/study/types";

type TopicTableProps = {
  topics: readonly StudyTopic[];
};

export function TopicTable({ topics }: TopicTableProps) {
  return (
    <div>
      <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
        Thema
      </h2>
      <ol className="mt-3 divide-y divide-line border-t border-b border-line">
        {topics.map((topic) => (
          <li
            key={topic.id}
            className="grid grid-cols-[28px_1fr_auto_44px] items-center gap-3 py-3"
          >
            <span className="text-[12px] font-medium text-text-dim">
              {topic.order}
            </span>
            <span className="truncate text-[14px] font-semibold text-text">
              {topic.name}
            </span>
            <span
              className={`text-[12px] font-semibold ${STATUS_TEXT_INK[topic.status]}`}
            >
              {STATUS_LABEL[topic.status]}
            </span>
            <span className="text-right text-[14px] font-bold text-text">
              {formatTopicPoints(topic)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
