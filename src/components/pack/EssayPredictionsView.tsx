"use client";

import { motion } from "motion/react";
import type { EssayPrediction } from "@/lib/schema";
import { renderRichText } from "@/lib/richText";

type Language = "en" | "de";

const T = (en: boolean) => ({
  intro: en
    ? "Likely exam questions, each pre-thought end to end."
    : "Wahrscheinliche Klausurfragen — Skelett der Antwort vorgedacht.",
  thesis: en ? "Thesis" : "These",
  structure: en ? "Argument structure" : "Argumentation",
  cues: en ? "Paragraph cues" : "Absatz-Cues",
  examples: en ? "Examples to drop in" : "Beispiele zum Einbauen",
  none: en ? "No essay predictions available." : "Keine Aufsatz-Vorhersagen verfügbar.",
});

export default function EssayPredictionsView({
  predictions,
  language = "de",
}: {
  predictions: EssayPrediction[];
  language?: Language;
}) {
  const isEn = language === "en";
  const labels = T(isEn);

  if (predictions.length === 0) {
    return (
      <p className="text-[14px]" style={{ color: "var(--color-ln-mute)" }}>
        {labels.none}
      </p>
    );
  }

  return (
    <div>
      <p
        className="mb-5 text-[12.5px]"
        style={{ color: "var(--color-text-faint)" }}
      >
        {labels.intro}{" "}
        <span style={{ color: "var(--color-primary)" }}>
          {predictions.length} {isEn ? "predictions" : "Fragen"}
        </span>
      </p>

      <ol className="space-y-4 sm:space-y-5">
        {predictions.map((p, i) => (
          <motion.li
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="rounded-2xl border p-4 sm:p-5"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-ink-a10)",
            }}
          >
            {/* Question */}
            <div className="flex items-baseline gap-2.5">
              <span
                className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[12px] font-bold tabular-nums"
                style={{
                  background: "var(--color-work-bg)",
                  color: "var(--color-work-ink)",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3
                className="flex-1 text-[15.5px] font-bold leading-snug text-[color:var(--color-text)] sm:text-[16.5px]"
                dangerouslySetInnerHTML={{ __html: renderRichText(p.question) }}
              />
            </div>

            {/* Thesis — highlighted one-liner */}
            <div
              className="mt-3 rounded-xl border-l-[3px] border-y border-r px-3.5 py-2.5"
              style={{
                background: "var(--color-work-bg)",
                borderLeftColor: "var(--color-primary)",
                borderTopColor: "var(--color-work-bg)",
                borderRightColor: "var(--color-work-bg)",
                borderBottomColor: "var(--color-work-bg)",
              }}
            >
              <div
                className="mb-0.5 text-[12px] font-bold"
                style={{ color: "var(--color-work-ink)" }}
              >
                {labels.thesis}
              </div>
              <p
                className="text-[13.5px] font-medium leading-snug text-[color:var(--color-text)]"
                dangerouslySetInnerHTML={{ __html: renderRichText(p.thesis) }}
              />
            </div>

            {/* Structure — numbered argument steps */}
            <div className="mt-4">
              <div
                className="mb-2 text-[12px] font-bold"
                style={{ color: "var(--color-text-faint)" }}
              >
                {labels.structure}
              </div>
              <ol className="space-y-1.5">
                {p.structure.map((step, si) => (
                  <li
                    key={si}
                    className="flex items-start gap-2.5 text-[13px] leading-relaxed"
                    style={{ color: "var(--color-text-dim)" }}
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tabular-nums"
                      style={{
                        background: "var(--color-ink-a10)",
                        color: "var(--color-text-dim)",
                      }}
                    >
                      {si + 1}
                    </span>
                    <span
                      className="flex-1"
                      dangerouslySetInnerHTML={{ __html: renderRichText(step) }}
                    />
                  </li>
                ))}
              </ol>
            </div>

            {/* Paragraph cues */}
            {p.paragraphCues.length > 0 && (
              <div className="mt-4">
                <div
                  className="mb-2 text-[12px] font-bold"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  {labels.cues}
                </div>
                <ul className="space-y-1.5">
                  {p.paragraphCues.map((cue, ci) => (
                    <li
                      key={ci}
                      className="flex items-start gap-2 text-[12.5px] leading-relaxed"
                      style={{ color: "var(--color-text-dim)" }}
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                        style={{ background: "var(--color-ink-a14)" }}
                      />
                      <span
                        className="flex-1"
                        dangerouslySetInnerHTML={{
                          __html: renderRichText(cue),
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Examples */}
            {p.examples.length > 0 && (
              <div className="mt-4">
                <div
                  className="mb-2 text-[12px] font-bold"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  {labels.examples}
                </div>
                <div className="space-y-1.5">
                  {p.examples.map((ex, ei) => (
                    <div
                      key={ei}
                      className="rounded-lg border px-3 py-2 text-[12.5px] leading-relaxed"
                      style={{
                        background: "var(--color-urgent-bg)",
                        borderColor: "var(--color-urgent-bg)",
                        color: "var(--color-urgent-ink)",
                      }}
                      dangerouslySetInnerHTML={{
                        __html: renderRichText(ex),
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
