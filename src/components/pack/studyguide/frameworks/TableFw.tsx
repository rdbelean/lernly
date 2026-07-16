"use client";

import type { z } from "zod";
import type { TableFrameworkSchema } from "@/lib/schema";
import { renderRichText } from "@/lib/richText";
import {
  NEUTRAL_BG_2,
  NEUTRAL_BORDER,
  TEXT,
  TEXT_DIM,
  TEXT_FAINT,
  stripEmoji,
} from "../palette";
import { FwTitle } from "./bits";

type TableFw = z.infer<typeof TableFrameworkSchema>;

// Multi-column comparison/term table; horizontal scroll on small screens.
export default function TableFw({ fw }: { fw: TableFw }) {
  const colCount = fw.headers?.length ?? fw.rows[0]?.length ?? 0;
  return (
    <div className="mt-4">
      <FwTitle title={fw.title} />
      <div
        className="overflow-x-auto rounded-xl border"
        style={{ background: NEUTRAL_BG_2, borderColor: NEUTRAL_BORDER }}
      >
        <table className="w-full border-collapse text-[12.5px]">
          {fw.headers && fw.headers.length > 0 && (
            <thead>
              <tr>
                {fw.headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em]"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      borderBottom: `1px solid ${NEUTRAL_BORDER}`,
                      color: TEXT_DIM,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: renderRichText(stripEmoji(h)),
                    }}
                  />
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {fw.rows.map((row, ri) => (
              <tr key={ri}>
                {Array.from({ length: colCount }).map((_, ci) => (
                  <td
                    key={ci}
                    className="px-3.5 py-3 align-top leading-relaxed"
                    style={{
                      borderBottom:
                        ri < fw.rows.length - 1
                          ? "1px solid rgba(255,255,255,0.03)"
                          : "none",
                      color: TEXT,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: renderRichText(row[ci] ?? ""),
                    }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {fw.caption && (
        <p className="mt-2 text-[11.5px]" style={{ color: TEXT_FAINT }}>
          {stripEmoji(fw.caption)}
        </p>
      )}
    </div>
  );
}
