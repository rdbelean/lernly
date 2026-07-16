"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import type { ExamLens, StudyPack } from "@/lib/schema";
import {
  NEUTRAL_BG,
  NEUTRAL_BORDER,
  TEXT_DIM,
  accentFor,
  priorityRank,
  sectionId,
  stripEmoji,
} from "./palette";
import GuideNav from "./GuideNav";
import Roadmap from "./Roadmap";
import SectionHeader from "./SectionHeader";
import ConceptChips from "./ConceptChips";
import { FrameworkSwitch } from "./frameworks";

type VisualMap = NonNullable<StudyPack["visualMap"]>;
type VisualBlock = VisualMap["blocks"][number];
type Overview = StudyPack["overview"];
type Topic = Overview["topics"][number];
type Language = "en" | "de";

// =========================================================================
// Study Guide — the consolidated visual board.
// =========================================================================
// Structure per the reference design: sticky topic nav → study roadmap
// (priorities + time, anchor-linked) → one section per topic. Each section
// owns a stable accent color (index-cycled, client-side — works for old
// packs without regeneration), a header with icon tile + chips, the
// overview's concept accordions, and the typed visual frameworks.
// =========================================================================

type TopicIndex = { byLower: Map<string, Topic>; topics: Topic[] };

function buildTopicIndex(overview: Overview | undefined): TopicIndex {
  const topics = overview?.topics ?? [];
  const byLower = new Map<string, Topic>();
  for (const t of topics) byLower.set(t.name.toLowerCase().trim(), t);
  return { byLower, topics };
}

function findTopicForBlock(
  block: VisualBlock,
  idx: TopicIndex,
): Topic | undefined {
  const blockLower = stripEmoji(block.title).toLowerCase().trim();
  const exact = idx.byLower.get(blockLower);
  if (exact) return exact;
  for (const t of idx.topics) {
    const tLower = t.name.toLowerCase().trim();
    if (tLower.length < 4 || blockLower.length < 4) continue;
    if (blockLower.includes(tLower) || tLower.includes(blockLower)) return t;
  }
  return undefined;
}

export default function StudyGuideView({
  map,
  overview,
  language = "de",
  examLens = null,
}: {
  map: VisualMap;
  overview?: Overview;
  language?: Language;
  examLens?: ExamLens | null;
}) {
  const sortedBlocks = useMemo(() => {
    return [...map.blocks].sort((a, b) => {
      const ra = priorityRank(a.priority);
      const rb = priorityRank(b.priority);
      if (ra !== rb) return rb - ra;
      return (b.timeMinutes ?? 0) - (a.timeMinutes ?? 0);
    });
  }, [map.blocks]);

  const topicIndex = useMemo(() => buildTopicIndex(overview), [overview]);

  if (!map.blocks.length) {
    return (
      <p className="text-[14px]" style={{ color: TEXT_DIM }}>
        {language === "en"
          ? "No study guide available."
          : "Kein Study Guide verfügbar."}
      </p>
    );
  }

  return (
    <div>
      <GuideNav blocks={sortedBlocks} />
      <div className="space-y-8">
        <Roadmap blocks={sortedBlocks} language={language} />
        {sortedBlocks.map((block, bi) => {
          const topic = findTopicForBlock(block, topicIndex);
          const accent = accentFor(bi);
          return (
            <motion.section
              key={`${block.title}-${bi}`}
              id={sectionId(bi)}
              className="scroll-mt-16"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(bi * 0.05, 0.3), duration: 0.4 }}
            >
              <SectionHeader
                block={block}
                index={bi}
                accent={accent}
                language={language}
              />
              <div
                className="rounded-2xl border p-4 sm:p-5"
                style={{
                  background: NEUTRAL_BG,
                  borderColor: NEUTRAL_BORDER,
                  borderTop: `2px solid ${accent.border}`,
                }}
              >
                {topic && (
                  <ConceptChips
                    concepts={topic.concepts}
                    language={language}
                    topicName={topic.name}
                    examLens={examLens}
                  />
                )}
                {block.frameworks.map((fw, fi) => (
                  <FrameworkSwitch
                    key={`${block.title}-fw-${fi}`}
                    fw={fw}
                    accent={accent}
                  />
                ))}
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
