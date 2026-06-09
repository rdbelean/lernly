import { Layers, ListChecks, CalendarDays, BookOpen } from "lucide-react";
import type { StudentProgress } from "@/lib/dashboard/studentProgressShared";
import StatTile from "@/components/ui/StatTile";
import StudyHeatmap from "./StudyHeatmap";
import StreakCard from "./StreakCard";
import ExamProgressList from "./ExamProgressList";
import HeuteDran from "./HeuteDran";

// Student progress hub at the top of the library. Server-rendered; receives
// only pre-aggregated, serializable data. The page renders this only when the
// user has content (exams/packs); truly-new users get ProgressEmptyState from
// the page instead. With content but no study yet, this shows honest zeros +
// per-exam rows (a "start studying" state), not empty-state copy.
export default function StudentDashboard({
  progress,
}: {
  progress: StudentProgress;
}) {
  const { streak, heatmap, totals, exams, due } = progress;

  return (
    <div className="mb-10 space-y-5">
      <div
        className="rounded-2xl border p-5"
        style={{ background: "#141930", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <StreakCard current={streak.current} longest={streak.longest} />
          <StudyHeatmap heatmap={heatmap} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={Layers}
          chipBg="rgba(79,209,165,0.14)"
          chipFg="var(--color-cat-teal)"
          label="Karten beherrscht"
          value={String(totals.masteredCards)}
        />
        <StatTile
          icon={ListChecks}
          chipBg="rgba(110,128,242,0.16)"
          chipFg="var(--color-primary-bright)"
          label="Fragen beantwortet"
          value={String(totals.questionsAnswered)}
        />
        <StatTile
          icon={CalendarDays}
          chipBg="rgba(242,163,60,0.14)"
          chipFg="var(--color-amber)"
          label="Lern-Tage"
          value={String(totals.studyDays)}
        />
        <StatTile
          icon={BookOpen}
          chipBg="rgba(255,255,255,0.06)"
          chipFg="var(--color-text-dim)"
          label="Pakete"
          value={String(totals.packs)}
        />
      </div>

      {exams.length > 0 && (
        <div>
          <p
            className="mb-3 text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "var(--color-text-faint)" }}
          >
            Fortschritt pro Klausur
          </p>
          <ExamProgressList exams={exams} />
        </div>
      )}

      <HeuteDran dueCount={due.count} />
    </div>
  );
}
