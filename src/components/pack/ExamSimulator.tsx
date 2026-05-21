"use client";

import { useState } from "react";
import type { SimulatorQuestion } from "@/lib/schema";

type Language = "en" | "de";

export default function ExamSimulator({
  questions,
  language = "de",
}: {
  questions: SimulatorQuestion[];
  language?: Language;
}) {
  const isEn = language === "en";
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    new Array(questions.length).fill(null),
  );
  const [revealed, setRevealed] = useState(false);

  const q = questions[index];
  const answer = answers[index];
  const done = index >= questions.length;

  if (done || !q) {
    const correct = answers.filter((a, i) => a === questions[i]?.correctIndex).length;
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        <div className="text-[44px]">🏁</div>
        <h3 className="text-[24px] font-semibold tracking-[-0.4px] text-white">
          {isEn ? "Finished" : "Fertig"}
        </h3>
        <p className="text-[14px]" style={{ color: "var(--color-ln-mute)" }}>
          {isEn
            ? `${correct} of ${questions.length} correct.`
            : `${correct} von ${questions.length} richtig.`}
        </p>
        <button
          onClick={() => {
            setIndex(0);
            setAnswers(new Array(questions.length).fill(null));
            setRevealed(false);
          }}
          className="rounded-lg bg-white px-4 py-2 text-[13px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
        >
          {isEn ? "Start again" : "Nochmal starten"}
        </button>
      </div>
    );
  }

  const pick = (i: number) => {
    if (revealed) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = i;
      return next;
    });
    setRevealed(true);
  };

  return (
    <div>
      <div className="text-[12px]" style={{ color: "var(--color-ln-mute)" }}>
        {isEn ? "Question" : "Frage"} {index + 1} / {questions.length}
      </div>

      {q.scenario && (
        <div
          className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4 text-[13px] leading-relaxed"
          style={{ color: "var(--color-ln-ink-soft)" }}
        >
          {q.scenario}
        </div>
      )}

      <h3 className="mt-4 text-[19px] font-semibold leading-snug text-white">
        {q.question}
      </h3>

      <div className="mt-5 space-y-2">
        {q.options.map((opt, i) => {
          const isPicked = answer === i;
          const isCorrect = revealed && i === q.correctIndex;
          const isWrong = revealed && isPicked && i !== q.correctIndex;
          const tone = isCorrect
            ? "border-[color:var(--color-ln-sage)]/60 bg-[color:var(--color-ln-sage)]/10"
            : isWrong
              ? "border-[color:var(--color-ln-rose)]/60 bg-[color:var(--color-ln-rose)]/10"
              : isPicked
                ? "border-[color:var(--color-ln-cyan)] bg-[color:var(--color-ln-cyan)]/10"
                : "border-white/10 bg-black/20 hover:border-white/25";
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={revealed}
              className={
                "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-[14px] text-white transition " +
                tone +
                (revealed ? " cursor-not-allowed" : "")
              }
            >
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/30 text-[11px] font-medium">
                {String.fromCharCode(65 + i)}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div
          className="mt-5 rounded-xl border p-5"
          style={{
            borderColor: "rgba(91,184,216,0.3)",
            background: "rgba(91,184,216,0.08)",
          }}
        >
          <div
            className="text-[11px] font-medium uppercase tracking-[2px]"
            style={{ color: "var(--color-ln-cyan)" }}
          >
            {isEn ? "Explanation" : "Erklärung"}
          </div>
          <p
            className="mt-2 text-[14px] leading-relaxed"
            style={{ color: "var(--color-ln-ink-soft)" }}
          >
            {q.explanation}
          </p>
          <button
            onClick={() => {
              setRevealed(false);
              setIndex((i) => i + 1);
            }}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-[13px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
          >
            {isEn ? "Next →" : "Weiter →"}
          </button>
        </div>
      )}
    </div>
  );
}
