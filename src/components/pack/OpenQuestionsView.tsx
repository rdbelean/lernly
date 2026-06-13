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
              className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em]"
              style={{
                background: "rgba(79,209,165,0.10)",
                borderColor: "#4FD1A5",
                color: "#4FD1A5",
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
            className="rounded-2xl border bg-black/20 p-5"
            style={{ borderColor: "rgba(255,255,255,0.12)" }}
          >
            <p className="text-[16px] leading-relaxed text-white">{q.question}</p>

            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="mt-5 rounded-full bg-white px-5 py-2 text-[13px] font-semibold text-[#0F1535] transition hover:bg-white/90"
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
                    className="mb-2 text-[11px] font-medium uppercase tracking-[2px]"
                    style={{ color: "var(--color-ln-mute)" }}
                  >
                    {isEn ? "Model answer" : "Musterlösung"}
                  </div>
                  <div
                    className="text-[14px] leading-relaxed text-white/90"
                    dangerouslySetInnerHTML={{
                      __html: renderRichText(q.modelAnswer),
                    }}
                  />
                </div>
                {q.keyPoints.length > 0 && (
                  <div
                    className="rounded-xl border p-4"
                    style={{
                      background: "rgba(34,211,238,0.06)",
                      borderColor: "rgba(34,211,238,0.2)",
                    }}
                  >
                    <div
                      className="mb-2 text-[11px] font-medium uppercase tracking-[2px]"
                      style={{ color: "var(--color-ln-cyan)" }}
                    >
                      {isEn ? "Must include" : "Das muss rein"}
                    </div>
                    <ul className="space-y-1.5">
                      {q.keyPoints.map((kp, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-[13px] text-white/80"
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
                      background: "rgba(91,184,216,0.06)",
                      borderColor: "rgba(91,184,216,0.3)",
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
          className="rounded-full border border-white/15 px-4 py-2 text-[13px] text-white/70 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← {isEn ? "Back" : "Zurück"}
        </button>
        <button
          onClick={() => go(1)}
          disabled={index === questions.length - 1}
          className="rounded-full border border-white/15 px-4 py-2 text-[13px] text-white/70 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
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
