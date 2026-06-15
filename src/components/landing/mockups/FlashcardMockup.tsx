"use client";

import type { CSSProperties } from "react";
import FlashcardDeck from "@/components/pack/FlashcardDeck";
import { DEMO_CARDS } from "./demoPack";

/**
 * FlashcardMockup — the REAL FlashcardDeck rendered with one static demo card
 * (razor-sharp DOM). Inert: pointer-events off, aria-hidden. Renders the
 * question side (the component's deterministic default); no packId so the
 * fire-and-forget review action never runs.
 */
const INDIGO = "#2B3499";

export default function FlashcardMockup() {
  return (
    <div className="relative">
      <div
        className="ln-fb-glow"
        style={
          {
            background: `radial-gradient(circle, ${INDIGO} 0%, transparent 70%)`,
            "--fb-gx": "50%",
            "--fb-gy": "55%",
          } as CSSProperties
        }
        aria-hidden
      />
      <div className="ln-fb-device ln-fb-tilt-r">
        <div
          inert
          aria-hidden
          className="pointer-events-none select-none overflow-hidden rounded-[18px] border p-4 md:p-5"
          style={{
            background: "var(--color-bg)",
            borderColor: "rgba(255,255,255,0.10)",
            boxShadow:
              "0 34px 60px -28px rgba(0,0,0,0.72), 0 10px 28px -16px rgba(43,52,153,0.5)",
          }}
        >
          <FlashcardDeck cards={DEMO_CARDS} language="de" />
        </div>
      </div>
    </div>
  );
}
