"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles } from "lucide-react";
import type { ExamLens, OpenQuestion } from "@/lib/schema";
import { examLensBadgeText, findTopicAppearances } from "@/lib/examLens";
import { renderRichText } from "@/lib/richText";
import TutorChat from "./TutorChat";
import type { TutorScope } from "@/lib/tutorPrompt";

type Language = "en" | "de";

export default function OpenQuestionsView({
  questions,
  language = "de",
  examLens = null,
}: {
  questions: OpenQuestion[];
  language?: Language;
  examLens?: ExamLens | null;
}) {
  const isEn = language === "en";
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);

  if (questions.length === 0) {
    return (
      <p className="text-[14px]" style={{ color: "var(--color-ln-mute)" }}>
        {isEn ? "No questions available." : "Keine Fragen verfügbar."}
      </p>
    );
  }

  const q = questions[Math.min(index, questions.length - 1)];
  // Altklausur provenance via the question's category — null = no badge.
  const appearances = findTopicAppearances(examLens, q.category ?? null);

  const go = (delta: number) => {
    setRevealed(false);
    setTutorOpen(false);
    setIndex((i) => Math.max(0, Math.min(questions.length - 1, i + delta)));
  };

  return (
    <div>
      <div
        className="mb-4 flex items-center justify-between gap-2 text-[12px]"
        style={{ color: "var(--color-ln-mute)" }}
      >
        <span>
          {isEn ? "Question" : "Frage"} {index + 1} / {questions.length}
        </span>
        <span className="flex flex-wrap items-center justify-end gap-1.5">
          {q.category && <span>{q.category}</span>}
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
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          <div
            className="rounded-2xl border bg-[color:var(--color-ink-a04)] p-5"
            style={{ borderColor: "var(--color-ink-a14)" }}
          >
            <p
              className="text-[16px] leading-relaxed text-[color:var(--color-text)]"
              dangerouslySetInnerHTML={{ __html: renderRichText(q.question) }}
            />

            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="mt-5 rounded-full bg-[color:var(--color-primary)] px-5 py-2 text-[13px] font-semibold text-[color:var(--color-on-primary)] transition hover:bg-[color:var(--color-primary-press)]"
              >
                {isEn ? "Reveal answer" : "Antwort aufdecken"}
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="mt-5 space-y-4"
              >
                <div>
                  <div
                    className="mb-2 text-[12px] font-medium tracking-[2px]"
                    style={{ color: "var(--color-ln-mute)" }}
                  >
                    {isEn ? "Model answer" : "Musterlösung"}
                  </div>
                  <div
                    className="text-[14px] leading-relaxed text-[color:var(--color-text-dim)]"
                    dangerouslySetInnerHTML={{
                      __html: renderRichText(q.modelAnswer),
                    }}
                  />
                </div>
                {q.keyPoints.length > 0 && (
                  <div
                    className="rounded-xl border p-4"
                    style={{
                      background: "var(--color-work-bg)",
                      borderColor: "var(--color-work-bg)",
                    }}
                  >
                    <div
                      className="mb-2 text-[12px] font-medium tracking-[2px]"
                      style={{ color: "var(--color-ln-cyan)" }}
                    >
                      {isEn ? "Must include" : "Das muss rein"}
                    </div>
                    <ul className="space-y-1.5">
                      {q.keyPoints.map((kp, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-[13px] text-[color:var(--color-text-dim)]"
                        >
                          <span aria-hidden style={{ color: "var(--color-ln-cyan)" }}>
                            ✓
                          </span>
                          <span
                            dangerouslySetInnerHTML={{ __html: renderRichText(kp) }}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
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
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => go(-1)}
          disabled={index === 0}
          className="rounded-full border border-[color:var(--color-line)] px-4 py-2 text-[13px] text-[color:var(--color-text-dim)] transition hover:text-[color:var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← {isEn ? "Back" : "Zurück"}
        </button>
        <button
          onClick={() => go(1)}
          disabled={index === questions.length - 1}
          className="rounded-full border border-[color:var(--color-line)] px-4 py-2 text-[13px] text-[color:var(--color-text-dim)] transition hover:text-[color:var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isEn ? "Next" : "Weiter"} →
        </button>
      </div>

      <TutorChat
        open={tutorOpen}
        onClose={() => setTutorOpen(false)}
        scope={
          {
            kind: "flashcard",
            question: q.question,
            answer: q.modelAnswer,
            category: q.category,
          } satisfies TutorScope
        }
        language={language}
      />
    </div>
  );
}
