"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { RotateCcw, Upload } from "lucide-react";
import { DailyPlan } from "@/components/study/DailyPlan";
import { StatStrip } from "@/components/study/StatStrip";
import { StudyHeader } from "@/components/study/StudyHeader";
import { PointsViz } from "@/components/study/viz/PointsViz";
import {
  clearCustomCourse,
  getServerActiveCourseSnapshot,
  readActiveCourseSnapshot,
  subscribeActiveCourse,
} from "@/lib/study/courseStore";
import {
  getDailyPlanMinutes,
  getPrimaryFocusTopic,
  getSecuredPoints,
  getTotalPoints,
} from "@/lib/study/seed";
import {
  getServerStudyProgressSnapshot,
  readStudyProgress,
  subscribeStudyProgress,
} from "@/lib/study/storage";
import type { DashboardVizMode, StudyCourseSeed } from "@/lib/study/types";

type HeuteDashboardProps = {
  course?: StudyCourseSeed;
  vizMode?: DashboardVizMode;
  useLiveProgress?: boolean;
  showUploadLink?: boolean;
};

function splitHeadline(topicName: string): [string, string] {
  const parts = topicName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return [`Heute: ${topicName}`, ""];
  }
  const last = parts.pop() ?? "";
  return [`Heute: ${parts.join(" ")}`, last];
}

export function HeuteDashboard({
  course: explicitCourse,
  vizMode = "leiste",
  useLiveProgress = true,
  showUploadLink = true,
}: HeuteDashboardProps) {
  const storedCourse = useSyncExternalStore(
    subscribeActiveCourse,
    readActiveCourseSnapshot,
    getServerActiveCourseSnapshot,
  );
  const progress = useSyncExternalStore(
    subscribeStudyProgress,
    readStudyProgress,
    getServerStudyProgressSnapshot,
  );

  const course = explicitCourse ?? storedCourse.course;
  const isCustomCourse = !explicitCourse && storedCourse.isCustom;

  const reviewedCount = useLiveProgress
    ? Object.keys(progress.cardReviews).length
    : 0;
  const dueCardsCount = Math.max(course.flashcards.length - reviewedCount, 0);
  const streakDays = useLiveProgress
    ? progress.streakDays
    : course.initialStreakDays;

  const totalPoints = getTotalPoints(course.topics);
  const securedPoints = getSecuredPoints(course.topics);
  const focusTopic = getPrimaryFocusTopic(course.topics);
  const totalMinutes = getDailyPlanMinutes(course.dailyPlan);
  const [line1, line2] = splitHeadline(focusTopic.name);

  return (
    <main className="mx-auto w-full max-w-[1120px] px-8 py-8 sm:px-12 sm:py-10 lg:px-14">
      <StudyHeader
        dateLabel={course.dateLabel}
        courseName={course.courseName}
        examCountdownLabel={course.examCountdownLabel}
      />

      <section aria-labelledby="heute-heading">
        <h1
          id="heute-heading"
          className="font-display text-[48px] font-bold leading-[1.03] tracking-[-0.035em] text-text sm:text-[64px] lg:text-[72px]"
        >
          {line1}
          {line2 ? (
            <>
              <br />
              {line2}
            </>
          ) : null}
          <span
            aria-hidden="true"
            className="ml-[0.06em] inline-block h-[0.155em] w-[0.155em] bg-primary align-baseline"
          />
        </h1>

        <p className="mt-5 max-w-[490px] text-[16px] leading-[1.55] text-text-dim sm:text-[17px]">
          {focusTopic.points} von {totalPoints} Klausurpunkten, davon hast du{" "}
          {focusTopic.mastery} %. {totalMinutes} Minuten reichen für heute.
        </p>
      </section>

      <StatStrip
        securedPoints={securedPoints}
        totalPoints={totalPoints}
        dueCardsCount={dueCardsCount}
        streakDays={streakDays}
        ctaHref={course.flashcards.length > 0 ? "/karten" : "/rechnen"}
        ctaLabel="Heute starten"
      />

      <PointsViz mode={vizMode} topics={course.topics} />

      <DailyPlan items={course.dailyPlan} totalMinutes={totalMinutes} />

      {showUploadLink ? (
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5 text-[13px] text-text-dim">
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 font-medium text-text-dim transition-colors hover:text-text"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Eigene Unterlagen hochladen oder Kurs importieren</span>
          </Link>

          {isCustomCourse ? (
            <button
              type="button"
              onClick={() => clearCustomCourse()}
              className="inline-flex items-center gap-1.5 font-medium text-text-dim transition-colors hover:text-text"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Demo-Kurs laden</span>
            </button>
          ) : null}
        </footer>
      ) : null}
    </main>
  );
}
