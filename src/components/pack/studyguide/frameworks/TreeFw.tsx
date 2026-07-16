"use client";

import type { z } from "zod";
import type { TreeFrameworkSchema } from "@/lib/schema";
import {
  HIGHLIGHT_FG,
  NEUTRAL_BG_2,
  NEUTRAL_BORDER,
  TEXT,
  TEXT_DIM,
  TEXT_FAINT,
  accentFor,
  stripEmoji,
  type Accent,
} from "../palette";
import { FwTitle, FwExplanation } from "./bits";

type TreeFw = z.infer<typeof TreeFrameworkSchema>;

// Taxonomy master-map ("ALLE DATEN → Quantitativ → Diskret / Stetig…").
// Fixed 3 levels: root node, branch children (accent-cycled), leaf children.
// Mobile: branches stack vertically; the connector glyphs keep the tree
// readable without absolute-position line drawing.

function NodeBox({
  label,
  sub,
  fg,
  border,
  strong = false,
}: {
  label: string;
  sub?: string;
  fg: string;
  border: string;
  strong?: boolean;
}) {
  return (
    <div
      className="rounded-xl border px-3.5 py-2 text-center"
      style={{
        background: NEUTRAL_BG_2,
        borderColor: border,
        borderTop: `2px solid ${fg}`,
      }}
    >
      <div
        className={`text-[12.5px] ${strong ? "font-semibold" : "font-medium"}`}
        style={{ color: strong ? fg : TEXT }}
      >
        {stripEmoji(label)}
      </div>
      {sub && (
        <div className="mt-0.5 text-[10.5px]" style={{ color: TEXT_DIM }}>
          {stripEmoji(sub)}
        </div>
      )}
    </div>
  );
}

export default function TreeFw({
  fw,
  accent,
}: {
  fw: TreeFw;
  accent?: Accent;
}) {
  const rootFg = accent?.fg ?? HIGHLIGHT_FG;
  return (
    <div className="mt-4">
      <FwTitle title={fw.title} />
      <div className="flex flex-col items-center gap-1.5">
        <NodeBox
          label={fw.root.label}
          sub={fw.root.sub}
          fg={rootFg}
          border={accent?.border ?? NEUTRAL_BORDER}
          strong
        />
        <span aria-hidden className="text-[14px]" style={{ color: TEXT_FAINT }}>
          ↓
        </span>
        <div className="flex w-full flex-wrap items-start justify-center gap-4">
          {fw.children.map((child, ci) => {
            const childAccent = accentFor(ci + 1);
            return (
              <div
                key={ci}
                className="flex min-w-[140px] max-w-[240px] flex-1 flex-col items-center gap-1.5"
              >
                <NodeBox
                  label={child.label}
                  sub={child.sub}
                  fg={childAccent.fg}
                  border={childAccent.border}
                  strong
                />
                {child.children && child.children.length > 0 && (
                  <>
                    <span
                      aria-hidden
                      className="text-[12px]"
                      style={{ color: TEXT_FAINT }}
                    >
                      ↓
                    </span>
                    <div className="flex w-full flex-col gap-1.5">
                      {child.children.map((leaf, li) => (
                        <NodeBox
                          key={li}
                          label={leaf.label}
                          sub={leaf.sub}
                          fg={childAccent.fg}
                          border={NEUTRAL_BORDER}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <FwExplanation text={fw.explanation} />
    </div>
  );
}
