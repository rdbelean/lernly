"use client";

import { Fragment } from "react";
import type { z } from "zod";
import { ArrowLeftRight, ArrowRight, Plus } from "lucide-react";
import type { FlowFrameworkSchema } from "@/lib/schema";
import {
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

type FlowFw = z.infer<typeof FlowFrameworkSchema>;

// Process/pipeline flow. Boxes carry a per-step accent (cycled from the
// section accent onward, like the reference HTML's colored pipelines) as a
// top border — tint only, never a full fill. Stored box.accent (legacy) stays
// ignored so old packs keep the unified look.
export default function FlowFw({
  fw,
  accent,
}: {
  fw: FlowFw;
  accent?: Accent;
}) {
  const Arrow =
    fw.arrows === "bidirectional"
      ? ArrowLeftRight
      : fw.arrows === "plus"
        ? Plus
        : ArrowRight;
  const baseIdx = accent ? ACCENT_OFFSET(accent) : 0;
  return (
    <div className="mt-4">
      <FwTitle title={fw.title} />
      <div className="flex flex-wrap items-center justify-center gap-2">
        {fw.boxes.map((box, i) => {
          const stepAccent = accentFor(baseIdx + i);
          return (
            <Fragment key={`flow-${i}`}>
              <div
                className="min-w-[110px] rounded-xl border px-3.5 py-2.5 text-center"
                style={{
                  background: NEUTRAL_BG_2,
                  borderColor: NEUTRAL_BORDER,
                  borderTop: `2px solid ${stepAccent.fg}`,
                }}
              >
                <div
                  className="text-[12px] font-semibold"
                  style={{ color: TEXT }}
                >
                  {stripEmoji(box.label)}
                </div>
                {box.sub && (
                  <div
                    className="mt-0.5 text-[10.5px]"
                    style={{ color: TEXT_DIM }}
                  >
                    {stripEmoji(box.sub)}
                  </div>
                )}
              </div>
              {i < fw.boxes.length - 1 && (
                <Arrow
                  size={16}
                  strokeWidth={1.5}
                  color={TEXT_FAINT}
                  aria-hidden
                />
              )}
            </Fragment>
          );
        })}
      </div>
      <FwExplanation text={fw.explanation} />
    </div>
  );
}

// Map a section accent back to its palette index so flow steps continue the
// cycle from the section's own color (visual continuity per topic).
import { ACCENTS } from "../palette";
function ACCENT_OFFSET(accent: Accent): number {
  const idx = ACCENTS.findIndex((a) => a.fg === accent.fg);
  return idx >= 0 ? idx : 0;
}
