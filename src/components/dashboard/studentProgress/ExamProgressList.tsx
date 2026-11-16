import Link from "next/link";
import { countdownInfo, examRgba } from "@/lib/exams";
import type { ExamProgress } from "@/lib/dashboard/studentProgressShared";

// Other exams as plain rows (hairlines, no cards, no bars).
export default function ExamProgressList({ exams }: { exams: ExamProgress[] }) {
  if (exams.length === 0) return null;
  return (
    <ul className="m-0 list-none border-t p-0" style={{ borderColor: "var(--color-line)" }}>
      {exams.map((e) => {
        const cd = countdownInfo(e.examDate);
        const noData = e.totalCards === 0 && e.questionsAnswered === 0;
        return (
          <li
            key={e.examId}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b py-3.5"
            style={{ borderColor: "var(--color-line)" }}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                style={{ width: 8, height: 8, borderRadius: 99, background: examRgba(e.color, 0.9), flexShrink: 0 }}
              />
              <Link
                href={`/dashboard#exam-${e.examId}`}
                className="truncate text-[15px] font-medium"
                style={{ color: "var(--color-text)" }}
              >
                {e.title}
              </Link>
            </span>
            <span className="text-[13px]" style={{ color: "var(--color-text-dim)" }}>
              {cd.label}
              {noData
                ? " · noch nichts gelernt"
                : e.hasTopicData
                  ? ` · ${e.topicsDone} von ${e.topicsTotal} Themen sicher`
                  : ` · ${e.masteredCards} von ${e.totalCards} Karten beherrscht`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
