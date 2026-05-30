import DeletePackButton from "@/app/dashboard/pack/[id]/delete-button";
import {
  countdownInfo,
  countdownToneRgba,
  examRgba,
} from "@/lib/exams";

// =========================================================================
// PackHeader — the persistent "where am I" context bar at the top of every
// pack page. Sits above PackView's tab bar so it stays visible across tab
// switches (Visual Map / Karteikarten / Übungsklausur / Offene Fragen).
// =========================================================================
// V1 slots: breadcrumb, section-label, H1 course title, meta chips, exam
// pill with countdown, delete button. Designed mobile-first — on a phone
// the right-side column wraps below the title; on desktop the exam pill
// + delete sit on the right of the title row.
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
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-[12px]"
        style={{ color: "rgba(255,255,255,0.45)" }}
      >
        <a href="/dashboard" className="transition hover:text-white">
          Bibliothek
        </a>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span
          className="truncate"
          style={{ color: "rgba(255,255,255,0.75)" }}
        >
          {courseTitle}
        </span>
      </nav>

      {/* Title row — title left, exam-pill + delete right (wraps on mobile).
          Title is intentionally compact: the breadcrumb above orients the
          user, and the body of the page leads with action (hub + mode
          launcher) instead of a hero headline. */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3 sm:mt-4 sm:flex-nowrap">
        <div className="min-w-0 flex-1">
          <h1
            className="font-bold leading-tight tracking-[-0.5px] text-white"
            style={{ fontSize: "clamp(20px, 3vw, 30px)" }}
          >
            {courseTitle}
          </h1>
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
        color: "rgba(255,255,255,0.85)",
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
          className="rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em]"
          style={{
            background: countdownToneRgba(countdown.tone, 0.14),
            color: countdownToneRgba(countdown.tone, 1),
          }}
        >
          {countdown.label}
        </span>
      )}
    </a>
  );
}
