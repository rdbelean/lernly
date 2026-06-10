"use client";

import { Fragment, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronRight,
  Check,
  Clock,
  Lightbulb,
  Link2,
  Map as MapIcon,
  Plus,
  Sparkles,
  Star,
  Target,
  X,
  type LucideIcon,
} from "lucide-react";
import type {
  CalloutFrameworkSchema,
  ComparisonFrameworkSchema,
  ConceptGridFrameworkSchema,
  ExamLens,
  FlowFrameworkSchema,
  FormulaFrameworkSchema,
  LinkNoteFrameworkSchema,
  Matrix2x2FrameworkSchema,
  MnemonicFrameworkSchema,
  StudyPack,
  TableFrameworkSchema,
  VisualBlockPrioritySchema,
} from "@/lib/schema";
import type { z } from "zod";
import { examLensBadgeText, findTopicAppearances } from "@/lib/examLens";
import { renderRichText } from "@/lib/richText";

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
type Overview = StudyPack["overview"];
type Topic = Overview["topics"][number];
type Concept = Topic["concepts"][number];
type Language = "en" | "de";

// =========================================================================
// Visual Map — unified design pass
// =========================================================================
// Color rule (the WHOLE legend, applied identically everywhere):
//   default surfaces       → #141930 bg, rgba(255,255,255,0.06) border
//   highlight (key thing)  → #6E80F2 border + rgba(110,128,242,0.09) tint
//   callout / Merke / trap → #F2A33C amber left border
//   priority badges        → highest=#F2845C coral · high=#6E80F2 indigo
//                            quick_win=#F2A33C amber · moderate=neutral
//   relevance / comparison → kam dran/pro = #4FD1A5 teal, con = #F2845C coral
// Stored block.color / accent / icon (legacy rainbow + emoji) is ignored at
// the render layer — old packs look unified without regeneration.
// =========================================================================

const NEUTRAL_BG = "#141930";
const NEUTRAL_BG_2 = "#171C30";
const NEUTRAL_BORDER = "rgba(255,255,255,0.06)";
const NEUTRAL_BORDER_2 = "rgba(255,255,255,0.10)";
const TEXT = "#EAEDF7";
const TEXT_DIM = "#9098B6";
const TEXT_FAINT = "#6F7799";
const HIGHLIGHT_FG = "#6E80F2";
const HIGHLIGHT_TINT = "rgba(110,128,242,0.09)";
const AMBER = "#F2A33C";
const AMBER_TINT = "rgba(242,163,60,0.10)";
const CORAL = "#F2845C";
const CORAL_TINT = "rgba(242,132,92,0.10)";
const TEAL = "#4FD1A5";
const TEAL_TINT = "rgba(79,209,165,0.10)";
const DISPLAY_FONT = "var(--font-display)";

const PRIORITY_RANK: Record<Priority | "_default", number> = {
  highest: 4,
  high: 3,
  moderate: 2,
  quick_win: 1,
  _default: 2,
};

const PRIORITY_TONE: Record<
  Priority,
  { fg: string; bg: string; label: string }
> = {
  highest: { fg: CORAL, bg: CORAL_TINT, label: "HÖCHSTE PRIORITÄT" },
  high: { fg: HIGHLIGHT_FG, bg: HIGHLIGHT_TINT, label: "WICHTIG" },
  moderate: {
    fg: TEXT_FAINT,
    bg: "rgba(255,255,255,0.04)",
    label: "BASIS",
  },
  quick_win: { fg: AMBER, bg: AMBER_TINT, label: "QUICK WIN" },
};

function priorityRank(p: Priority | undefined): number {
  return PRIORITY_RANK[p ?? "_default"];
}

// Strip emoji + variation selectors that the model bakes into older packs
// so the unified icon system is the only thing the eye lands on. Covers
// the common pictograph blocks plus zero-width joiner sequences.
const EMOJI_RE =
  /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]+/gu;
function stripEmoji(s: string | undefined | null): string {
  if (!s) return "";
  return s.replace(EMOJI_RE, "").replace(/\s+/g, " ").trim();
}

// Hash-based block-icon pick from a tiny lucide pool. The model's stored
// `block.icon` is ignored (it's an arbitrary emoji); we want the same
// title to always pick the same icon so re-renders stay stable.
const BLOCK_ICON_POOL: LucideIcon[] = [
  BookOpen,
  Brain,
  Lightbulb,
  MapIcon,
  Target,
  Sparkles,
  Link2,
];
function pickBlockIcon(title: string): LucideIcon {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return BLOCK_ICON_POOL[Math.abs(hash) % BLOCK_ICON_POOL.length];
}

// =========================================================================
// Topic index — same as before, unchanged
// =========================================================================
type TopicIndex = { byLower: Map<string, Topic>; topics: Topic[] };

function buildTopicIndex(overview: Overview | undefined): TopicIndex {
  const topics = overview?.topics ?? [];
  const byLower = new Map<string, Topic>();
  for (const t of topics) byLower.set(t.name.toLowerCase().trim(), t);
  return { byLower, topics };
}

function findTopicForBlock(
  block: VisualBlock,
  idx: TopicIndex,
): Topic | undefined {
  const blockLower = stripEmoji(block.title).toLowerCase().trim();
  const exact = idx.byLower.get(blockLower);
  if (exact) return exact;
  for (const t of idx.topics) {
    const tLower = t.name.toLowerCase().trim();
    if (tLower.length < 4 || blockLower.length < 4) continue;
    if (blockLower.includes(tLower) || tLower.includes(blockLower)) return t;
  }
  return undefined;
}

// =========================================================================
// Chips
// =========================================================================

function PriorityChip({ priority }: { priority: Priority }) {
  const tone = PRIORITY_TONE[priority];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
      style={{ background: tone.bg, color: tone.fg }}
    >
      {tone.label}
    </span>
  );
}

function TimeChip({ minutes }: { minutes: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold"
      style={{
        background: "rgba(255,255,255,0.03)",
        borderColor: NEUTRAL_BORDER,
        color: TEXT_DIM,
      }}
    >
      <Clock size={11} strokeWidth={2} aria-hidden />
      {minutes} Min
    </span>
  );
}

// =========================================================================
// Frameworks
// =========================================================================

function FlowFramework({ fw }: { fw: FlowFw }) {
  const Arrow =
    fw.arrows === "bidirectional"
      ? ArrowLeftRight
      : fw.arrows === "plus"
        ? Plus
        : ArrowRight;
  return (
    <div className="mt-4">
      <h4
        className="mb-3 text-[14px] font-semibold"
        style={{ color: TEXT, fontFamily: DISPLAY_FONT }}
      >
        {stripEmoji(fw.title)}
      </h4>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {fw.boxes.map((box, i) => (
          <Fragment key={`flow-${i}`}>
            <div
              className="min-w-[110px] rounded-xl border px-3.5 py-2.5 text-center"
              style={{
                background: NEUTRAL_BG_2,
                borderColor: NEUTRAL_BORDER,
              }}
            >
              <div className="text-[12px] font-semibold" style={{ color: TEXT }}>
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
        ))}
      </div>
      {fw.explanation && (
        <p
          className="mt-3 text-[12.5px] leading-relaxed"
          style={{ color: TEXT_DIM }}
          dangerouslySetInnerHTML={{ __html: renderRichText(fw.explanation) }}
        />
      )}
    </div>
  );
}

function Matrix2x2Framework({ fw }: { fw: Matrix2x2Fw }) {
  const cellAt = (x: "low" | "high", y: "low" | "high") =>
    fw.cells.find((c) => c.x === x && c.y === y);

  const axisLabel = (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em]"
      style={{ color: TEXT_DIM }}
    />
  );
  void axisLabel; // referenced for type-only intent — unused at runtime

  return (
    <div className="mt-4">
      <h4
        className="mb-3 text-[14px] font-semibold"
        style={{ color: TEXT, fontFamily: DISPLAY_FONT }}
      >
        {stripEmoji(fw.title)}
      </h4>
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
            <span
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
              }}
            >
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
            <span
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
              }}
            >
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
        style={{ color: TEXT_FAINT }}
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
      {fw.explanation && (
        <p
          className="mt-3 text-[12.5px] leading-relaxed"
          style={{ color: TEXT_DIM }}
          dangerouslySetInnerHTML={{ __html: renderRichText(fw.explanation) }}
        />
      )}
    </div>
  );
}

function MatrixCell({
  cell,
}: {
  cell: Matrix2x2Fw["cells"][number] | undefined;
}) {
  if (!cell) {
    return (
      <div
        className="rounded-lg border border-dashed"
        style={{
          background: "rgba(0,0,0,0.15)",
          borderColor: NEUTRAL_BORDER,
        }}
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
        <div
          className="mt-1 text-[11px] leading-snug"
          style={{ color: TEXT_DIM }}
        >
          {stripEmoji(cell.sub)}
        </div>
      )}
    </div>
  );
}

function ComparisonFramework({ fw }: { fw: ComparisonFw }) {
  type SideStyle = {
    fg: string;
    bg: string;
    border: string;
    Icon: LucideIcon | null;
  };
  const sideStyle = (
    tone: ComparisonFw["left"]["tone"] | undefined,
  ): SideStyle => {
    if (tone === "pro")
      return {
        fg: TEAL,
        bg: TEAL_TINT,
        border: "rgba(79,209,165,0.22)",
        Icon: Check,
      };
    if (tone === "con")
      return {
        fg: CORAL,
        bg: CORAL_TINT,
        border: "rgba(242,132,92,0.22)",
        Icon: X,
      };
    return {
      fg: TEXT_DIM,
      bg: NEUTRAL_BG_2,
      border: NEUTRAL_BORDER,
      Icon: null,
    };
  };
  const left = sideStyle(fw.left.tone);
  const right = sideStyle(fw.right.tone);
  const sides = [
    { side: fw.left, style: left },
    { side: fw.right, style: right },
  ];
  return (
    <div className="mt-4">
      <h4
        className="mb-3 text-[14px] font-semibold"
        style={{ color: TEXT, fontFamily: DISPLAY_FONT }}
      >
        {stripEmoji(fw.title)}
      </h4>
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
                {ItemIcon && (
                  <ItemIcon size={12} strokeWidth={2.2} aria-hidden />
                )}
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
      {fw.explanation && (
        <p
          className="mt-3 text-[12.5px] leading-relaxed"
          style={{ color: TEXT_DIM }}
          dangerouslySetInnerHTML={{ __html: renderRichText(fw.explanation) }}
        />
      )}
    </div>
  );
}

function FormulaFramework({ fw }: { fw: FormulaFw }) {
  return (
    <div className="mt-4">
      {fw.title && (
        <h4
          className="mb-2 text-[14px] font-semibold"
          style={{ color: TEXT, fontFamily: DISPLAY_FONT }}
        >
          {stripEmoji(fw.title)}
        </h4>
      )}
      <div
        className="rounded-xl px-5 py-4 text-center"
        style={{
          background: NEUTRAL_BG_2,
          border: `1px solid ${NEUTRAL_BORDER}`,
          borderLeft: `3px solid ${HIGHLIGHT_FG}`,
        }}
      >
        <div
          className="text-[15px] font-semibold leading-snug"
          style={{ color: TEXT }}
        >
          {fw.formula}
        </div>
        {fw.sub && (
          <div
            className="mt-1.5 text-[12px]"
            style={{ color: TEXT_DIM }}
          >
            {stripEmoji(fw.sub)}
          </div>
        )}
      </div>
    </div>
  );
}

function MnemonicFramework({ fw }: { fw: MnemonicFw }) {
  return (
    <div className="mt-4">
      <h4
        className="mb-2 text-[14px] font-semibold"
        style={{ color: TEXT, fontFamily: DISPLAY_FONT }}
      >
        {stripEmoji(fw.title)}
      </h4>
      <div
        className="rounded-xl border p-4"
        style={{
          background: NEUTRAL_BG_2,
          borderColor: NEUTRAL_BORDER,
        }}
      >
        <div className="flex items-center gap-2">
          <Brain
            size={20}
            strokeWidth={1.75}
            color={HIGHLIGHT_FG}
            aria-hidden
          />
          <span
            className="text-[20px] font-semibold tracking-[0.08em]"
            style={{ color: HIGHLIGHT_FG, fontFamily: DISPLAY_FONT }}
          >
            {fw.acronym}
          </span>
        </div>
        <ul className="mt-3 space-y-1.5">
          {fw.expansion.map((row, i) => (
            <li
              key={i}
              className="flex gap-3 text-[13px]"
              style={{ color: TEXT }}
            >
              <span
                className="w-6 shrink-0 font-semibold"
                style={{ color: HIGHLIGHT_FG }}
              >
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

function LinkNoteFramework({ fw }: { fw: LinkNoteFw }) {
  return (
    <div
      className="mt-4 rounded-xl border p-4"
      style={{
        background: NEUTRAL_BG_2,
        borderColor: NEUTRAL_BORDER,
      }}
    >
      <div className="flex items-start gap-2.5">
        <Link2
          size={14}
          strokeWidth={1.75}
          color={HIGHLIGHT_FG}
          aria-hidden
          className="mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]">
            <span style={{ color: HIGHLIGHT_FG }}>
              {stripEmoji(fw.fromTopic)}
            </span>
            <ArrowRight
              size={11}
              strokeWidth={1.75}
              color={TEXT_FAINT}
              aria-hidden
            />
            <span style={{ color: HIGHLIGHT_FG }}>
              {stripEmoji(fw.toTopic)}
            </span>
          </div>
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: TEXT }}
            dangerouslySetInnerHTML={{ __html: renderRichText(fw.explanation) }}
          />
        </div>
      </div>
    </div>
  );
}

function CalloutFramework({ fw }: { fw: CalloutFw }) {
  // Every callout uses amber per the unified legend. The stored `tone` only
  // picks the leading icon — never the color, so the eye learns "amber =
  // pause and pay attention" regardless of what kind of note it is.
  const Icon =
    fw.tone === "warning"
      ? AlertTriangle
      : fw.tone === "definition"
        ? BookOpen
        : fw.tone === "insight"
          ? Lightbulb
          : null;
  return (
    <div
      className="mt-4 rounded-r-xl px-4 py-3 sm:px-5 sm:py-3.5"
      style={{
        background: AMBER_TINT,
        borderLeft: `3px solid ${AMBER}`,
      }}
    >
      {fw.title && (
        <div
          className="mb-1 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: AMBER }}
        >
          {Icon && <Icon size={13} strokeWidth={2.2} aria-hidden />}
          {stripEmoji(fw.title)}
        </div>
      )}
      <div
        className="text-[13.5px] leading-relaxed"
        style={{ color: TEXT }}
        dangerouslySetInnerHTML={{ __html: renderRichText(fw.body) }}
      />
    </div>
  );
}

function TableFramework({ fw }: { fw: TableFw }) {
  const colCount = fw.headers?.length ?? fw.rows[0]?.length ?? 0;
  return (
    <div className="mt-4">
      {fw.title && (
        <h4
          className="mb-3 text-[14px] font-semibold"
          style={{ color: TEXT, fontFamily: DISPLAY_FONT }}
        >
          {stripEmoji(fw.title)}
        </h4>
      )}
      <div
        className="overflow-x-auto rounded-xl border"
        style={{
          background: NEUTRAL_BG_2,
          borderColor: NEUTRAL_BORDER,
        }}
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
        <p
          className="mt-2 text-[11.5px]"
          style={{ color: TEXT_FAINT }}
        >
          {stripEmoji(fw.caption)}
        </p>
      )}
    </div>
  );
}

function ConceptGridFramework({ fw }: { fw: ConceptGridFw }) {
  return (
    <div className="mt-4">
      {fw.title && (
        <h4
          className="mb-3 text-[14px] font-semibold"
          style={{ color: TEXT, fontFamily: DISPLAY_FONT }}
        >
          {stripEmoji(fw.title)}
        </h4>
      )}
      <div
        className="grid gap-2.5"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        {fw.cards.map((card, i) => (
          <div
            key={i}
            className="rounded-xl border p-4"
            style={{
              background: NEUTRAL_BG_2,
              borderColor: NEUTRAL_BORDER,
            }}
          >
            <div
              className="mb-1.5 text-[14px] font-semibold"
              style={{ color: TEXT, fontFamily: DISPLAY_FONT }}
              dangerouslySetInnerHTML={{
                __html: renderRichText(stripEmoji(card.title)),
              }}
            />
            <p
              className="text-[12.5px] leading-relaxed"
              style={{ color: TEXT_DIM }}
              dangerouslySetInnerHTML={{ __html: renderRichText(card.body) }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

type AnyFramework = VisualMap["blocks"][number]["frameworks"][number];

function FrameworkSwitch({ fw }: { fw: AnyFramework }) {
  switch (fw.kind) {
    case "flow":
      return <FlowFramework fw={fw} />;
    case "matrix2x2":
      return <Matrix2x2Framework fw={fw} />;
    case "comparison":
      return <ComparisonFramework fw={fw} />;
    case "formula":
      return <FormulaFramework fw={fw} />;
    case "mnemonic":
      return <MnemonicFramework fw={fw} />;
    case "link_note":
      return <LinkNoteFramework fw={fw} />;
    case "callout":
      return <CalloutFramework fw={fw} />;
    case "table":
      return <TableFramework fw={fw} />;
    case "concept_grid":
      return <ConceptGridFramework fw={fw} />;
  }
}

// =========================================================================
// Roadmap + Section header
// =========================================================================

function RoadmapView({ blocks }: { blocks: VisualBlock[] }) {
  const steps = blocks.filter((b) => b.priority && b.timeMinutes);
  if (steps.length < 2) return null;
  const total = steps.reduce((sum, s) => sum + (s.timeMinutes ?? 0), 0);
  return (
    <div className="mb-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapIcon
            size={18}
            strokeWidth={1.75}
            color={TEXT_DIM}
            aria-hidden
          />
          <h3
            className="text-[18px] font-semibold tracking-[-0.3px]"
            style={{ color: TEXT, fontFamily: DISPLAY_FONT }}
          >
            Dein Lern-Pfad
          </h3>
        </div>
        <p className="text-[12px]" style={{ color: TEXT_FAINT }}>
          {steps.length} Themen · ~{total} Min
        </p>
      </div>
      <ol className="space-y-2">
        {steps.map((step, i) => {
          const p = step.priority as Priority;
          const tone = PRIORITY_TONE[p];
          return (
            <li
              key={`step-${i}`}
              className="flex gap-3 rounded-xl border p-3.5 sm:gap-4"
              style={{
                background: NEUTRAL_BG_2,
                borderColor: NEUTRAL_BORDER,
              }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[14px] font-semibold"
                style={{ background: tone.bg, color: tone.fg }}
              >
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="truncate text-[14px] font-semibold"
                  style={{ color: TEXT, fontFamily: DISPLAY_FONT }}
                >
                  {stripEmoji(step.title)}
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
  const tone = block.priority ? PRIORITY_TONE[block.priority] : null;
  const Icon = pickBlockIcon(block.title);
  return (
    <div className="mb-4 flex flex-wrap items-start gap-3 sm:flex-nowrap sm:items-center sm:gap-4">
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: tone?.bg ?? "rgba(255,255,255,0.04)" }}
      >
        <Icon
          size={20}
          strokeWidth={1.75}
          color={tone?.fg ?? TEXT_FAINT}
        />
      </span>
      <div className="min-w-0 flex-1">
        {block.subtitle && (
          <div
            className="text-[10.5px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: TEXT_FAINT }}
          >
            {stripEmoji(block.subtitle)}
          </div>
        )}
        <h3
          className="mt-0.5 text-[18px] font-semibold tracking-[-0.3px] sm:text-[20px]"
          style={{ color: TEXT, fontFamily: DISPLAY_FONT }}
        >
          {stripEmoji(block.title)}
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

// =========================================================================
// Concept chip strip
// =========================================================================

function ConceptChipStrip({
  concepts,
  language,
  topicName,
  examLens = null,
}: {
  concepts: Concept[];
  language: Language;
  topicName?: string;
  examLens?: ExamLens | null;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  if (!concepts || concepts.length === 0) return null;
  const isEn = language === "en";

  // Per-concept Altklausur appearances: try the concept term itself (a
  // profile topic may be concept-grained), fall back to the parent
  // overview-topic name. null = no badge.
  const topicAppearances = findTopicAppearances(examLens, topicName);
  const appearancesFor = (c: Concept) =>
    findTopicAppearances(examLens, c.term) ?? topicAppearances;

  const sorted = [...concepts].sort((a, b) => {
    const rank = (c: Concept) =>
      (appearancesFor(c) ?? 0) * 1000 +
      (c.importance === "high" ? 100 : c.importance === "medium" ? 50 : 10) +
      (c.relevanceTag ? 50 : 0);
    return rank(b) - rank(a);
  });

  const toggle = (term: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(term)) next.delete(term);
      else next.add(term);
      return next;
    });

  return (
    <div className="mb-4">
      <div
        className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: TEXT_FAINT }}
      >
        {isEn ? "Concepts to know" : "Konzepte in diesem Thema"}
      </div>
      <ul className="space-y-1.5">
        {sorted.map((c) => {
          const isOpen = expanded.has(c.term);
          const isHigh = c.importance === "high";
          return (
            <li key={c.term}>
              <button
                type="button"
                onClick={() => toggle(c.term)}
                aria-expanded={isOpen}
                className="block w-full rounded-lg border px-3 py-2 text-left transition hover:brightness-110"
                style={{
                  background: NEUTRAL_BG_2,
                  borderColor: NEUTRAL_BORDER,
                  borderLeft: `3px solid ${isHigh ? HIGHLIGHT_FG : NEUTRAL_BORDER}`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="flex-1 text-[13.5px] font-semibold leading-snug"
                    style={{ color: TEXT }}
                  >
                    {stripEmoji(c.term)}
                  </span>
                  <span
                    aria-hidden
                    className="shrink-0"
                    style={{ color: TEXT_FAINT }}
                  >
                    {isOpen ? (
                      <ChevronDown size={13} strokeWidth={2} />
                    ) : (
                      <ChevronRight size={13} strokeWidth={2} />
                    )}
                  </span>
                </div>
                {c.essence && (
                  <div
                    className="mt-0.5 truncate text-[12px] leading-snug"
                    style={{ color: TEXT_DIM }}
                    title={c.essence}
                  >
                    {stripEmoji(c.essence)}
                  </div>
                )}
                <div className="mt-1 flex flex-wrap gap-1">
                  {isHigh && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em]"
                      style={{
                        background: HIGHLIGHT_TINT,
                        borderColor: HIGHLIGHT_FG,
                        color: HIGHLIGHT_FG,
                      }}
                    >
                      <Star size={9} strokeWidth={2.2} aria-hidden />
                      {isEn ? "High" : "Wichtig"}
                    </span>
                  )}
                  {(() => {
                    const ap = appearancesFor(c);
                    const showFrequency = Boolean(examLens) && ap !== null;
                    // The frequency badge replaces the generic "kam dran"
                    // chip text; an instructor-hint component survives as
                    // its own chip. Unmatched concepts keep the legacy chip.
                    const showProfHint =
                      showFrequency &&
                      (c.relevanceTag === "Prof-Hinweis" ||
                        c.relevanceTag === "beides");
                    const showLegacyTag =
                      !showFrequency && Boolean(c.relevanceTag);
                    return (
                      <>
                        {showFrequency && examLens && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em]"
                            style={{
                              background: TEAL_TINT,
                              borderColor: TEAL,
                              color: TEAL,
                            }}
                          >
                            <Sparkles size={9} strokeWidth={2.2} aria-hidden />
                            {examLensBadgeText(
                              ap as number,
                              examLens.examCount,
                            )}
                          </span>
                        )}
                        {showProfHint && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em]"
                            style={{
                              background: TEAL_TINT,
                              borderColor: TEAL,
                              color: TEAL,
                            }}
                          >
                            Prof-Hinweis
                          </span>
                        )}
                        {showLegacyTag && c.relevanceTag && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em]"
                            style={{
                              background: TEAL_TINT,
                              borderColor: TEAL,
                              color: TEAL,
                            }}
                          >
                            <Sparkles size={9} strokeWidth={2.2} aria-hidden />
                            {stripEmoji(c.relevanceTag)}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
                {isOpen && (
                  <div
                    className="mt-3 border-t pt-3"
                    style={{ borderColor: NEUTRAL_BORDER }}
                  >
                    {c.author && (
                      <div
                        className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em]"
                        style={{ color: TEXT_FAINT }}
                      >
                        {stripEmoji(c.author)}
                      </div>
                    )}
                    <p
                      className="text-[12.5px] leading-relaxed"
                      style={{ color: TEXT }}
                      dangerouslySetInnerHTML={{
                        __html: renderRichText(c.definition),
                      }}
                    />
                    {c.examRelevance && (
                      <div
                        className="mt-2.5 rounded-lg border p-2.5"
                        style={{
                          background: HIGHLIGHT_TINT,
                          borderColor: NEUTRAL_BORDER_2,
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <Target
                            size={11}
                            strokeWidth={2}
                            color={HIGHLIGHT_FG}
                            aria-hidden
                            className="mt-0.5 shrink-0"
                          />
                          <p
                            className="text-[11.5px] leading-relaxed"
                            style={{ color: TEXT }}
                            dangerouslySetInnerHTML={{
                              __html: renderRichText(c.examRelevance),
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// =========================================================================
// Main
// =========================================================================

export default function VisualMapView({
  map,
  overview,
  language = "de",
  examLens = null,
}: {
  map: VisualMap;
  overview?: Overview;
  language?: Language;
  examLens?: ExamLens | null;
}) {
  const sortedBlocks = useMemo(() => {
    return [...map.blocks].sort((a, b) => {
      const ra = priorityRank(a.priority);
      const rb = priorityRank(b.priority);
      if (ra !== rb) return rb - ra;
      return (b.timeMinutes ?? 0) - (a.timeMinutes ?? 0);
    });
  }, [map.blocks]);

  const topicIndex = useMemo(() => buildTopicIndex(overview), [overview]);

  if (!map.blocks.length) {
    return (
      <p className="text-[14px]" style={{ color: TEXT_DIM }}>
        Keine visuelle Übersicht verfügbar.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <RoadmapView blocks={sortedBlocks} />
      {sortedBlocks.map((block, bi) => {
        const topic = findTopicForBlock(block, topicIndex);
        return (
          <motion.section
            key={`${block.title}-${bi}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: bi * 0.05, duration: 0.4 }}
          >
            <SectionHeader block={block} />
            <div
              className="rounded-2xl border p-4 sm:p-5"
              style={{
                background: NEUTRAL_BG,
                borderColor: NEUTRAL_BORDER,
              }}
            >
              {topic && (
                <ConceptChipStrip
                  concepts={topic.concepts}
                  language={language}
                  topicName={topic.name}
                  examLens={examLens}
                />
              )}
              {block.frameworks.map((fw, fi) => (
                <FrameworkSwitch
                  key={`${block.title}-fw-${fi}`}
                  fw={fw}
                />
              ))}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}
