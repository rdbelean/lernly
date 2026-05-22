"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { OpenQuestion } from "@/lib/schema";
import { toSafeInlineHtml } from "@/lib/richText";

type Language = "en" | "de";

export default function OpenQuestionsView({
  questions,
  language = "de",
}: {
  questions: OpenQuestion[];
  language?: Language;
}) {
  const isEn = language === "en";
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (questions.length === 0) {
    return (
      <p className="text-[14px]" style={{ color: "var(--color-ln-mute)" }}>
        {isEn ? "No questions available." : "Keine Fragen verfügbar."}
      </p>
    );
  }

  const q = questions[Math.min(index, questions.length - 1)];

  const go = (delta: number) => {
    setRevealed(false);
    setIndex((i) => Math.max(0, Math.min(questions.length - 1, i + delta)));
  };

  return (
    <div>
      <div
        className="mb-4 flex items-center justify-between text-[12px]"
        style={{ color: "var(--color-ln-mute)" }}
      >
        <span>
          {isEn ? "Question" : "Frage"} {index + 1} / {questions.length}
        </span>
        {q.category && <span>{q.category}</span>}
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
                      __html: toSafeInlineHtml(q.modelAnswer),
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
                            dangerouslySetInnerHTML={{ __html: toSafeInlineHtml(kp) }}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
    </div>
  );
}
