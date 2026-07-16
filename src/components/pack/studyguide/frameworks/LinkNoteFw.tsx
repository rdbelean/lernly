"use client";

import type { z } from "zod";
import { ArrowRight, Link2 } from "lucide-react";
import type { LinkNoteFrameworkSchema } from "@/lib/schema";
import { renderRichText } from "@/lib/richText";
import {
  HIGHLIGHT_FG,
  NEUTRAL_BG_2,
  NEUTRAL_BORDER,
  TEXT,
  TEXT_FAINT,
  stripEmoji,
} from "../palette";

type LinkNoteFw = z.infer<typeof LinkNoteFrameworkSchema>;

// Cross-reference between two topics ("this connects to that").
export default function LinkNoteFw({ fw }: { fw: LinkNoteFw }) {
  return (
    <div
      className="mt-4 rounded-xl border p-4"
      style={{ background: NEUTRAL_BG_2, borderColor: NEUTRAL_BORDER }}
    >
      <div className="flex items-start gap-2.5">
        <Link2
          size={14}
          strokeWidth={1.75}
          color={HIGHLIGHT_FG}
          aria-hidden
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]">
            <span style={{ color: HIGHLIGHT_FG }}>{stripEmoji(fw.fromTopic)}</span>
            <ArrowRight size={11} strokeWidth={1.75} color={TEXT_FAINT} aria-hidden />
            <span style={{ color: HIGHLIGHT_FG }}>{stripEmoji(fw.toTopic)}</span>
          </div>
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: TEXT }}
            dangerouslySetInnerHTML={{ __html: renderRichText(fw.explanation) }}
          />
        </div>
      </div>
    </div>
  );
}
