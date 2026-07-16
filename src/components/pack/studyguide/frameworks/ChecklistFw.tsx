"use client";

import type { z } from "zod";
import type { ChecklistFrameworkSchema } from "@/lib/schema";
import { renderRichText } from "@/lib/richText";
import {
  HIGHLIGHT_FG,
  HIGHLIGHT_TINT,
  NEUTRAL_BG_2,
  NEUTRAL_BORDER,
  TEXT,
  TEXT_DIM,
  stripEmoji,
  type Accent,
} from "../palette";
import { FwTitle, FwExplanation } from "./bits";

type ChecklistFw = z.infer<typeof ChecklistFrameworkSchema>;

// Ordered step list — Prüfungsschema steps, diagnostic checklists, remedy
// lists. Each step gets a colored number/letter pill (topic accent) and an
// optional detail line. Reads top-down like the reference HTML's numbered
// pill checklists.
export default function ChecklistFw({
  fw,
  accent,
}: {
  fw: ChecklistFw;
  accent?: Accent;
}) {
  const fg = accent?.fg ?? HIGHLIGHT_FG;
  const tint = accent?.tint ?? HIGHLIGHT_TINT;
  const marker = (i: number) =>
    fw.style === "lettered" ? String.fromCharCode(65 + (i % 26)) : String(i + 1);
  return (
    <div className="mt-4">
      <FwTitle title={fw.title} />
      <ol
        className="overflow-hidden rounded-xl border"
        style={{ background: NEUTRAL_BG_2, borderColor: NEUTRAL_BORDER }}
      >
        {fw.items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-3 px-3.5 py-3"
            style={{
              borderBottom:
                i < fw.items.length - 1
                  ? "1px solid rgba(255,255,255,0.04)"
                  : "none",
            }}
          >
            <span
              aria-hidden
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px] font-bold"
              style={{ background: tint, color: fg }}
            >
              {marker(i)}
            </span>
            <div className="min-w-0 flex-1">
              <div
                className="text-[13.5px] font-semibold leading-snug"
                style={{ color: TEXT }}
                dangerouslySetInnerHTML={{
                  __html: renderRichText(stripEmoji(item.text)),
                }}
              />
              {item.detail && (
                <div
                  className="mt-0.5 text-[12px] leading-relaxed"
                  style={{ color: TEXT_DIM }}
                  dangerouslySetInnerHTML={{
                    __html: renderRichText(item.detail),
                  }}
                />
              )}
            </div>
          </li>
        ))}
      </ol>
      <FwExplanation text={fw.explanation} />
    </div>
  );
}
