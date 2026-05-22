"use client";

import { motion } from "motion/react";
import type { StudyPack } from "@/lib/schema";
import { toSafeInlineHtml } from "@/lib/richText";

type Language = "en" | "de";

const IMPORTANCE_LABEL: Record<"high" | "medium" | "low", { de: string; en: string }> = {
  high: { de: "Wichtig", en: "High" },
  medium: { de: "Mittel", en: "Medium" },
  low: { de: "Niedrig", en: "Low" },
};

const IMPORTANCE_STYLE: Record<
  "high" | "medium" | "low",
  { bg: string; border: string; text: string }
> = {
  high: {
    bg: "rgba(34,211,238,0.14)",
    border: "rgba(34,211,238,0.4)",
    text: "rgb(165,243,252)",
  },
  medium: {
    bg: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.16)",
    text: "rgba(255,255,255,0.7)",
  },
  low: {
    bg: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.08)",
    text: "rgba(255,255,255,0.45)",
  },
};

export default function OverviewView({
  overview,
  language = "de",
}: {
  overview: StudyPack["overview"];
  language?: Language;
}) {
  const isEn = language === "en";
  if (overview.topics.length === 0) {
    return (
      <p className="text-[14px]" style={{ color: "var(--color-ln-mute)" }}>
        {isEn ? "No overview available." : "Keine Übersicht verfügbar."}
      </p>
    );
  }

  const totalConcepts = overview.topics.reduce(
    (n, t) => n + t.concepts.length,
    0,
  );
  const highCount = overview.topics.reduce(
    (n, t) => n + t.concepts.filter((c) => c.importance === "high").length,
    0,
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2 text-[12px]">
        <span
          className="rounded-full border px-2.5 py-0.5 font-medium tabular-nums"
          style={{
            background: "rgba(255,255,255,0.06)",
            borderColor: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.75)",
          }}
        >
          {totalConcepts} {isEn ? "concepts" : "Konzepte"}
        </span>
        {highCount > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium"
            style={{
              background: IMPORTANCE_STYLE.high.bg,
              borderColor: IMPORTANCE_STYLE.high.border,
              color: IMPORTANCE_STYLE.high.text,
            }}
          >
            ✦ {highCount} {isEn ? "high priority" : "Klausurrelevant"}
          </span>
        )}
      </div>

      <div className="space-y-9">
        {overview.topics.map((topic, ti) => (
          <motion.section
            key={topic.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ti * 0.05, duration: 0.35 }}
          >
            <div className="mb-3 flex items-baseline gap-3">
              <span
                className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-semibold tabular-nums"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {String(ti + 1).padStart(2, "0")}
              </span>
              <h3 className="text-[17px] font-semibold tracking-[-0.2px] text-white">
                {topic.name}
              </h3>
              <span className="text-[12px]" style={{ color: "var(--color-ln-mute)" }}>
                {topic.concepts.length}
              </span>
            </div>
            <div className="space-y-2.5 pl-9">
              {topic.concepts.map((c, ci) => {
                const style = IMPORTANCE_STYLE[c.importance];
                const importanceLabel = IMPORTANCE_LABEL[c.importance];
                return (
                  <motion.div
                    key={c.term}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: ti * 0.05 + ci * 0.02, duration: 0.3 }}
                    whileHover={{ y: -1 }}
                    className="rounded-xl border bg-black/20 p-4 transition"
                    style={{
                      borderColor: style.border,
                      borderLeft: `3px solid ${style.border}`,
                    }}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[15px] font-semibold text-white">
                          {c.term}
                        </span>
                        {c.importance === "high" && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[1px]"
                            style={{
                              background: style.bg,
                              borderColor: style.border,
                              color: style.text,
                            }}
                          >
                            ✦ {isEn ? importanceLabel.en : importanceLabel.de}
                          </span>
                        )}
                      </div>
                      {c.author && (
                        <span
                          className="text-[12px]"
                          style={{ color: "var(--color-ln-mute)" }}
                        >
                          {c.author}
                        </span>
                      )}
                    </div>
                    <p
                      className="mt-2 text-[13.5px] leading-relaxed"
                      style={{ color: "var(--color-ln-ink-soft)" }}
                      dangerouslySetInnerHTML={{
                        __html: toSafeInlineHtml(c.definition),
                      }}
                    />
                    {c.examRelevance && (
                      <div
                        className="mt-3 rounded-lg border p-3"
                        style={{
                          background: "rgba(34,211,238,0.06)",
                          borderColor: "rgba(34,211,238,0.2)",
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className="mt-[1px] text-[12px]"
                            style={{ color: "var(--color-ln-cyan)" }}
                            aria-hidden
                          >
                            🎯
                          </span>
                          <p
                            className="text-[12.5px] leading-relaxed"
                            style={{ color: "rgba(255,255,255,0.8)" }}
                            dangerouslySetInnerHTML={{
                              __html: toSafeInlineHtml(c.examRelevance),
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        ))}
      </div>
    </div>
  );
}
