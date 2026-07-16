"use client";

import type { z } from "zod";
import { AlertTriangle, BookOpen, Lightbulb, type LucideIcon } from "lucide-react";
import type { CalloutFrameworkSchema } from "@/lib/schema";
import { renderRichText } from "@/lib/richText";
import {
  AMBER,
  AMBER_TINT,
  CORAL,
  CORAL_TINT,
  HIGHLIGHT_FG,
  HIGHLIGHT_TINT,
  TEXT,
  VIOLET,
  VIOLET_TINT,
  stripEmoji,
} from "../palette";

type CalloutFw = z.infer<typeof CalloutFrameworkSchema>;

// Tone now drives BOTH icon and color (the generation prompt always promised
// "definition (blau) | insight (violett) | warning (rot)" — the old renderer
// flattened everything to amber). Neutral/untoned callouts keep the amber
// "Merke" identity.
const TONE_STYLE: Record<
  NonNullable<CalloutFw["tone"]> | "_default",
  { fg: string; bg: string; Icon: LucideIcon | null }
> = {
  definition: { fg: HIGHLIGHT_FG, bg: HIGHLIGHT_TINT, Icon: BookOpen },
  insight: { fg: VIOLET, bg: VIOLET_TINT, Icon: Lightbulb },
  warning: { fg: CORAL, bg: CORAL_TINT, Icon: AlertTriangle },
  neutral: { fg: AMBER, bg: AMBER_TINT, Icon: null },
  _default: { fg: AMBER, bg: AMBER_TINT, Icon: null },
};

export default function CalloutFw({ fw }: { fw: CalloutFw }) {
  const tone = TONE_STYLE[fw.tone ?? "_default"];
  return (
    <div
      className="mt-4 rounded-r-xl px-4 py-3 sm:px-5 sm:py-3.5"
      style={{ background: tone.bg, borderLeft: `3px solid ${tone.fg}` }}
    >
      {fw.title && (
        <div
          className="mb-1 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: tone.fg }}
        >
          {tone.Icon && <tone.Icon size={13} strokeWidth={2.2} aria-hidden />}
          {stripEmoji(fw.title)}
        </div>
      )}
      <div
        className="text-[13.5px] leading-relaxed"
        style={{ color: TEXT }}
        dangerouslySetInnerHTML={{ __html: renderRichText(fw.body) }}
      />
    </div>
  );
}
