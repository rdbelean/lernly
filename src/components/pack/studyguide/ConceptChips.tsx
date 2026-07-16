"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Sparkles, Star, Target } from "lucide-react";
import type { ExamLens, StudyPack } from "@/lib/schema";
import { examLensBadgeText, findTopicAppearances } from "@/lib/examLens";
import { renderRichText } from "@/lib/richText";
import {
  HIGHLIGHT_FG,
  HIGHLIGHT_TINT,
  NEUTRAL_BG_2,
  NEUTRAL_BORDER,
  NEUTRAL_BORDER_2,
  TEAL,
  TEAL_TINT,
  TEXT,
  TEXT_DIM,
  TEXT_FAINT,
  stripEmoji,
} from "./palette";

type Overview = StudyPack["overview"];
type Topic = Overview["topics"][number];
type Concept = Topic["concepts"][number];
type Language = "en" | "de";

// The Übersicht integration: expandable concept accordions per section,
// sorted by Altklausur frequency × importance. Migrated unchanged from the
// previous VisualMapView (behaviour identical).
export default function ConceptChips({
  concepts,
  language,
  topicName,
  examLens = null,
}: {
  concepts: Concept[];
  language: Language;
  topicName?: string;
  examLens?: ExamLens | null;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  if (!concepts || concepts.length === 0) return null;
  const isEn = language === "en";

  const topicAppearances = findTopicAppearances(examLens, topicName);
  const appearancesFor = (c: Concept) =>
    findTopicAppearances(examLens, c.term) ?? topicAppearances;

  const sorted = [...concepts].sort((a, b) => {
    const rank = (c: Concept) =>
      (appearancesFor(c) ?? 0) * 1000 +
      (c.importance === "high" ? 100 : c.importance === "medium" ? 50 : 10) +
      (c.relevanceTag ? 50 : 0);
    return rank(b) - rank(a);
  });

  const toggle = (term: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(term)) next.delete(term);
      else next.add(term);
      return next;
    });

  return (
    <div className="mb-4">
      <div
        className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: TEXT_FAINT }}
      >
        {isEn ? "Concepts to know" : "Konzepte in diesem Thema"}
      </div>
      <ul className="space-y-1.5">
        {sorted.map((c) => {
          const isOpen = expanded.has(c.term);
          const isHigh = c.importance === "high";
          return (
            <li key={c.term}>
              <button
                type="button"
                onClick={() => toggle(c.term)}
                aria-expanded={isOpen}
                className="block w-full rounded-lg border px-3 py-2 text-left transition hover:brightness-110"
                style={{
                  background: NEUTRAL_BG_2,
                  borderColor: NEUTRAL_BORDER,
                  borderLeft: `3px solid ${isHigh ? HIGHLIGHT_FG : NEUTRAL_BORDER}`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="flex-1 text-[13.5px] font-semibold leading-snug"
                    style={{ color: TEXT }}
                  >
                    {stripEmoji(c.term)}
                  </span>
                  <span aria-hidden className="shrink-0" style={{ color: TEXT_FAINT }}>
                    {isOpen ? (
                      <ChevronDown size={13} strokeWidth={2} />
                    ) : (
                      <ChevronRight size={13} strokeWidth={2} />
                    )}
                  </span>
                </div>
                {c.essence && (
                  <div
                    className="mt-0.5 truncate text-[12px] leading-snug"
                    style={{ color: TEXT_DIM }}
                    title={c.essence}
                  >
                    {stripEmoji(c.essence)}
                  </div>
                )}
                <div className="mt-1 flex flex-wrap gap-1">
                  {isHigh && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em]"
                      style={{
                        background: HIGHLIGHT_TINT,
                        borderColor: HIGHLIGHT_FG,
                        color: HIGHLIGHT_FG,
                      }}
                    >
                      <Star size={9} strokeWidth={2.2} aria-hidden />
                      {isEn ? "High" : "Wichtig"}
                    </span>
                  )}
                  {(() => {
                    const ap = appearancesFor(c);
                    const showFrequency = Boolean(examLens) && ap !== null;
                    const showProfHint =
                      showFrequency &&
                      (c.relevanceTag === "Prof-Hinweis" ||
                        c.relevanceTag === "beides");
                    const showLegacyTag =
                      !showFrequency && Boolean(c.relevanceTag);
                    return (
                      <>
                        {showFrequency && examLens && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em]"
                            style={{
                              background: TEAL_TINT,
                              borderColor: TEAL,
                              color: TEAL,
                            }}
                          >
                            <Sparkles size={9} strokeWidth={2.2} aria-hidden />
                            {examLensBadgeText(ap as number, examLens.examCount)}
                          </span>
                        )}
                        {showProfHint && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em]"
                            style={{
                              background: TEAL_TINT,
                              borderColor: TEAL,
                              color: TEAL,
                            }}
                          >
                            Prof-Hinweis
                          </span>
                        )}
                        {showLegacyTag && c.relevanceTag && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em]"
                            style={{
                              background: TEAL_TINT,
                              borderColor: TEAL,
                              color: TEAL,
                            }}
                          >
                            <Sparkles size={9} strokeWidth={2.2} aria-hidden />
                            {stripEmoji(c.relevanceTag)}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
                {isOpen && (
                  <div
                    className="mt-3 border-t pt-3"
                    style={{ borderColor: NEUTRAL_BORDER }}
                  >
                    {c.author && (
                      <div
                        className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em]"
                        style={{ color: TEXT_FAINT }}
                      >
                        {stripEmoji(c.author)}
                      </div>
                    )}
                    <p
                      className="text-[12.5px] leading-relaxed"
                      style={{ color: TEXT }}
                      dangerouslySetInnerHTML={{
                        __html: renderRichText(c.definition),
                      }}
                    />
                    {c.examRelevance && (
                      <div
                        className="mt-2.5 rounded-lg border p-2.5"
                        style={{
                          background: HIGHLIGHT_TINT,
                          borderColor: NEUTRAL_BORDER_2,
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <Target
                            size={11}
                            strokeWidth={2}
                            color={HIGHLIGHT_FG}
                            aria-hidden
                            className="mt-0.5 shrink-0"
                          />
                          <p
                            className="text-[11.5px] leading-relaxed"
                            style={{ color: TEXT }}
                            dangerouslySetInnerHTML={{
                              __html: renderRichText(c.examRelevance),
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
