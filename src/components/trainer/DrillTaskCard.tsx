"use client";

import { useState } from "react";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { BlockRenderer, InlineRichText } from "@/components/trainer/BlockRenderer";
import { evaluateDrillField } from "@/lib/trainer/importer";
import { markTrainerDrillSolved } from "@/lib/trainer/store";
import type { McpDrillTask } from "@/lib/trainer/types";

type DrillTaskCardProps = {
  task: McpDrillTask;
  solved: boolean;
};

function formatNumberDe(n: number): string {
  return String(Math.round(n * 100) / 100).replace(".", ",");
}

export function DrillTaskCard({ task, solved }: DrillTaskCardProps) {
  const [variantIdx, setVariantIdx] = useState(0);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [choiceVal, setChoiceVal] = useState<string>("");
  const [checked, setChecked] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const variant = task.variants[variantIdx] ?? task.variants[0];

  const fieldResults = variant.fields.map((field, idx) =>
    evaluateDrillField(inputs[idx] ?? "", field),
  );
  const choiceOk =
    !variant.choice || choiceVal === variant.choice.answer;
  const allCorrect =
    checked && fieldResults.every((r) => r.ok) && choiceOk;

  function nextVariant() {
    setVariantIdx((i) => (i + 1) % task.variants.length);
    setInputs({});
    setChoiceVal("");
    setChecked(false);
    setShowSolution(false);
  }

  function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setChecked(true);
    const okNow =
      variant.fields.every((field, idx) =>
        evaluateDrillField(inputs[idx] ?? "", field).ok,
      ) && choiceOk;
    if (okNow) {
      markTrainerDrillSolved(task.id);
      setShowSolution(true);
    }
  }

  return (
    <article className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] ${
              task.origin === "altklausur"
                ? "bg-urgent-bg text-urgent-ink"
                : "bg-work-bg text-work-ink"
            }`}
          >
            {task.originLabel ??
              (task.origin === "altklausur" ? "Altklausur" : "Rechen-Drill")}
          </span>
          {solved ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-ok-bg px-2.5 py-0.5 text-[11px] font-bold text-ok-ink">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              <span>Gelöst</span>
            </span>
          ) : null}
        </div>

        {task.variants.length > 1 ? (
          <button
            type="button"
            onClick={nextVariant}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-text transition hover:opacity-85"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              Neue Zahlen ({variantIdx + 1}/{task.variants.length})
            </span>
          </button>
        ) : null}
      </div>

      <h3 className="mt-3 font-display text-[19px] font-bold text-text">
        <InlineRichText md={task.name} />
      </h3>

      <div className="mt-2.5 text-[15px] text-text">
        <InlineRichText md={variant.text} />
      </div>

      <form onSubmit={handleCheck} className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {variant.fields.map((field, idx) => {
            const evalRes = checked ? fieldResults[idx] : null;
            return (
              <label
                key={field.label}
                className={`block rounded-xl border p-3 transition ${
                  evalRes?.ok
                    ? "border-ok-ink bg-ok-bg/40"
                    : evalRes && !evalRes.ok
                      ? "border-err-ink bg-err-bg/40"
                      : "border-line bg-bg"
                }`}
              >
                <span className="flex items-center justify-between text-[12px] font-semibold text-text-dim">
                  <span>{field.label}</span>
                  {evalRes ? (
                    evalRes.ok ? (
                      <CheckCircle2
                        className="h-3.5 w-3.5 text-ok-ink"
                        aria-hidden="true"
                      />
                    ) : (
                      <XCircle
                        className="h-3.5 w-3.5 text-err-ink"
                        aria-hidden="true"
                      />
                    )
                  ) : null}
                </span>

                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={inputs[idx] ?? ""}
                    onChange={(ev) => {
                      setInputs((prev) => ({
                        ...prev,
                        [idx]: ev.target.value,
                      }));
                      if (checked) setChecked(false);
                    }}
                    className="w-full min-w-0 bg-transparent font-display text-[20px] font-bold text-text tabular-nums outline-none"
                  />
                  {field.unit ? (
                    <span className="shrink-0 text-[14px] font-medium text-text-dim">
                      {field.unit}
                    </span>
                  ) : null}
                </div>

                {evalRes && !evalRes.ok ? (
                  <p className="mt-1 text-[12px] font-medium text-err-ink">
                    Zielwert: {formatNumberDe(field.answer)}{" "}
                    {field.unit ?? ""}
                  </p>
                ) : null}
              </label>
            );
          })}
        </div>

        {variant.choice ? (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <span className="text-[13px] font-semibold text-text-dim">
              {variant.choice.label}:
            </span>
            <div className="flex flex-wrap gap-2">
              {variant.choice.options.map((opt) => {
                const selected = choiceVal === opt;
                const wrongSelection = checked && selected && !choiceOk;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setChoiceVal(opt);
                      if (checked) setChecked(false);
                    }}
                    className={`rounded-lg border px-4 py-1.5 text-[14px] font-semibold transition ${
                      wrongSelection
                        ? "border-err-ink bg-err-bg text-err-ink"
                        : selected
                          ? "border-primary bg-work-bg text-work-ink"
                          : "border-line bg-surface-2 text-text hover:opacity-85"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-[14px] font-semibold text-on-primary transition hover:bg-primary-press"
          >
            Prüfen
          </button>

          {variant.solution && variant.solution.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowSolution((v) => !v)}
              className="inline-flex h-10 items-center rounded-lg border border-line bg-surface-2 px-4 text-[14px] font-medium text-text transition hover:opacity-85"
            >
              {showSolution ? "Lösungsweg ausblenden" : "Lösungsweg zeigen"}
            </button>
          ) : null}

          {checked ? (
            <span
              role="status"
              className={`text-[14px] font-semibold ${
                allCorrect ? "text-ok-ink" : "text-err-ink"
              }`}
            >
              {allCorrect
                ? "Alles richtig (inkl. Rundungstoleranz)!"
                : "Noch nicht alle Felder passend — prüf die Zielwerte."}
            </span>
          ) : null}
        </div>
      </form>

      {showSolution && variant.solution && variant.solution.length > 0 ? (
        <div className="mt-5 border-t border-line pt-5">
          <BlockRenderer blocks={variant.solution} />
        </div>
      ) : null}
    </article>
  );
}
