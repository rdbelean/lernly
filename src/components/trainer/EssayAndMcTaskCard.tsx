"use client";

import { useState } from "react";
import { Check, CheckSquare, Square, X } from "lucide-react";
import { BlockRenderer, InlineRichText } from "@/components/trainer/BlockRenderer";
import { toggleTrainerChecklistItem } from "@/lib/trainer/store";
import type { McpEssayTask, McpMcTask } from "@/lib/trainer/types";

export function EssayTaskCard({
  task,
  checkedIndices,
}: {
  task: McpEssayTask;
  checkedIndices: readonly number[];
}) {
  const [showModel, setShowModel] = useState(false);

  const earnedPoints = task.checklist.reduce(
    (sum, item, idx) => (checkedIndices.includes(idx) ? sum + item.points : sum),
    0,
  );

  return (
    <article className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-work-bg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] text-work-ink">
          {task.originLabel ?? `Textaufgabe · ${task.points} P`}
        </span>
        <span className="font-display text-[14px] font-bold tabular-nums text-primary">
          Checkliste: {earnedPoints} / {task.points} P
        </span>
      </div>

      <h3 className="mt-3 font-display text-[19px] font-bold text-text">
        <InlineRichText md={task.name} />
      </h3>

      <p className="mt-2.5 text-[15px] text-text">
        <InlineRichText md={task.question} />
      </p>

      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-dim">
          Wo die Klausurpunkte liegen (zum Abhaken)
        </p>
        <ul className="space-y-2">
          {task.checklist.map((item, idx) => {
            const isChecked = checkedIndices.includes(idx);
            return (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => toggleTrainerChecklistItem(task.id, idx)}
                  className={`flex w-full items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[14px] transition ${
                    isChecked
                      ? "border-ok-ink bg-ok-bg/45 text-text"
                      : "border-line bg-bg text-text hover:bg-surface-2"
                  }`}
                >
                  <span className="flex items-start gap-2.5">
                    {isChecked ? (
                      <CheckSquare
                        className="mt-0.5 h-4 w-4 shrink-0 text-ok-ink"
                        aria-hidden="true"
                      />
                    ) : (
                      <Square
                        className="mt-0.5 h-4 w-4 shrink-0 text-text-dim"
                        aria-hidden="true"
                      />
                    )}
                    <InlineRichText md={item.text} />
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-urgent-ink">
                    +{item.points} P
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {task.modelAnswer && task.modelAnswer.length > 0 ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setShowModel((v) => !v)}
            className="inline-flex h-10 items-center rounded-lg border border-line bg-surface-2 px-4 text-[14px] font-semibold text-text transition hover:opacity-85"
          >
            {showModel ? "Musterantwort ausblenden" : "Musterantwort ansehen"}
          </button>

          {showModel ? (
            <div className="mt-4">
              <BlockRenderer blocks={task.modelAnswer} />
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function McTaskCard({ task }: { task: McpMcTask }) {
  const [selected, setSelected] = useState<Record<number, number>>({});

  return (
    <article className="rounded-2xl border border-line bg-surface p-6">
      <span className="rounded-full bg-work-bg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] text-work-ink">
        Multiple Choice · {task.questions.length} Fragen
      </span>

      <h3 className="mt-3 font-display text-[19px] font-bold text-text">
        <InlineRichText md={task.name} />
      </h3>

      <div className="mt-4 space-y-5 divide-y divide-line">
        {task.questions.map((q, qIdx) => {
          const picked = selected[qIdx];
          const answered = typeof picked === "number";
          const correct = answered && picked === q.answer;

          return (
            <div key={qIdx} className={qIdx > 0 ? "pt-5" : ""}>
              <p className="text-[15px] font-semibold text-text">
                {qIdx + 1}. <InlineRichText md={q.q} />
              </p>

              <div className="mt-2.5 space-y-2">
                {q.options.map((opt, optIdx) => {
                  const isPicked = picked === optIdx;
                  const isRight = q.answer === optIdx;
                  let style = "border-line bg-bg text-text hover:bg-surface-2";
                  if (answered) {
                    if (isRight) {
                      style = "border-ok-ink bg-ok-bg/60 text-ok-ink";
                    } else if (isPicked) {
                      style = "border-err-ink bg-err-bg/60 text-err-ink";
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() =>
                        setSelected((prev) => ({ ...prev, [qIdx]: optIdx }))
                      }
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[14px] transition ${style}`}
                    >
                      <InlineRichText md={opt} />
                      {answered && isRight ? (
                        <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                      ) : answered && isPicked ? (
                        <X className="h-4 w-4 shrink-0" aria-hidden="true" />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {answered && q.explain ? (
                <p
                  className={`mt-2.5 text-[13.5px] ${
                    correct ? "text-ok-ink" : "text-err-ink"
                  }`}
                >
                  <InlineRichText md={q.explain} />
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </article>
  );
}
