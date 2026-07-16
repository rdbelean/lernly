"use client";

import { renderRichText } from "@/lib/richText";
import { DISPLAY_FONT, TEXT, TEXT_DIM, stripEmoji } from "../palette";

// Shared micro-pieces used by every framework renderer: the small heading
// above a framework, and the optional explanation prose below it (rich text
// → KaTeX-capable).

export function FwTitle({ title }: { title?: string }) {
  if (!title) return null;
  return (
    <h4
      className="mb-3 text-[14px] font-semibold"
      style={{ color: TEXT, fontFamily: DISPLAY_FONT }}
    >
      {stripEmoji(title)}
    </h4>
  );
}

export function FwExplanation({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p
      className="mt-3 text-[12.5px] leading-relaxed"
      style={{ color: TEXT_DIM }}
      dangerouslySetInnerHTML={{ __html: renderRichText(text) }}
    />
  );
}
