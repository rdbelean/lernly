"use client";

import type { z } from "zod";
import type { ConceptGridFrameworkSchema } from "@/lib/schema";
import { renderRichText } from "@/lib/richText";
import {
  NEUTRAL_BG_2,
  NEUTRAL_BORDER,
  DISPLAY_FONT,
  TEXT,
  TEXT_DIM,
  accentFor,
  stripEmoji,
  type Accent,
} from "../palette";
import { FwTitle } from "./bits";

type ConceptGridFw = z.infer<typeof ConceptGridFrameworkSchema>;

// Sibling-concept cards. Cards cycle accents starting at the section's own
// color (reference-HTML "v-cards" feel) via a colored top/left edge — tints
// and edges only, never full-color fills. Stored card.accent/icon (legacy
// emoji/rainbow) stays ignored.
export default function GridFw({
  fw,
  accent,
}: {
  fw: ConceptGridFw;
  accent?: Accent;
}) {
  const edge = fw.accentEdge ?? "top";
  return (
    <div className="mt-4">
      <FwTitle title={fw.title} />
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
      >
        {fw.cards.map((card, i) => {
          const cardAccent = accentFor(ACCENT_OFFSET(accent) + i);
          return (
            <div
              key={i}
              className="rounded-xl border p-4"
              style={{
                background: NEUTRAL_BG_2,
                borderColor: NEUTRAL_BORDER,
                ...(edge === "left"
                  ? { borderLeft: `3px solid ${cardAccent.fg}` }
                  : { borderTop: `2px solid ${cardAccent.fg}` }),
              }}
            >
              <div
                className="mb-1.5 text-[14px] font-semibold"
                style={{ color: TEXT, fontFamily: DISPLAY_FONT }}
                dangerouslySetInnerHTML={{
                  __html: renderRichText(stripEmoji(card.title)),
                }}
              />
              <p
                className="text-[12.5px] leading-relaxed"
                style={{ color: TEXT_DIM }}
                dangerouslySetInnerHTML={{ __html: renderRichText(card.body) }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { ACCENTS } from "../palette";
function ACCENT_OFFSET(accent?: Accent): number {
  if (!accent) return 0;
  const idx = ACCENTS.findIndex((a) => a.fg === accent.fg);
  return idx >= 0 ? idx : 0;
}
