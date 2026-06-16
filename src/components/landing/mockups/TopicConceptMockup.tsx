"use client";

import { Target } from "lucide-react";
import MockupShell from "./MockupShell";

/**
 * Focused excerpt of an English-material concept (for the "Folien auf Deutsch
 * oder Englisch?" multilingual proof). The real VisualMap/Übersicht is too dense
 * and not statically renderable (motion + interactive chips); this shows one
 * concept (Definition + relevance + compare) rendered in English.
 */
const PRIMARY = "var(--color-primary-bright)";
const TEAL = "var(--color-cat-teal)";

export default function TopicConceptMockup() {
  return (
    <MockupShell glow="#4B57D6" glowX="50%" glowY="52%" tilt="r">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.5)" }}>
          Topic · Competitive Strategy
        </span>
        <span
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
          style={{ background: "rgba(79,209,165,0.14)", color: TEAL, border: "1px solid rgba(79,209,165,0.35)" }}
        >
          <Target size={10} strokeWidth={2.2} aria-hidden />
          High relevance
        </span>
      </div>

      <div className="mt-2.5 text-[16px] font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
        Porter&apos;s Five Forces
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
        A framework analysing the five competitive forces that shape an industry:
        rivalry, new entrants, substitutes, supplier power and buyer power.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { k: "Low rivalry", v: "Higher margins" },
          { k: "High entry barriers", v: "Protected position" },
        ].map((c) => (
          <div
            key={c.k}
            className="rounded-xl border px-3 py-2"
            style={{ background: "#171C30", borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="text-[12px] font-semibold text-white">{c.k}</div>
            <div className="text-[11.5px]" style={{ color: "rgba(255,255,255,0.55)" }}>{c.v}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[12px]" style={{ color: PRIMARY }}>
        <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(110,128,242,0.16)" }}>
          EN
        </span>
        <span style={{ color: "rgba(255,255,255,0.5)" }}>Aus deinem englischen Skript erkannt.</span>
      </div>
    </MockupShell>
  );
}
