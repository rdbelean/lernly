import { Clock } from "lucide-react";
import { countdownInfo, countdownToneRgba, examRgba } from "@/lib/exams";
import type { ExamProgress } from "@/lib/dashboard/studentProgressShared";

function ExamProgressRow({ e }: { e: ExamProgress }) {
  const cd = countdownInfo(e.examDate);
  const muted = cd.tone === "past" || cd.tone === "undated";
  const noData = e.totalCards === 0 && e.questionsAnswered === 0;

  return (
    <div
      className="rounded-2xl border p-4 sm:p-5"
      style={{ background: "#141930", borderColor: "rgba(255,255,255,0.06)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: examRgba(e.color, 0.9),
              flexShrink: 0,
            }}
          />
          <span
            className="truncate text-[15px] font-semibold"
            style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
          >
            {e.title}
          </span>
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]"
          style={{
            background: muted ? "rgba(255,255,255,0.06)" : countdownToneRgba(cd.tone, 0.14),
            color: muted ? "var(--color-text-faint)" : countdownToneRgba(cd.tone, 1),
          }}
        >
          <Clock size={10} strokeWidth={2.2} aria-hidden />
          {cd.label}
        </span>
      </div>

      {noData ? (
        <p className="mt-3 text-[13px]" style={{ color: "var(--color-text-faint)" }}>
          Noch nichts gelernt — leg los.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-between text-[12px]">
            <span style={{ color: "var(--color-text-dim)" }}>
              <span style={{ color: "var(--color-text)", fontWeight: 600 }}>
                {e.masteryPct}%
              </span>{" "}
              bereit
            </span>
            <span style={{ color: "var(--color-text-faint)" }}>
              {e.masteredCards}/{e.totalCards} Karten
            </span>
          </div>
          <div
            aria-hidden
            className="mt-1.5 h-[6px] w-full overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${e.masteryPct}%`, background: examRgba(e.color, 0.9) }}
            />
          </div>
          <div
            className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px]"
            style={{ color: "var(--color-text-dim)" }}
          >
            <span>{e.questionsAnswered} Fragen beantwortet</span>
            {e.hasTopicData && (
              <span>
                {e.topicsDone}/{e.topicsTotal} Themen durch
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function ExamProgressList({ exams }: { exams: ExamProgress[] }) {
  if (exams.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {exams.map((e) => (
        <ExamProgressRow key={e.examId} e={e} />
      ))}
    </div>
  );
}
