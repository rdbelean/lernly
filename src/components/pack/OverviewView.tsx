"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { StudyPack } from "@/lib/schema";
import { renderRichText } from "@/lib/richText";

type Language = "en" | "de";
type Concept = StudyPack["overview"]["topics"][number]["concepts"][number];

const IMPORTANCE_LABEL: Record<"high" | "medium" | "low", { de: string; en: string }> = {
  high: { de: "Wichtig", en: "High" },
  medium: { de: "Mittel", en: "Medium" },
  low: { de: "Niedrig", en: "Low" },
};

const IMPORTANCE_DOT: Record<"high" | "medium" | "low", string> = {
  high: "var(--color-ln-cyan)",
  medium: "rgba(255,255,255,0.35)",
  low: "rgba(255,255,255,0.15)",
};

const IMPORTANCE_EDGE: Record<"high" | "medium" | "low", string> = {
  high: "rgba(34,211,238,0.55)",
  medium: "rgba(255,255,255,0.12)",
  low: "rgba(255,255,255,0.06)",
};

function deriveEssence(c: Concept): string {
  if (c.essence && c.essence.trim()) return c.essence.trim();
  // Fallback for old packs: first sentence of the plain-text definition,
  // capped so the chip stays a one-liner.
  const plain = c.definition.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const firstStop = plain.search(/[.!?]/);
  const first = firstStop > 0 ? plain.slice(0, firstStop) : plain;
  if (first.length <= 70) return first;
  return first.slice(0, 65).trim() + "…";
}

export default function OverviewView({
  overview,
  language = "de",
}: {
  overview: StudyPack["overview"];
  language?: Language;
}) {
  const isEn = language === "en";
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const expandAll = () => {
    const all = new Set<string>();
    overview.topics.forEach((t, ti) =>
      t.concepts.forEach((c, ci) => all.add(`${ti}-${ci}-${c.term}`)),
    );
    setExpanded(all);
  };
  const collapseAll = () => setExpanded(new Set());
  const anyExpanded = expanded.size > 0;

  return (
    <div>
      {/* Header: scan-in-5-seconds counts + expand controls */}
      <div className="mb-6 flex flex-wrap items-center gap-2 text-[12px]">
        <span
          className="rounded-full border px-2.5 py-0.5 font-medium tabular-nums"
          style={{
            background: "rgba(255,255,255,0.06)",
            borderColor: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.75)",
          }}
        >
          {overview.topics.length} {isEn ? "topics" : "Themen"}
        </span>
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
              background: "rgba(34,211,238,0.14)",
              borderColor: "rgba(34,211,238,0.4)",
              color: "rgb(165,243,252)",
            }}
          >
            ✦ {highCount} {isEn ? "high priority" : "Klausurrelevant"}
          </span>
        )}
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={anyExpanded ? collapseAll : expandAll}
            className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-white/60 transition hover:text-white"
          >
            {anyExpanded
              ? isEn
                ? "Collapse all"
                : "Alle einklappen"
              : isEn
                ? "Expand all"
                : "Alle ausklappen"}
          </button>
        </div>
      </div>

      <div className="space-y-7">
        {overview.topics.map((topic, ti) => {
          const topicHighCount = topic.concepts.filter(
            (c) => c.importance === "high",
          ).length;
          return (
            <motion.section
              key={topic.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ti * 0.04, duration: 0.3 }}
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
                <h3 className="text-[16px] font-semibold tracking-[-0.2px] text-white sm:text-[17px]">
                  {topic.name}
                </h3>
                <span
                  className="text-[11.5px] tabular-nums"
                  style={{ color: "var(--color-ln-mute)" }}
                >
                  {topic.concepts.length}
                  {topicHighCount > 0 && (
                    <>
                      {" · "}
                      <span style={{ color: "var(--color-ln-cyan)" }}>
                        ✦ {topicHighCount}
                      </span>
                    </>
                  )}
                </span>
              </div>
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                }}
              >
                {topic.concepts.map((c, ci) => {
                  const key = `${ti}-${ci}-${c.term}`;
                  const isOpen = expanded.has(key);
                  const essence = deriveEssence(c);
                  const isHigh = c.importance === "high";
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggle(key)}
                      className="text-left"
                      aria-expanded={isOpen}
                    >
                      <div
                        className="rounded-xl border bg-black/15 px-3.5 py-3 transition hover:bg-black/25"
                        style={{
                          borderColor: isHigh
                            ? "rgba(34,211,238,0.3)"
                            : "rgba(255,255,255,0.08)",
                          borderLeft: `3px solid ${IMPORTANCE_EDGE[c.importance]}`,
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            aria-hidden
                            className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: IMPORTANCE_DOT[c.importance] }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span
                                className={
                                  "text-[13.5px] font-semibold leading-snug " +
                                  (isHigh ? "text-white" : "text-white/90")
                                }
                              >
                                {c.term}
                              </span>
                              <span
                                aria-hidden
                                className="shrink-0 text-[10px] text-white/35"
                              >
                                {isOpen ? "▾" : "▸"}
                              </span>
                            </div>
                            {essence && (
                              <div
                                className="mt-0.5 truncate text-[12px] leading-snug"
                                style={{ color: "rgba(255,255,255,0.55)" }}
                                title={essence}
                              >
                                {essence}
                              </div>
                            )}
                            {c.relevanceTag && (
                              <span
                                className="mt-1 inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em]"
                                style={{
                                  background: "rgba(124,196,160,0.12)",
                                  borderColor: "rgba(124,196,160,0.35)",
                                  color: "var(--color-ln-sage)",
                                }}
                                title="Aus Altklausur-Lens"
                              >
                                ✦ {c.relevanceTag}
                              </span>
                            )}
                          </div>
                        </div>
                        {isOpen && (
                          <div className="mt-3 border-t border-white/5 pt-3">
                            {c.author && (
                              <div
                                className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em]"
                                style={{ color: "rgba(255,255,255,0.4)" }}
                              >
                                {c.author}
                                {isHigh && (
                                  <span
                                    className="ml-2 inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[1px]"
                                    style={{
                                      background: "rgba(34,211,238,0.14)",
                                      borderColor: "rgba(34,211,238,0.4)",
                                      color: "rgb(165,243,252)",
                                    }}
                                  >
                                    ✦{" "}
                                    {isEn
                                      ? IMPORTANCE_LABEL.high.en
                                      : IMPORTANCE_LABEL.high.de}
                                  </span>
                                )}
                              </div>
                            )}
                            <p
                              className="text-[12.5px] leading-relaxed"
                              style={{ color: "rgba(255,255,255,0.78)" }}
                              dangerouslySetInnerHTML={{
                                __html: renderRichText(c.definition),
                              }}
                            />
                            {c.examRelevance && (
                              <div
                                className="mt-2.5 rounded-lg border p-2.5"
                                style={{
                                  background: "rgba(34,211,238,0.05)",
                                  borderColor: "rgba(34,211,238,0.18)",
                                }}
                              >
                                <div className="flex items-start gap-2">
                                  <span
                                    aria-hidden
                                    className="mt-[1px] text-[11px]"
                                  >
                                    🎯
                                  </span>
                                  <p
                                    className="text-[11.5px] leading-relaxed"
                                    style={{ color: "rgba(255,255,255,0.72)" }}
                                    dangerouslySetInnerHTML={{
                                      __html: renderRichText(c.examRelevance),
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
