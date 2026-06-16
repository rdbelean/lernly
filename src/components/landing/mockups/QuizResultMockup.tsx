"use client";

import MockupShell from "./MockupShell";

/**
 * Focused excerpt of the quiz-result view (the real QuizView is a stateful quiz
 * machine and the full result screen is too dense to read small). Shows the
 * score + per-topic breakdown only - the part that sells "weißt sofort, wo du
 * stehst".
 */
const TEAL = "var(--color-cat-teal)";
const AMBER = "var(--color-amber)";

const TOPICS = [
  { name: "Wettbewerbsstrategie", pct: 92, color: TEAL },
  { name: "Marktdynamik", pct: 78, color: TEAL },
  { name: "Marketing-Mix", pct: 55, color: AMBER },
];

export default function QuizResultMockup() {
  return (
    <MockupShell glow="#4B57D6" glowStrong glowX="50%" glowY="50%" tilt="r">
      <div className="text-center text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.5)" }}>
        Dein Ergebnis
      </div>

      <div className="mt-2 flex items-end justify-center gap-3">
        <div
          className="font-bold leading-none"
          style={{ fontFamily: "var(--font-display)", fontSize: "56px", letterSpacing: "-2px", color: TEAL }}
        >
          88%
        </div>
        <div className="pb-1.5 text-left">
          <div className="text-[14px] font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Bestanden
          </div>
          <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.55)" }}>
            16 von 18 richtig
          </div>
        </div>
      </div>

      <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.5)" }}>
        Nach Thema
      </div>
      <div className="mt-2 space-y-3">
        {TOPICS.map((t) => (
          <div key={t.name}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[13px] text-white/85">{t.name}</span>
              <span className="text-[13px] font-semibold tabular-nums" style={{ color: t.color }}>
                {t.pct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: `${t.pct}%`, background: t.color }} />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3.5 text-[12px]" style={{ color: "rgba(255,255,255,0.5)" }}>
        Marketing-Mix ist deine Schwachstelle. Gleich nochmal üben.
      </p>
    </MockupShell>
  );
}
