"use client";

import { Clock } from "lucide-react";
import type { z } from "zod";
import type { VisualMapSchema } from "@/lib/schema";
import {
  DISPLAY_FONT,
  NEUTRAL_BORDER,
  PRIORITY_TONE,
  TEXT,
  TEXT_DIM,
  TEXT_FAINT,
  pickBlockIcon,
  stripEmoji,
  type Accent,
  type Priority,
} from "./palette";

type VisualBlock = z.infer<typeof VisualMapSchema>["blocks"][number];
type Language = "en" | "de";

export function PriorityChip({
  priority,
  language,
}: {
  priority: Priority;
  language: Language;
}) {
  const tone = PRIORITY_TONE[priority];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
      style={{ background: tone.bg, color: tone.fg }}
    >
      {language === "en" ? tone.en : tone.de}
    </span>
  );
}

export function TimeChip({ minutes }: { minutes: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold"
      style={{
        background: "rgba(255,255,255,0.03)",
        borderColor: NEUTRAL_BORDER,
        color: TEXT_DIM,
      }}
    >
      <Clock size={11} strokeWidth={2} aria-hidden />
      {minutes} Min
    </span>
  );
}

// Section header with the topic-identity accent on the icon tile. The eyebrow
// is synthesized locally ("Thema N" / "Topic N") instead of rendering the
// model's block.subtitle — that field mixed English boilerplate into German
// chrome; the priority chip already carries the priority meaning.
export default function SectionHeader({
  block,
  index,
  accent,
  language,
}: {
  block: VisualBlock;
  index: number;
  accent: Accent;
  language: Language;
}) {
  const Icon = pickBlockIcon(block.title);
  return (
    <div className="mb-4 flex flex-wrap items-start gap-3 sm:flex-nowrap sm:items-center sm:gap-4">
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: accent.grad, border: `1px solid ${accent.border}` }}
      >
        <Icon size={20} strokeWidth={1.75} color={accent.fg} />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className="text-[10.5px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: TEXT_FAINT }}
        >
          {language === "en" ? `Topic ${index + 1}` : `Thema ${index + 1}`}
        </div>
        <h3
          className="mt-0.5 text-[18px] font-semibold tracking-[-0.3px] sm:text-[20px]"
          style={{ color: TEXT, fontFamily: DISPLAY_FONT }}
        >
          {stripEmoji(block.title)}
        </h3>
      </div>
      {(block.priority || block.timeMinutes) && (
        <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
          {block.priority && (
            <PriorityChip priority={block.priority} language={language} />
          )}
          {block.timeMinutes !== undefined && (
            <TimeChip minutes={block.timeMinutes} />
          )}
        </div>
      )}
    </div>
  );
}
