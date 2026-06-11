import DeletePackButton from "@/app/dashboard/pack/[id]/delete-button";
import { countdownInfo, examRgba } from "@/lib/exams";
import { ChevronRight, Clock } from "lucide-react";
import FeedbackLink from "@/components/FeedbackLink";
import PackTitle from "./PackTitle";

// =========================================================================
// PackHeader — the persistent "where am I" context bar at the top of every
// pack page. Sits above PackView's tab bar so it stays visible across tab
// switches.
// =========================================================================
// V1 slots: breadcrumb, H1 course title, meta chips, exam pill with
// countdown, delete button. Designed mobile-first.
// =========================================================================

export type PackMeta = { label: string };

export type PackExamSummary = {
  title: string;
  exam_date: string | null;
  color: string | null;
};

export default function PackHeader({
  courseTitle,
  packId,
  meta,
  exam,
}: {
  courseTitle: string;
  packId: string;
  meta: PackMeta[];
  exam: PackExamSummary | null;
}) {
  return (
    <header>
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-[12px]"
        style={{ color: "var(--color-text-faint)" }}
      >
        <a
          href="/dashboard"
          className="transition hover:text-white"
        >
          Bibliothek
        </a>
        <ChevronRight size={12} strokeWidth={2} aria-hidden />
        <span
          className="truncate"
          style={{ color: "var(--color-text-dim)" }}
        >
          {courseTitle}
        </span>
        <FeedbackLink compact className="ml-auto" />
      </nav>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3 sm:mt-4 sm:flex-nowrap">
        <div className="min-w-0 flex-1">
          <PackTitle packId={packId} initialTitle={courseTitle} />
          {meta.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {meta.map((m, i) => (
                <span key={i} className="ln-mono-tag">
                  {m.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {exam && <ExamPill exam={exam} />}
          <DeletePackButton id={packId} />
        </div>
      </div>
    </header>
  );
}

function ExamPill({ exam }: { exam: PackExamSummary }) {
  const countdown = countdownInfo(exam.exam_date);
  const isUndated =
    countdown.tone === "undated" || countdown.tone === "past";
  return (
    <a
      href="/dashboard"
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition hover:bg-white/5"
      style={{
        background: examRgba(exam.color, 0.06),
        borderColor: examRgba(exam.color, 0.28),
        color: "var(--color-text)",
      }}
      title="Zur Klausur in der Bibliothek"
    >
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: examRgba(exam.color, 0.9) }}
      />
      <span className="max-w-[28ch] truncate">{exam.title}</span>
      {!isUndated && (
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]"
          style={{
            background: "rgba(242, 163, 60, 0.14)",
            color: "var(--color-amber)",
          }}
        >
          <Clock size={10} strokeWidth={2.2} aria-hidden />
          {countdown.label}
        </span>
      )}
    </a>
  );
}
