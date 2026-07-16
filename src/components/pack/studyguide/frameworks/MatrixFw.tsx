"use client";

import type { z } from "zod";
import { ArrowLeftRight, Star } from "lucide-react";
import type { Matrix2x2FrameworkSchema } from "@/lib/schema";
import {
  HIGHLIGHT_FG,
  HIGHLIGHT_TINT,
  NEUTRAL_BG_2,
  NEUTRAL_BORDER,
  TEXT,
  TEXT_DIM,
  stripEmoji,
} from "../palette";
import { FwTitle, FwExplanation } from "./bits";

type Matrix2x2Fw = z.infer<typeof Matrix2x2FrameworkSchema>;

// 2x2 matrix with rotated axis labels; the "holy grail" cell keeps the
// semantic indigo highlight. Horizontal scroll below 460px.

function MatrixCell({
  cell,
}: {
  cell: Matrix2x2Fw["cells"][number] | undefined;
}) {
  if (!cell) {
    return (
      <div
        className="rounded-lg border border-dashed"
        style={{ background: "rgba(0,0,0,0.15)", borderColor: NEUTRAL_BORDER }}
      />
    );
  }
  const hl = cell.highlight === true;
  return (
    <div
      className="rounded-lg border p-3 text-center"
      style={{
        background: hl ? HIGHLIGHT_TINT : NEUTRAL_BG_2,
        borderColor: hl ? HIGHLIGHT_FG : NEUTRAL_BORDER,
      }}
    >
      <div
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold"
        style={{ color: hl ? HIGHLIGHT_FG : TEXT }}
      >
        {hl && (
          <Star
            size={12}
            strokeWidth={2}
            aria-hidden
            fill={HIGHLIGHT_FG}
            color={HIGHLIGHT_FG}
          />
        )}
        {stripEmoji(cell.title)}
      </div>
      {cell.sub && (
        <div className="mt-1 text-[11px] leading-snug" style={{ color: TEXT_DIM }}>
          {stripEmoji(cell.sub)}
        </div>
      )}
    </div>
  );
}

export default function MatrixFw({ fw }: { fw: Matrix2x2Fw }) {
  const cellAt = (x: "low" | "high", y: "low" | "high") =>
    fw.cells.find((c) => c.x === x && c.y === y);
  return (
    <div className="mt-4">
      <FwTitle title={fw.title} />
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[460px] gap-1 text-[12px]"
          style={{
            gridTemplateColumns: "minmax(80px, auto) 1fr 1fr",
            gridTemplateRows: "auto 1fr 1fr",
          }}
        >
          <div />
          <div
            className="px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-[0.1em]"
            style={{ color: TEXT_DIM }}
          >
            {stripEmoji(fw.xAxis.low)}
          </div>
          <div
            className="px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-[0.1em]"
            style={{ color: TEXT_DIM }}
          >
            {stripEmoji(fw.xAxis.high)}
          </div>
          <div
            className="flex items-center justify-center px-2 py-2 text-[11px] font-medium uppercase tracking-[0.1em]"
            style={{ color: TEXT_DIM }}
          >
            <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
              {stripEmoji(fw.yAxis.high)}
            </span>
          </div>
          {(["low", "high"] as const).map((x) => (
            <MatrixCell key={`hi-${x}`} cell={cellAt(x, "high")} />
          ))}
          <div
            className="flex items-center justify-center px-2 py-2 text-[11px] font-medium uppercase tracking-[0.1em]"
            style={{ color: TEXT_DIM }}
          >
            <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
              {stripEmoji(fw.yAxis.low)}
            </span>
          </div>
          {(["low", "high"] as const).map((x) => (
            <MatrixCell key={`lo-${x}`} cell={cellAt(x, "low")} />
          ))}
        </div>
      </div>
      <div
        className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]"
        style={{ color: "var(--color-text-faint, #6F7799)" }}
      >
        <ArrowLeftRight
          size={11}
          strokeWidth={1.5}
          aria-hidden
          style={{ transform: "rotate(90deg)" }}
        />
        <span>{stripEmoji(fw.yAxis.label)}</span>
        <span aria-hidden className="mx-1 opacity-60">
          ×
        </span>
        <ArrowLeftRight size={11} strokeWidth={1.5} aria-hidden />
        <span>{stripEmoji(fw.xAxis.label)}</span>
      </div>
      <FwExplanation text={fw.explanation} />
    </div>
  );
}
