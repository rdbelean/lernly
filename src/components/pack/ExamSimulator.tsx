"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { CONFETTI_COLORS } from "@/lib/design/confetti";
import { Sparkles, Trophy, CheckCircle2, Target, AlertCircle, Flame } from "lucide-react";
import type { ExamLens, SimulatorQuestion } from "@/lib/schema";
import { examLensBadgeText, findTopicAppearances } from "@/lib/examLens";
import { renderRichText } from "@/lib/richText";
import { track } from "@/lib/analytics";
import TopicBreakdown from "./TopicBreakdown";
import { simulatorTopicRows } from "@/lib/pack/studyAnalysis";
import TutorChat from "./TutorChat";
import type { TutorScope } from "@/lib/tutorPrompt";

type Language = "en" | "de";


function burst(big = false) {
  if (typeof window === "undefined") return;
  confetti({
    particleCount: big ? 220 : 90,
    spread: big ? 120 : 80,
    origin: { y: 0.55 },
    colors: CONFETTI_COLORS,
    scalar: big ? 1.2 : 1,
  });
}

export default function ExamSimulator({
  questions,
  language = "de",
  examLens = null,
}: {
  questions: SimulatorQuestion[];
  language?: Language;
  examLens?: ExamLens | null;
}) {
  const isEn = language === "en";
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    new Array(questions.length).fill(null),
  );
  const [revealed, setRevealed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [tutorOpen, setTutorOpen] = useState(false);

  const q = questions[index];
  const answer = answers[index];
  const done = index >= questions.length;
  const correctSoFar = answers
    .slice(0, index)
    .filter((a, i) => a === questions[i]?.correctIndex).length;
  const progress = (index / questions.length) * 100;

  const completionFired = useRef(false);
  const firstAnswerFired = useRef(false);

  useEffect(() => {
    if (!done) return;
    if (completionFired.current) return;
    completionFired.current = true;
    const correct = answers.filter(
      (a, i) => a === questions[i]?.correctIndex,
    ).length;
    const pct = (correct / questions.length) * 100;
    if (pct >= 90) burst(true);
    else if (pct >= 70) burst(false);
  }, [done, answers, questions]);

  if (done || !q) {
    const correct = answers.filter(
      (a, i) => a === questions[i]?.correctIndex,
    ).length;
    const pct = Math.round((correct / questions.length) * 100);
    const tier =
      pct >= 90
        ? { Icon: Trophy, color: "var(--color-ok-ink)" }
        : pct >= 70
          ? { Icon: CheckCircle2, color: "var(--color-ok-ink)" }
          : pct >= 50
            ? { Icon: Target, color: "var(--color-urgent-ink)" }
            : { Icon: AlertCircle, color: "var(--color-err-ink)" };
    const TierIcon = tier.Icon;
    const topicRows = simulatorTopicRows(questions, answers);
    return (
      <div className="flex flex-col items-center gap-5 py-12 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 14 }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: `color-mix(in srgb, ${tier.color} 15%, transparent)` }}
        >
          <TierIcon size={30} strokeWidth={2} color={tier.color} />
        </motion.div>
        <div>
          <h3 className="text-[28px] font-bold tracking-[-0.6px] text-[color:var(--color-text)]">
            {isEn ? "Finished" : "Fertig"}
          </h3>
          <p className="mt-2 text-[14px]" style={{ color: "var(--color-ln-mute)" }}>
            {isEn
              ? `${correct} of ${questions.length} correct — ${pct}%`
              : `${correct} von ${questions.length} richtig — ${pct}%`}
          </p>
        </div>
        <TopicBreakdown rows={topicRows} language={language} />
        <button
          onClick={() => {
            setIndex(0);
            setAnswers(new Array(questions.length).fill(null));
            setRevealed(false);
            setStreak(0);
            completionFired.current = false;
          }}
          className="rounded-full bg-[color:var(--color-primary)] px-5 py-2.5 text-[13px] font-semibold text-[color:var(--color-on-primary)] transition hover:bg-[color:var(--color-primary-press)]"
        >
          {isEn ? "Start again" : "Nochmal starten"}
        </button>
      </div>
    );
  }

  const pick = (i: number) => {
    if (revealed) return;
    if (!firstAnswerFired.current) {
      firstAnswerFired.current = true;
      track("first_quiz_answered", {
        mode: "simulator",
        total_questions: questions.length,
        language,
      });
    }
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = i;
      return next;
    });
    setRevealed(true);
    const wasCorrect = i === q.correctIndex;
    setStreak((prev) => {
      const newStreak = wasCorrect ? prev + 1 : 0;
      if (newStreak > 0 && newStreak % 5 === 0) burst();
      return newStreak;
    });
  };

  const goNext = () => {
    setRevealed(false);
    setTutorOpen(false);
    setIndex((i) => i + 1);
  };

  // Altklausur provenance for the current question — matched via its
  // category against the lens snapshot. null = no badge (fail silent).
  const appearances = findTopicAppearances(examLens, q.category ?? null);

  return (
    <div className="mx-auto w-full max-w-[640px]">
      {!examLens && (
        <p
          className="mb-3 text-[12px] leading-relaxed"
          style={{ color: "var(--color-text-faint)" }}
        >
          Ohne Altklausuren schätze ich, was drankommt. Mit ihnen weiß ich es.
        </p>
      )}
      {/* Header: progress + score + streak */}
      <div
        className="flex items-center justify-between gap-3 text-[12px]"
        style={{ color: "var(--color-ln-mute)" }}
      >
        <span className="tabular-nums">
          {isEn ? "Question" : "Frage"} {index + 1} / {questions.length}
        </span>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {streak >= 2 && (
              <motion.span
                key={`streak-${streak}`}
                initial={{ scale: 1.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 18 }}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold"
                style={{
                  background: "var(--color-urgent-bg)",
                  color: "var(--color-urgent-ink)",
                  border: "1px solid var(--color-urgent-bg)",
                }}
              >
                <Flame size={12} strokeWidth={2.2} aria-hidden />
                {streak}
              </motion.span>
            )}
          </AnimatePresence>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums"
            style={{
              background: "var(--color-ink-a06)",
              color: "var(--color-text-dim)",
              border: "1px solid var(--color-ink-a10)",
            }}
          >
            {correctSoFar} / {index} {isEn ? "correct" : "richtig"}
          </span>
        </div>
      </div>

      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[color:var(--color-ink-a10)]">
        <motion.div
          className="h-full"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 180, damping: 25 }}
          style={{
            background:
              "linear-gradient(90deg, var(--color-ok-ink), var(--color-work-ink))",
          }}
        />
      </div>

      {/* Question card */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
        >
          {(appearances !== null || typeof q.points === "number") && (
            <div className="mt-5 flex flex-wrap items-center gap-1.5">
              {examLens && appearances !== null && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold"
                  style={{
                    background: "var(--color-ok-bg)",
                    borderColor: "var(--color-ok-ink)",
                    color: "var(--color-ok-ink)",
                  }}
                >
                  <Sparkles size={9} strokeWidth={2.2} aria-hidden />
                  {examLensBadgeText(appearances, examLens.examCount)}
                </span>
              )}
              {typeof q.points === "number" && (
                <span
                  className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold"
                  style={{
                    background: "var(--color-ink-a06)",
                    borderColor: "var(--color-ink-a14)",
                    color: "var(--color-text-dim)",
                  }}
                >
                  {q.points} {q.points === 1 ? "Punkt" : "Punkte"}
                </span>
              )}
            </div>
          )}

          {q.scenario && (
            <div
              className="mt-5 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-ink-a04)] px-5 py-4 text-[13px] leading-relaxed"
              style={{ color: "var(--color-ln-ink-soft)" }}
              dangerouslySetInnerHTML={{ __html: renderRichText(q.scenario) }}
            />
          )}

          <h3
            className="mt-5 text-[20px] font-semibold leading-snug text-[color:var(--color-text)]"
            dangerouslySetInnerHTML={{ __html: renderRichText(q.question) }}
          />

          <div className="mt-5 space-y-2.5">
            {q.options.map((opt, i) => {
              const isPicked = answer === i;
              const isCorrect = revealed && i === q.correctIndex;
              const isWrong = revealed && isPicked && i !== q.correctIndex;

              const border = isCorrect
                ? "var(--color-ok-ink)"
                : isWrong
                  ? "var(--color-err-ink)"
                  : isPicked
                    ? "var(--color-work-ink)"
                    : "var(--color-ink-a10)";
              const bg = isCorrect
                ? "var(--color-ok-bg)"
                : isWrong
                  ? "var(--color-err-bg)"
                  : isPicked
                    ? "var(--color-work-bg)"
                    : "var(--color-ink-a10)";
              const shadow = isCorrect
                ? "0 0 0 1px var(--color-ok-ink), 0 12px 32px -10px var(--color-ok-ink)"
                : isWrong
                  ? "0 0 0 1px var(--color-err-ink), 0 12px 32px -10px var(--color-err-ink)"
                  : "none";

              return (
                <motion.button
                  key={i}
                  onClick={() => pick(i)}
                  disabled={revealed}
                  whileHover={revealed ? undefined : { y: -1 }}
                  whileTap={revealed ? undefined : { scale: 0.99 }}
                  animate={
                    isCorrect
                      ? { scale: [1, 1.02, 1] }
                      : isWrong
                        ? { x: [0, -4, 4, -3, 3, 0] }
                        : { scale: 1, x: 0 }
                  }
                  transition={{ duration: 0.35 }}
                  className="flex w-full items-start gap-3 rounded-xl border px-5 py-4 text-left text-[15px] text-[color:var(--color-text)] transition sm:text-[16px]"
                  style={{
                    borderColor: border,
                    background: bg,
                    boxShadow: shadow,
                    cursor: revealed ? "not-allowed" : "pointer",
                  }}
                >
                  <span
                    className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums"
                    style={{
                      background: isCorrect
                        ? "var(--color-ok-bg)"
                        : isWrong
                          ? "var(--color-err-bg)"
                          : "var(--color-ink-a10)",
                      border: `1px solid ${isCorrect ? "var(--color-ok-ink)" : isWrong ? "var(--color-err-ink)" : "var(--color-ink-a14)"}`,
                      color: "white",
                    }}
                  >
                    {isCorrect ? "✓" : isWrong ? "✕" : String.fromCharCode(65 + i)}
                  </span>
                  <span
                    className="flex-1"
                    dangerouslySetInnerHTML={{ __html: renderRichText(opt) }}
                  />
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence>
            {revealed && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-5 overflow-hidden rounded-2xl border p-5"
                style={{
                  borderColor:
                    answer === q.correctIndex
                      ? "var(--color-ok-bg)"
                      : "var(--color-err-bg)",
                  background:
                    answer === q.correctIndex
                      ? "var(--color-ok-bg)"
                      : "var(--color-err-bg)",
                }}
              >
                <div
                  className="text-[12px] font-semibold tracking-[2px]"
                  style={{
                    color:
                      answer === q.correctIndex
                        ? "var(--color-ok-ink)"
                        : "var(--color-err-ink)",
                  }}
                >
                  {answer === q.correctIndex
                    ? isEn
                      ? "Correct"
                      : "Richtig"
                    : isEn
                      ? "Not quite"
                      : "Nicht ganz"}
                  {" · "}
                  {isEn ? "Explanation" : "Erklärung"}
                </div>
                <p
                  className="mt-2 text-[14px] leading-relaxed"
                  style={{ color: "var(--color-text-dim)" }}
                  dangerouslySetInnerHTML={{
                    __html: renderRichText(q.explanation),
                  }}
                />
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    onClick={goNext}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.96 }}
                    className="rounded-full bg-[color:var(--color-primary)] px-5 py-2 text-[13px] font-semibold text-[color:var(--color-on-primary)] transition hover:bg-[color:var(--color-primary-press)]"
                  >
                    {isEn ? "Next →" : "Weiter →"}
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => setTutorOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition"
                    style={{
                      background: "var(--color-work-bg)",
                      borderColor: "var(--color-work-bg)",
                      color: "var(--color-ln-cyan)",
                    }}
                  >
                    <Sparkles size={13} strokeWidth={1.9} aria-hidden />
                    {isEn ? "Explain it" : "Erklär's mir"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {q && (
        <TutorChat
          open={tutorOpen}
          onClose={() => setTutorOpen(false)}
          scope={
            {
              kind: "flashcard",
              question: q.question,
              answer: q.explanation,
              category: q.category,
            } satisfies TutorScope
          }
          language={language}
        />
      )}
    </div>
  );
}
