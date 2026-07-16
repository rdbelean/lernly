"use client";

import type { z } from "zod";
import { Lightbulb } from "lucide-react";
import type { FormulaFrameworkSchema } from "@/lib/schema";
import { renderRichText } from "@/lib/richText";
import {
  AMBER,
  AMBER_TINT,
  HIGHLIGHT_FG,
  MONO_FONT,
  NEUTRAL_BORDER,
  TEXT,
  TEXT_DIM,
  stripEmoji,
  type Accent,
} from "../palette";
import { FwTitle } from "./bits";

type FormulaFw = z.infer<typeof FormulaFrameworkSchema>;

// The reference-HTML formula pattern in full: a centered mono formula in a
// tinted box (KaTeX-typeset via renderRichText — supports \( .. \) / \[ .. \]),
// a variable-explanation table underneath (Y = …, a = …, b = …), and an
// optional memory hook as an amber note. Legacy packs without variables/hook
// render exactly the box, as before — just with math finally typeset.
export default function FormulaFw({
  fw,
  accent,
}: {
  fw: FormulaFw;
  accent?: Accent;
}) {
  const fg = accent?.fg ?? HIGHLIGHT_FG;
  const tint = accent?.tint ?? "rgba(110,128,242,0.09)";
  return (
    <div className="mt-4">
      <FwTitle title={fw.title} />
      <div
        className="rounded-xl px-5 py-4 text-center"
        style={{
          background: `linear-gradient(135deg, ${tint}, rgba(0,0,0,0.12))`,
          border: `1px solid ${NEUTRAL_BORDER}`,
          borderLeft: `3px solid ${fg}`,
        }}
      >
        <div
          className="text-[16px] font-semibold leading-snug"
          style={{ color: fg, fontFamily: MONO_FONT }}
          dangerouslySetInnerHTML={{ __html: renderRichText(fw.formula) }}
        />
        {fw.sub && (
          <div className="mt-1.5 text-[12px]" style={{ color: TEXT_DIM }}>
            {stripEmoji(fw.sub)}
          </div>
        )}
      </div>
      {fw.variables && fw.variables.length > 0 && (
        <div
          className="mt-2 overflow-hidden rounded-xl border"
          style={{ borderColor: NEUTRAL_BORDER }}
        >
          <table className="w-full border-collapse text-[12.5px]">
            <tbody>
              {fw.variables.map((v, i) => (
                <tr key={i}>
                  <td
                    className="w-14 px-3.5 py-2.5 text-center align-top font-semibold"
                    style={{
                      color: fg,
                      fontFamily: MONO_FONT,
                      borderBottom:
                        i < fw.variables!.length - 1
                          ? "1px solid rgba(255,255,255,0.03)"
                          : "none",
                      background: "rgba(255,255,255,0.02)",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: renderRichText(v.symbol),
                    }}
                  />
                  <td
                    className="px-3.5 py-2.5 align-top leading-relaxed"
                    style={{
                      color: TEXT,
                      borderBottom:
                        i < fw.variables!.length - 1
                          ? "1px solid rgba(255,255,255,0.03)"
                          : "none",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: renderRichText(v.meaning),
                    }}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {fw.hook && (
        <div
          className="mt-2 flex items-start gap-2 rounded-r-xl px-3.5 py-2.5"
          style={{ background: AMBER_TINT, borderLeft: `3px solid ${AMBER}` }}
        >
          <Lightbulb
            size={13}
            strokeWidth={2}
            color={AMBER}
            aria-hidden
            className="mt-0.5 shrink-0"
          />
          <p
            className="text-[12.5px] leading-relaxed"
            style={{ color: TEXT }}
            dangerouslySetInnerHTML={{ __html: renderRichText(fw.hook) }}
          />
        </div>
      )}
    </div>
  );
}
