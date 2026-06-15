"use client";

import { type CSSProperties, useEffect, useState } from "react";
import PackHub from "@/components/pack/PackHub";
import { DEMO_PACK, DEMO_EXAM, DEMO_ATTEMPT } from "./demoPack";

/**
 * PackHubMockup — the REAL PackHub component rendered with static demo data as
 * the hero visual (razor-sharp DOM, not a screenshot). Inert: pointer-events
 * off, aria-hidden, no real callbacks.
 *
 * Mounted-gate: PackHub calls Date.now() internally (countdownInfo +
 * formatRelative), which would mismatch between SSR and client. Rendering the
 * inner component only after mount keeps the countdown a live, drift-free
 * ~14-day value and avoids hydration warnings. The frame/glow render in SSR so
 * layout is stable.
 */
const INDIGO_LIGHT = "#4B57D6";

export default function PackHubMockup() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const exam = {
    ...DEMO_EXAM,
    exam_date: mounted
      ? new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10)
      : null,
  };
  const attempt = mounted
    ? { ...DEMO_ATTEMPT, created_at: new Date(Date.now() - 3 * 36e5).toISOString() }
    : DEMO_ATTEMPT;

  return (
    <div className="relative">
      <div
        className="ln-fb-glow ln-fb-glow--hero"
        style={
          {
            background: `radial-gradient(circle, ${INDIGO_LIGHT} 0%, transparent 70%)`,
            "--fb-gx": "50%",
            "--fb-gy": "50%",
          } as CSSProperties
        }
        aria-hidden
      />
      <div className="ln-fb-device ln-fb-tilt-l">
        <div
          inert
          aria-hidden
          className="pointer-events-none select-none overflow-hidden rounded-[18px] border p-5 md:p-6"
          style={{
            background: "var(--color-bg)",
            borderColor: "rgba(255,255,255,0.10)",
            boxShadow:
              "0 34px 60px -28px rgba(0,0,0,0.72), 0 10px 28px -16px rgba(43,52,153,0.5)",
          }}
        >
          {mounted ? (
            <PackHub
              pack={DEMO_PACK}
              exam={exam}
              latestAttempt={attempt}
              mastery={{ mastered: 12, total: 15 }}
              onEnterMode={() => {}}
              language="de"
            />
          ) : (
            // Approximate mounted-hub height to limit the post-hydration jump.
            <div className="min-h-[560px]" />
          )}
        </div>
      </div>
    </div>
  );
}
