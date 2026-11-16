import {
  accuracy,
  rowTone,
  weakestNames,
  type BreakdownRow,
} from "@/lib/pack/studyAnalysis";

// "Was saß, was nicht" — per-topic analysis for the quiz/flashcard completion
// screens so the student knows what to study next. `rows` come in weakest-first.
const TONE_COLOR: Record<string, string> = {
  weak: "var(--color-err-ink)", // coral
  warn: "var(--color-urgent-ink)", // amber
  strong: "var(--color-ok-ink)", // teal
};

export default function TopicBreakdown({
  rows,
  title,
  language = "de",
}: {
  rows: BreakdownRow[];
  title?: string;
  language?: "en" | "de";
}) {
  if (rows.length === 0) return null;
  const isEn = language === "en";
  const focus = weakestNames(rows, 2);

  return (
    <div className="w-full max-w-[440px] text-left">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span
          className="text-[12px] font-semibold"
          style={{ color: "var(--color-text-faint)" }}
        >
          {title ?? (isEn ? "By topic" : "Themen-Analyse")}
        </span>
        {focus.length > 0 && (
          <span className="text-[12px]" style={{ color: "var(--color-text-dim)" }}>
            {isEn ? "Focus" : "Jetzt dran"}:{" "}
            <span style={{ color: "var(--color-text)", fontWeight: 600 }}>
              {focus.join(", ")}
            </span>
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => {
          const color = TONE_COLOR[rowTone(r)];
          const pct = Math.round(accuracy(r) * 100);
          return (
            <li
              key={r.name}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px]"
              style={{
                background: "var(--color-ink-a04)",
                borderColor: "var(--color-ink-a10)",
                borderLeft: `3px solid ${color}`,
              }}
            >
              <span className="flex-1 truncate" style={{ color: "var(--color-text)" }}>
                {r.name}
              </span>
              <span className="tabular-nums" style={{ color: "var(--color-text-faint)" }}>
                {r.correct}/{r.total}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums"
                style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
              >
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
