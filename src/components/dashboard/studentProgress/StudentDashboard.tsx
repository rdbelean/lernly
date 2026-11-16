import type { StudentProgress } from "@/lib/dashboard/studentProgressShared";
import type { ExamMapData } from "@/lib/dashboard/examMap.server";
import { daysLeft, pickNextStep } from "@/lib/dashboard/examMap";
import NextStep from "@/components/dashboard/NextStep";
import ExamMap from "@/components/dashboard/ExamMap";
import StudyHeatmap from "./StudyHeatmap";
import StreakCard from "./StreakCard";
import ExamProgressList from "./ExamProgressList";
import HeuteDran from "./HeuteDran";

// Dashboard top: ONE next step, the exam map (area = weight, color = status)
// and what is due today. Server-rendered; receives pre-aggregated data only.
export default function StudentDashboard({
  progress,
  focus,
  today,
}: {
  progress: StudentProgress;
  focus: ExamMapData | null;
  today: string;
}) {
  const { streak, heatmap, exams, due } = progress;
  const next = focus ? pickNextStep(focus.topics) : null;
  const otherExams = exams.filter((e) => e.examId !== focus?.examId);
  const packHref = (packId: string) => `/dashboard/pack/${packId}`;

  return (
    <div className="mb-12 space-y-10">
      {focus && focus.topics.length > 0 ? (
        <>
          <NextStep
            examTitle={focus.examTitle}
            daysLeft={daysLeft(focus.examDate, today)}
            topic={next}
            href={next ? packHref(next.packId) : "/dashboard/review"}
          />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <ExamMap
              topics={focus.topics}
              nextKey={next?.key}
              hrefFor={(t) => packHref(t.packId)}
            />
            <aside className="space-y-6">
              <HeuteDran dueCount={due.count} />
              <StreakCard current={streak.current} longest={streak.longest} />
            </aside>
          </div>
        </>
      ) : (
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <HeuteDran dueCount={due.count} />
          <StreakCard current={streak.current} longest={streak.longest} />
        </div>
      )}

      {otherExams.length > 0 && <ExamProgressList exams={otherExams} />}

      <StudyHeatmap heatmap={heatmap} />
    </div>
  );
}
