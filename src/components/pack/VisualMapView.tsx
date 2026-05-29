"use client";

import { motion } from "motion/react";
import type {
  CalloutFrameworkSchema,
  ComparisonFrameworkSchema,
  ConceptGridFrameworkSchema,
  FlowFrameworkSchema,
  FormulaFrameworkSchema,
  LinkNoteFrameworkSchema,
  Matrix2x2FrameworkSchema,
  MnemonicFrameworkSchema,
  StudyPack,
  TableFrameworkSchema,
  VisualBlockColorSchema,
  VisualBlockPrioritySchema,
} from "@/lib/schema";
import type { z } from "zod";
import { renderRichText } from "@/lib/richText";

type BlockColor = z.infer<typeof VisualBlockColorSchema>;
type Priority = z.infer<typeof VisualBlockPrioritySchema>;
type FlowFw = z.infer<typeof FlowFrameworkSchema>;
type Matrix2x2Fw = z.infer<typeof Matrix2x2FrameworkSchema>;
type ComparisonFw = z.infer<typeof ComparisonFrameworkSchema>;
type FormulaFw = z.infer<typeof FormulaFrameworkSchema>;
type MnemonicFw = z.infer<typeof MnemonicFrameworkSchema>;
type LinkNoteFw = z.infer<typeof LinkNoteFrameworkSchema>;
type CalloutFw = z.infer<typeof CalloutFrameworkSchema>;
type TableFw = z.infer<typeof TableFrameworkSchema>;
type ConceptGridFw = z.infer<typeof ConceptGridFrameworkSchema>;

type VisualMap = NonNullable<StudyPack["visualMap"]>;
type VisualBlock = VisualMap["blocks"][number];

const COLOR_RGB: Record<BlockColor, string> = {
  blue: "108,142,239",
  cyan: "91,196,216",
  green: "74,222,128",
  amber: "251,191,36",
  violet: "167,139,250",
  rose: "251,113,133",
};

function rgba(color: BlockColor, alpha: number): string {
  return `rgba(${COLOR_RGB[color]},${alpha})`;
}

const PRIORITY_RGB: Record<Priority, string> = {
  highest: "239,68,68",
  high: "139,92,246",
  moderate: "245,158,11",
  quick_win: "249,115,22",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  highest: "HÖCHSTE PRIORITÄT",
  high: "WICHTIG",
  moderate: "BASIS",
  quick_win: "QUICK WIN",
};

function priorityRgba(p: Priority, alpha: number): string {
  return `rgba(${PRIORITY_RGB[p]},${alpha})`;
}

const CALLOUT_TONE_RGB: Record<NonNullable<CalloutFw["tone"]>, string> = {
  definition: "108,142,239",
  insight: "167,139,250",
  warning: "239,68,68",
  neutral: "255,255,255",
};

function calloutRgba(
  tone: NonNullable<CalloutFw["tone"]> | undefined,
  alpha: number,
): string {
  const rgb = CALLOUT_TONE_RGB[tone ?? "neutral"];
  return `rgba(${rgb},${alpha})`;
}

function FlowFramework({ fw, color }: { fw: FlowFw; color: BlockColor }) {
  const arrowChar =
    fw.arrows === "bidirectional" ? "↔" : fw.arrows === "plus" ? "+" : "→";

  return (
    <div className="mt-3">
      <h4 className="mb-3 text-[15px] font-semibold text-white">{fw.title}</h4>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {fw.boxes.map((box, i) => {
          const boxColor = box.accent ?? color;
          return (
            <>
              <div
                key={`box-${i}`}
                className="min-w-[110px] rounded-xl border px-3.5 py-2.5 text-center text-[12px] font-semibold"
                style={{
                  background: `rgba(20,22,28,0.6)`,
                  borderColor: rgba(boxColor, 0.4),
                  color: "white",
                }}
              >
                <div>{box.label}</div>
                {box.sub && (
                  <div
                    className="mt-0.5 text-[10px] font-normal"
                    style={{ color: rgba(boxColor, 0.9) }}
                  >
                    {box.sub}
                  </div>
                )}
              </div>
              {i < fw.boxes.length - 1 && (
                <span
                  key={`arrow-${i}`}
                  className="text-[18px]"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {arrowChar}
                </span>
              )}
            </>
          );
        })}
      </div>
      {fw.explanation && (
        <p
          className="mt-3 text-[12.5px] leading-relaxed"
          style={{ color: "rgba(255,255,255,0.62)" }}
          dangerouslySetInnerHTML={{ __html: renderRichText(fw.explanation) }}
        />
      )}
    </div>
  );
}

function Matrix2x2Framework({
  fw,
  color,
}: {
  fw: Matrix2x2Fw;
  color: BlockColor;
}) {
  const cellAt = (x: "low" | "high", y: "low" | "high") =>
    fw.cells.find((c) => c.x === x && c.y === y);

  return (
    <div className="mt-3">
      <h4 className="mb-3 text-[15px] font-semibold text-white">{fw.title}</h4>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[460px] gap-1 text-[12px]"
          style={{
            gridTemplateColumns: "minmax(80px, auto) 1fr 1fr",
            gridTemplateRows: "auto 1fr 1fr",
          }}
        >
          {/* Top-left empty */}
          <div />
          {/* X-axis labels */}
          <div
            className="px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-[0.1em]"
            style={{ color: rgba(color, 0.85) }}
          >
            {fw.xAxis.low}
          </div>
          <div
            className="px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-[0.1em]"
            style={{ color: rgba(color, 0.85) }}
          >
            {fw.xAxis.high}
          </div>
          {/* Y high row */}
          <div
            className="flex items-center justify-center px-2 py-2 text-[11px] font-medium uppercase tracking-[0.1em]"
            style={{ color: rgba(color, 0.85) }}
          >
            <span
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {fw.yAxis.high}
            </span>
          </div>
          {(["low", "high"] as const).map((x) => {
            const cell = cellAt(x, "high");
            return (
              <MatrixCell key={`hi-${x}`} cell={cell} color={color} />
            );
          })}
          {/* Y low row */}
          <div
            className="flex items-center justify-center px-2 py-2 text-[11px] font-medium uppercase tracking-[0.1em]"
            style={{ color: rgba(color, 0.85) }}
          >
            <span
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {fw.yAxis.low}
            </span>
          </div>
          {(["low", "high"] as const).map((x) => {
            const cell = cellAt(x, "low");
            return (
              <MatrixCell key={`lo-${x}`} cell={cell} color={color} />
            );
          })}
        </div>
      </div>
      <div
        className="mt-2 text-[11px]"
        style={{ color: "rgba(255,255,255,0.45)" }}
      >
        ↕ {fw.yAxis.label}{" "}
        <span className="mx-1 opacity-60">×</span>
        ↔ {fw.xAxis.label}
      </div>
      {fw.explanation && (
        <p
          className="mt-3 text-[12.5px] leading-relaxed"
          style={{ color: "rgba(255,255,255,0.62)" }}
          dangerouslySetInnerHTML={{ __html: renderRichText(fw.explanation) }}
        />
      )}
    </div>
  );
}

function MatrixCell({
  cell,
  color,
}: {
  cell: Matrix2x2Fw["cells"][number] | undefined;
  color: BlockColor;
}) {
  if (!cell) {
    return (
      <div
        className="rounded-lg border border-dashed"
        style={{
          background: "rgba(0,0,0,0.15)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      />
    );
  }
  return (
    <div
      className="rounded-lg border p-3 text-center"
      style={{
        background: cell.highlight
          ? rgba(color, 0.14)
          : "rgba(20,22,28,0.6)",
        borderColor: cell.highlight
          ? rgba(color, 0.55)
          : "rgba(255,255,255,0.1)",
      }}
    >
      <div
        className="text-[13px] font-semibold"
        style={{ color: cell.highlight ? rgba(color, 1) : "white" }}
      >
        {cell.highlight && "🌟 "}
        {cell.title}
      </div>
      {cell.sub && (
        <div
          className="mt-1 text-[11px] leading-snug"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          {cell.sub}
        </div>
      )}
    </div>
  );
}

function ComparisonFramework({ fw }: { fw: ComparisonFw }) {
  const sideStyle = (
    tone: ComparisonFw["left"]["tone"] | undefined,
  ): { bg: string; border: string; text: string } => {
    if (tone === "pro")
      return {
        bg: "rgba(74,222,128,0.05)",
        border: "rgba(74,222,128,0.18)",
        text: "rgb(134,239,172)",
      };
    if (tone === "con")
      return {
        bg: "rgba(248,113,113,0.05)",
        border: "rgba(248,113,113,0.18)",
        text: "rgb(252,165,165)",
      };
    return {
      bg: "rgba(255,255,255,0.04)",
      border: "rgba(255,255,255,0.12)",
      text: "rgba(255,255,255,0.85)",
    };
  };

  const left = sideStyle(fw.left.tone);
  const right = sideStyle(fw.right.tone);

  return (
    <div className="mt-3">
      <h4 className="mb-3 text-[15px] font-semibold text-white">{fw.title}</h4>
      <div className="grid gap-2 md:grid-cols-2">
        {[
          { side: fw.left, style: left },
          { side: fw.right, style: right },
        ].map((col, idx) => (
          <div
            key={idx}
            className="rounded-xl border p-4"
            style={{
              background: col.style.bg,
              borderColor: col.style.border,
            }}
          >
            <div
              className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em]"
              style={{ color: col.style.text }}
            >
              {col.side.tone === "pro"
                ? "✓ "
                : col.side.tone === "con"
                  ? "✗ "
                  : "• "}
              {col.side.label}
            </div>
            <ul className="space-y-1.5 text-[13px] leading-relaxed">
              {col.side.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className="mt-[2px] shrink-0 text-[12px]"
                    style={{ color: col.style.text }}
                  >
                    {col.side.tone === "pro"
                      ? "✓"
                      : col.side.tone === "con"
                        ? "✗"
                        : "•"}
                  </span>
                  <span
                    style={{ color: "rgba(255,255,255,0.85)" }}
                    dangerouslySetInnerHTML={{ __html: renderRichText(item) }}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {fw.explanation && (
        <p
          className="mt-3 text-[12.5px] leading-relaxed"
          style={{ color: "rgba(255,255,255,0.62)" }}
          dangerouslySetInnerHTML={{ __html: renderRichText(fw.explanation) }}
        />
      )}
    </div>
  );
}

function FormulaFramework({
  fw,
  color,
}: {
  fw: FormulaFw;
  color: BlockColor;
}) {
  return (
    <div className="mt-3">
      {fw.title && (
        <h4 className="mb-2 text-[15px] font-semibold text-white">
          {fw.title}
        </h4>
      )}
      <div
        className="rounded-xl border-l-[3px] border-y border-r px-5 py-4 text-center"
        style={{
          background: rgba(color, 0.06),
          borderLeftColor: rgba(color, 0.7),
          borderTopColor: rgba(color, 0.15),
          borderRightColor: rgba(color, 0.15),
          borderBottomColor: rgba(color, 0.15),
        }}
      >
        <div className="text-[15px] font-semibold leading-snug text-white">
          {fw.formula}
        </div>
        {fw.sub && (
          <div
            className="mt-1.5 text-[12px]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            {fw.sub}
          </div>
        )}
      </div>
    </div>
  );
}

function MnemonicFramework({
  fw,
  color,
}: {
  fw: MnemonicFw;
  color: BlockColor;
}) {
  return (
    <div className="mt-3">
      <h4 className="mb-2 text-[15px] font-semibold text-white">{fw.title}</h4>
      <div
        className="rounded-xl border p-4"
        style={{
          background: rgba(color, 0.05),
          borderColor: rgba(color, 0.22),
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[20px]">🧠</span>
          <span
            className="text-[20px] font-extrabold tracking-[0.08em]"
            style={{ color: rgba(color, 1) }}
          >
            {fw.acronym}
          </span>
        </div>
        <ul className="mt-3 space-y-1.5">
          {fw.expansion.map((row, i) => (
            <li
              key={i}
              className="flex gap-3 text-[13px]"
              style={{ color: "rgba(255,255,255,0.78)" }}
            >
              <span
                className="w-6 shrink-0 font-bold"
                style={{ color: rgba(color, 1) }}
              >
                {row.letter}
              </span>
              <span>{row.meaning}</span>
            </li>
          ))}
        </ul>
        {fw.hook && (
          <div
            className="mt-3 rounded-lg px-3 py-2 text-[12px] italic leading-relaxed"
            style={{
              background: "rgba(0,0,0,0.18)",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {fw.hook}
          </div>
        )}
      </div>
    </div>
  );
}

function LinkNoteFramework({ fw }: { fw: LinkNoteFw }) {
  return (
    <div
      className="mt-3 rounded-xl border p-4"
      style={{
        background: "rgba(167,139,250,0.06)",
        borderColor: "rgba(167,139,250,0.22)",
      }}
    >
      <div className="flex items-start gap-2.5">
        <span className="text-[14px] leading-none">🔗</span>
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]">
            <span style={{ color: "rgb(196,181,253)" }}>{fw.fromTopic}</span>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>→</span>
            <span style={{ color: "rgb(196,181,253)" }}>{fw.toTopic}</span>
          </div>
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.82)" }}
            dangerouslySetInnerHTML={{ __html: renderRichText(fw.explanation) }}
          />
        </div>
      </div>
    </div>
  );
}

function CalloutFramework({
  fw,
  color,
}: {
  fw: CalloutFw;
  color: BlockColor;
}) {
  const tone = fw.tone;
  const accent = tone && tone !== "neutral" ? calloutRgba(tone, 1) : rgba(color, 0.85);
  const tint = tone && tone !== "neutral" ? calloutRgba(tone, 0.05) : rgba(color, 0.04);

  return (
    <div
      className="mt-3 rounded-r-xl border-l-[3px] px-4 py-3 sm:px-5 sm:py-3.5"
      style={{ background: tint, borderLeftColor: accent }}
    >
      {fw.title && (
        <div
          className="mb-1 text-[12px] font-bold uppercase tracking-[0.1em]"
          style={{ color: accent }}
        >
          {fw.title}
        </div>
      )}
      <div
        className="text-[13.5px] leading-relaxed"
        style={{ color: "rgba(255,255,255,0.85)" }}
        dangerouslySetInnerHTML={{ __html: renderRichText(fw.body) }}
      />
    </div>
  );
}

function TableFramework({ fw, color }: { fw: TableFw; color: BlockColor }) {
  const colCount = fw.headers?.length ?? fw.rows[0]?.length ?? 0;

  return (
    <div className="mt-3">
      {fw.title && (
        <h4 className="mb-3 text-[15px] font-semibold text-white">{fw.title}</h4>
      )}
      <div
        className="overflow-x-auto rounded-xl border"
        style={{
          background: rgba(color, 0.025),
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <table className="w-full border-collapse text-[12.5px]">
          {fw.headers && fw.headers.length > 0 && (
            <thead>
              <tr>
                {fw.headers.map((h, i) => (
                  <th
                    key={i}
                    className="border-b-2 px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.08em]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderBottomColor: rgba(color, 0.35),
                      color: rgba(color, 1),
                    }}
                    dangerouslySetInnerHTML={{ __html: renderRichText(h) }}
                  />
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {fw.rows.map((row, ri) => (
              <tr key={ri}>
                {Array.from({ length: colCount }).map((_, ci) => {
                  const cell = row[ci] ?? "";
                  return (
                    <td
                      key={ci}
                      className="border-b px-3 py-2.5 align-top leading-relaxed"
                      style={{
                        borderBottomColor: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.78)",
                      }}
                      dangerouslySetInnerHTML={{ __html: renderRichText(cell) }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {fw.caption && (
        <p
          className="mt-2 text-[11.5px]"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          {fw.caption}
        </p>
      )}
    </div>
  );
}

function ConceptGridFramework({
  fw,
  color,
}: {
  fw: ConceptGridFw;
  color: BlockColor;
}) {
  const edge = fw.accentEdge ?? "top";

  return (
    <div className="mt-3">
      {fw.title && (
        <h4 className="mb-3 text-[15px] font-semibold text-white">{fw.title}</h4>
      )}
      <div
        className="grid gap-2.5"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        {fw.cards.map((card, i) => {
          const accent = card.accent ?? color;
          const borderStyle: React.CSSProperties =
            edge === "left"
              ? {
                  borderLeftColor: rgba(accent, 0.7),
                  borderLeftWidth: 3,
                }
              : {
                  borderTopColor: rgba(accent, 0.7),
                  borderTopWidth: 3,
                };
          return (
            <div
              key={i}
              className="rounded-xl border p-4 transition-colors"
              style={{
                background: "rgba(20,22,28,0.5)",
                borderColor: "rgba(255,255,255,0.08)",
                ...borderStyle,
              }}
            >
              <div className="mb-1.5 flex items-center gap-2 text-[14px] font-semibold text-white">
                {card.icon && <span className="text-[16px]">{card.icon}</span>}
                <span
                  dangerouslySetInnerHTML={{
                    __html: renderRichText(card.title),
                  }}
                />
              </div>
              <p
                className="text-[12.5px] leading-relaxed"
                style={{ color: "rgba(255,255,255,0.7)" }}
                dangerouslySetInnerHTML={{ __html: renderRichText(card.body) }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

type AnyFramework = VisualMap["blocks"][number]["frameworks"][number];

function FrameworkSwitch({
  fw,
  color,
}: {
  fw: AnyFramework;
  color: BlockColor;
}) {
  switch (fw.kind) {
    case "flow":
      return <FlowFramework fw={fw} color={color} />;
    case "matrix2x2":
      return <Matrix2x2Framework fw={fw} color={color} />;
    case "comparison":
      return <ComparisonFramework fw={fw} />;
    case "formula":
      return <FormulaFramework fw={fw} color={color} />;
    case "mnemonic":
      return <MnemonicFramework fw={fw} color={color} />;
    case "link_note":
      return <LinkNoteFramework fw={fw} />;
    case "callout":
      return <CalloutFramework fw={fw} color={color} />;
    case "table":
      return <TableFramework fw={fw} color={color} />;
    case "concept_grid":
      return <ConceptGridFramework fw={fw} color={color} />;
  }
}

function PriorityChip({ priority }: { priority: Priority }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]"
      style={{
        background: priorityRgba(priority, 0.12),
        color: priorityRgba(priority, 1),
      }}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

function TimeChip({ minutes }: { minutes: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold"
      style={{
        background: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.7)",
      }}
    >
      <span aria-hidden>⏱</span>
      {minutes} Min
    </span>
  );
}

function RoadmapView({ blocks }: { blocks: VisualBlock[] }) {
  const steps = blocks.filter((b) => b.priority && b.timeMinutes);
  if (steps.length < 2) return null;

  const total = steps.reduce((sum, s) => sum + (s.timeMinutes ?? 0), 0);

  return (
    <div className="mb-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[18px]" aria-hidden>
            🗺️
          </span>
          <h3 className="text-[18px] font-bold tracking-[-0.3px] text-white">
            Dein Lern-Pfad
          </h3>
        </div>
        <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.55)" }}>
          {steps.length} Themen · ~{total} Min
        </p>
      </div>
      <ol className="space-y-2.5">
        {steps.map((step, i) => {
          const p = step.priority as Priority;
          return (
            <li
              key={`step-${i}`}
              className="flex gap-3 rounded-xl border p-3.5 sm:gap-4 sm:p-4"
              style={{
                background: "rgba(20,22,28,0.5)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[15px] font-extrabold text-white sm:h-10 sm:w-10"
                style={{
                  background: `linear-gradient(135deg, ${priorityRgba(p, 1)}, ${priorityRgba(p, 0.7)})`,
                }}
              >
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[14px] font-bold text-white sm:text-[15px]">
                  {step.icon && <span aria-hidden>{step.icon}</span>}
                  <span className="truncate">{step.title}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <PriorityChip priority={p} />
                  {step.timeMinutes !== undefined && (
                    <TimeChip minutes={step.timeMinutes} />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SectionHeader({ block }: { block: VisualBlock }) {
  return (
    <div className="mb-4 flex flex-wrap items-start gap-3 sm:flex-nowrap sm:items-center sm:gap-4">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[22px] sm:h-12 sm:w-12 sm:rounded-2xl sm:text-[24px]"
        style={{
          background: `linear-gradient(135deg, ${rgba(block.color, 0.85)}, ${rgba(block.color, 0.5)})`,
        }}
        aria-hidden
      >
        {block.icon ?? "✨"}
      </div>
      <div className="min-w-0 flex-1">
        {block.subtitle && (
          <div
            className="text-[10.5px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            {block.subtitle}
          </div>
        )}
        <h3 className="mt-0.5 text-[18px] font-extrabold tracking-[-0.3px] text-white sm:text-[20px]">
          {block.title}
        </h3>
      </div>
      {(block.priority || block.timeMinutes) && (
        <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
          {block.priority && <PriorityChip priority={block.priority} />}
          {block.timeMinutes !== undefined && (
            <TimeChip minutes={block.timeMinutes} />
          )}
        </div>
      )}
    </div>
  );
}

export default function VisualMapView({ map }: { map: VisualMap }) {
  if (!map.blocks.length) {
    return (
      <p className="text-[14px]" style={{ color: "var(--color-ln-mute)" }}>
        Keine visuelle Übersicht verfügbar.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <RoadmapView blocks={map.blocks} />
      {map.blocks.map((block, bi) => (
        <motion.section
          key={`${block.title}-${bi}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: bi * 0.05, duration: 0.4 }}
        >
          <SectionHeader block={block} />

          {/* Frameworks within block */}
          <div
            className="rounded-2xl border p-4 sm:p-5"
            style={{
              background: rgba(block.color, 0.03),
              borderColor: rgba(block.color, 0.14),
            }}
          >
            {block.frameworks.map((fw, fi) => (
              <FrameworkSwitch
                key={`${block.title}-fw-${fi}`}
                fw={fw}
                color={block.color}
              />
            ))}
          </div>
        </motion.section>
      ))}
    </div>
  );
}
