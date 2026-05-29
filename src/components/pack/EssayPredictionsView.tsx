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
        style={{ color: "rgba(255,255,255,0.55)" }}
      >
        {labels.intro}{" "}
        <span style={{ color: "var(--color-ln-cyan)" }}>
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
              background: "rgba(20,22,28,0.55)",
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            {/* Question */}
            <div className="flex items-baseline gap-2.5">
              <span
                className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-bold tabular-nums"
                style={{
                  background: "rgba(154,140,224,0.18)",
                  color: "var(--color-ln-violet)",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3
                className="flex-1 text-[15.5px] font-bold leading-snug text-white sm:text-[16.5px]"
                dangerouslySetInnerHTML={{ __html: renderRichText(p.question) }}
              />
            </div>

            {/* Thesis — highlighted one-liner */}
            <div
              className="mt-3 rounded-xl border-l-[3px] border-y border-r px-3.5 py-2.5"
              style={{
                background: "rgba(91,184,216,0.06)",
                borderLeftColor: "var(--color-ln-cyan)",
                borderTopColor: "rgba(91,184,216,0.15)",
                borderRightColor: "rgba(91,184,216,0.15)",
                borderBottomColor: "rgba(91,184,216,0.15)",
              }}
            >
              <div
                className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "var(--color-ln-cyan)" }}
              >
                {labels.thesis}
              </div>
              <p
                className="text-[13.5px] font-medium leading-snug text-white"
                dangerouslySetInnerHTML={{ __html: renderRichText(p.thesis) }}
              />
            </div>

            {/* Structure — numbered argument steps */}
            <div className="mt-4">
              <div
                className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                {labels.structure}
              </div>
              <ol className="space-y-1.5">
                {p.structure.map((step, si) => (
                  <li
                    key={si}
                    className="flex items-start gap-2.5 text-[13px] leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.82)" }}
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold tabular-nums"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.65)",
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
                  className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  {labels.cues}
                </div>
                <ul className="space-y-1.5">
                  {p.paragraphCues.map((cue, ci) => (
                    <li
                      key={ci}
                      className="flex items-start gap-2 text-[12.5px] leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                        style={{ background: "rgba(255,255,255,0.4)" }}
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
                  className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  {labels.examples}
                </div>
                <div className="space-y-1.5">
                  {p.examples.map((ex, ei) => (
                    <div
                      key={ei}
                      className="rounded-lg border px-3 py-2 text-[12.5px] leading-relaxed"
                      style={{
                        background: "rgba(251,191,36,0.04)",
                        borderColor: "rgba(251,191,36,0.2)",
                        color: "rgba(255,224,160,0.92)",
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
