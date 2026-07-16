"use client";

import type { z } from "zod";
import { Brain } from "lucide-react";
import type { MnemonicFrameworkSchema } from "@/lib/schema";
import {
  HIGHLIGHT_FG,
  DISPLAY_FONT,
  NEUTRAL_BG_2,
  NEUTRAL_BORDER,
  TEXT,
  TEXT_DIM,
  stripEmoji,
  type Accent,
} from "../palette";
import { FwTitle } from "./bits";

type MnemonicFw = z.infer<typeof MnemonicFrameworkSchema>;

// Acronym + letter-by-letter expansion + optional hook line. The acronym
// takes the section accent (identity), the rest stays neutral.
export default function MnemonicFw({
  fw,
  accent,
}: {
  fw: MnemonicFw;
  accent?: Accent;
}) {
  const fg = accent?.fg ?? HIGHLIGHT_FG;
  return (
    <div className="mt-4">
      <FwTitle title={fw.title} />
      <div
        className="rounded-xl border p-4"
        style={{ background: NEUTRAL_BG_2, borderColor: NEUTRAL_BORDER }}
      >
        <div className="flex items-center gap-2">
          <Brain size={20} strokeWidth={1.75} color={fg} aria-hidden />
          <span
            className="text-[20px] font-semibold tracking-[0.08em]"
            style={{ color: fg, fontFamily: DISPLAY_FONT }}
          >
            {fw.acronym}
          </span>
        </div>
        <ul className="mt-3 space-y-1.5">
          {fw.expansion.map((row, i) => (
            <li key={i} className="flex gap-3 text-[13px]" style={{ color: TEXT }}>
              <span className="w-6 shrink-0 font-semibold" style={{ color: fg }}>
                {row.letter}
              </span>
              <span>{stripEmoji(row.meaning)}</span>
            </li>
          ))}
        </ul>
        {fw.hook && (
          <div
            className="mt-3 rounded-lg px-3 py-2 text-[12px] italic leading-relaxed"
            style={{ background: "rgba(0,0,0,0.18)", color: TEXT_DIM }}
          >
            {stripEmoji(fw.hook)}
          </div>
        )}
      </div>
    </div>
  );
}
