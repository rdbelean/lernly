"use client";

import type { z } from "zod";
import { Check, X, type LucideIcon } from "lucide-react";
import type { ComparisonFrameworkSchema } from "@/lib/schema";
import { renderRichText } from "@/lib/richText";
import {
  CORAL,
  CORAL_TINT,
  NEUTRAL_BG_2,
  NEUTRAL_BORDER,
  TEAL,
  TEAL_TINT,
  TEXT,
  TEXT_DIM,
  stripEmoji,
} from "../palette";
import { FwTitle, FwExplanation } from "./bits";

type ComparisonFw = z.infer<typeof ComparisonFrameworkSchema>;

// VS / pro-con comparison. Colors are SEMANTIC (pro=teal, con=coral) and
// deliberately not topic-accented — green/red meaning beats identity here.
type SideStyle = { fg: string; bg: string; border: string; Icon: LucideIcon | null };

function sideStyle(tone: ComparisonFw["left"]["tone"] | undefined): SideStyle {
  if (tone === "pro")
    return { fg: TEAL, bg: TEAL_TINT, border: "rgba(79,209,165,0.22)", Icon: Check };
  if (tone === "con")
    return { fg: CORAL, bg: CORAL_TINT, border: "rgba(242,132,92,0.22)", Icon: X };
  return { fg: TEXT_DIM, bg: NEUTRAL_BG_2, border: NEUTRAL_BORDER, Icon: null };
}

export default function ComparisonFw({ fw }: { fw: ComparisonFw }) {
  const sides = [
    { side: fw.left, style: sideStyle(fw.left.tone) },
    { side: fw.right, style: sideStyle(fw.right.tone) },
  ];
  return (
    <div className="mt-4">
      <FwTitle title={fw.title} />
      <div className="grid gap-2 md:grid-cols-2">
        {sides.map((col, idx) => {
          const ItemIcon = col.style.Icon;
          return (
            <div
              key={idx}
              className="rounded-xl border p-4"
              style={{ background: col.style.bg, borderColor: col.style.border }}
            >
              <div
                className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: col.style.fg }}
              >
                {ItemIcon && <ItemIcon size={12} strokeWidth={2.2} aria-hidden />}
                {stripEmoji(col.side.label)}
              </div>
              <ul className="space-y-1.5 text-[13px] leading-relaxed">
                {col.side.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-[3px] shrink-0"
                      style={{ color: col.style.fg }}
                    >
                      {ItemIcon ? (
                        <ItemIcon size={11} strokeWidth={2.2} aria-hidden />
                      ) : (
                        "•"
                      )}
                    </span>
                    <span
                      style={{ color: TEXT }}
                      dangerouslySetInnerHTML={{ __html: renderRichText(item) }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <FwExplanation text={fw.explanation} />
    </div>
  );
}
