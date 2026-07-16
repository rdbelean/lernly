"use client";

import { Map as MapIcon } from "lucide-react";
import type { z } from "zod";
import type { VisualMapSchema } from "@/lib/schema";
import {
  DISPLAY_FONT,
  NEUTRAL_BG_2,
  NEUTRAL_BORDER,
  TEXT,
  TEXT_DIM,
  TEXT_FAINT,
  accentFor,
  sectionId,
  stripEmoji,
  type Priority,
} from "./palette";
import { PriorityChip, TimeChip } from "./SectionHeader";

type VisualBlock = z.infer<typeof VisualMapSchema>["blocks"][number];
type Language = "en" | "de";

// "Dein Lern-Pfad" — the reference-HTML study roadmap: numbered step cards in
// priority order, each carrying its topic accent on the number tile, priority
// label + time estimate, and an anchor link to its section below. This is the
// guide's entry point ("wo fange ich an?").
export default function Roadmap({
  blocks,
  language,
}: {
  blocks: VisualBlock[];
  language: Language;
}) {
  const steps = blocks
    .map((b, i) => ({ block: b, index: i }))
    .filter(({ block }) => block.priority && block.timeMinutes);
  if (steps.length < 2) return null;
  const total = steps.reduce((sum, s) => sum + (s.block.timeMinutes ?? 0), 0);
  return (
    <div className="mb-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapIcon size={18} strokeWidth={1.75} color={TEXT_DIM} aria-hidden />
          <h3
            className="text-[18px] font-semibold tracking-[-0.3px]"
            style={{ color: TEXT, fontFamily: DISPLAY_FONT }}
          >
            {language === "en" ? "Your study path" : "Dein Lern-Pfad"}
          </h3>
        </div>
        <p className="text-[12px]" style={{ color: TEXT_FAINT }}>
          {steps.length} {language === "en" ? "topics" : "Themen"} · ~{total} Min
        </p>
      </div>
      <ol className="space-y-2">
        {steps.map(({ block, index }, i) => {
          const accent = accentFor(index);
          const p = block.priority as Priority;
          return (
            <li key={`step-${index}`}>
              <a
                href={`#${sectionId(index)}`}
                className="flex gap-3 rounded-xl border p-3.5 transition-transform hover:translate-x-1 sm:gap-4"
                style={{
                  background: NEUTRAL_BG_2,
                  borderColor: NEUTRAL_BORDER,
                }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[14px] font-bold"
                  style={{ background: accent.tint, color: accent.fg }}
                >
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-[14px] font-semibold"
                    style={{ color: TEXT, fontFamily: DISPLAY_FONT }}
                  >
                    {stripEmoji(block.title)}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <PriorityChip priority={p} language={language} />
                    {block.timeMinutes !== undefined && (
                      <TimeChip minutes={block.timeMinutes} />
                    )}
                  </div>
                </div>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
