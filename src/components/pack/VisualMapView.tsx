"use client";

import { motion } from "motion/react";
import type {
  ComparisonFrameworkSchema,
  FlowFrameworkSchema,
  FormulaFrameworkSchema,
  LinkNoteFrameworkSchema,
  Matrix2x2FrameworkSchema,
  MnemonicFrameworkSchema,
  StudyPack,
  VisualBlockColorSchema,
} from "@/lib/schema";
import type { z } from "zod";
import { toSafeInlineHtml } from "@/lib/richText";

type BlockColor = z.infer<typeof VisualBlockColorSchema>;
type FlowFw = z.infer<typeof FlowFrameworkSchema>;
type Matrix2x2Fw = z.infer<typeof Matrix2x2FrameworkSchema>;
type ComparisonFw = z.infer<typeof ComparisonFrameworkSchema>;
type FormulaFw = z.infer<typeof FormulaFrameworkSchema>;
type MnemonicFw = z.infer<typeof MnemonicFrameworkSchema>;
type LinkNoteFw = z.infer<typeof LinkNoteFrameworkSchema>;

type VisualMap = NonNullable<StudyPack["visualMap"]>;

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
          dangerouslySetInnerHTML={{ __html: toSafeInlineHtml(fw.explanation) }}
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
          dangerouslySetInnerHTML={{ __html: toSafeInlineHtml(fw.explanation) }}
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
            <ul className="space-y-1 text-[13px] leading-relaxed">
              {col.side.items.map((item, i) => (
                <li key={i} style={{ color: "rgba(255,255,255,0.78)" }}>
                  {item}
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
          dangerouslySetInnerHTML={{ __html: toSafeInlineHtml(fw.explanation) }}
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
            dangerouslySetInnerHTML={{ __html: toSafeInlineHtml(fw.explanation) }}
          />
        </div>
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
  }
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
      {map.blocks.map((block, bi) => (
        <motion.section
          key={`${block.title}-${bi}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: bi * 0.05, duration: 0.4 }}
        >
          {/* Block header */}
          <div className="mb-4 flex items-center gap-3">
            <span
              className="inline-block h-7 w-1 rounded-full"
              style={{ background: rgba(block.color, 0.85) }}
            />
            <div>
              <h3 className="text-[18px] font-bold tracking-[-0.3px] text-white">
                {block.title}
              </h3>
              {block.subtitle && (
                <p
                  className="mt-0.5 text-[12.5px]"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {block.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Frameworks within block */}
          <div
            className="rounded-2xl border p-5"
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
