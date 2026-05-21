"use client";

import { type ReactNode } from "react";

type Props = {
  eyebrow?: ReactNode;
  boldPart: ReactNode;
  italicPart?: ReactNode;
  sub?: ReactNode;
  className?: string;
  eyebrowColor?: string;
  italicColor?: string;
  /** Override the bold-part color (default: white). Used by BottomCta where
   *  the bold side is muted and the italic side pops. */
  boldColor?: string;
};

/**
 * Canonical section heading used across every landing section so the page
 * has one typographic rhythm:
 *
 *   EYEBROW  (mono uppercase, muted, tracking 0.22em)
 *   Big bold line.                  (clamp 32–64px, font-display)
 *   Italic accent line.             (same size, ln-ink-soft, italic — block, below)
 *   Optional sub paragraph.         (16px, max-w-[600px], muted)
 *
 * All centered. max-w-[820px] container so longer lines still fit on
 * desktop without ugly wrapping.
 */
export default function SectionHeading({
  eyebrow,
  boldPart,
  italicPart,
  sub,
  className,
  eyebrowColor,
  italicColor,
  boldColor,
}: Props) {
  return (
    <div
      className={
        "ln-reveal mx-auto max-w-[820px] text-center " + (className ?? "")
      }
    >
      {eyebrow && (
        <p
          className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: eyebrowColor ?? "rgba(255,255,255,0.55)" }}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className="font-bold leading-[1.05] tracking-[-1.92px]"
        style={{
          fontSize: "clamp(32px, 5.5vw, 64px)",
          color: boldColor ?? "white",
        }}
      >
        <span className="block">{boldPart}</span>
        {italicPart && (
          <span
            className="lernly-italic block"
            style={{ color: italicColor ?? "var(--color-ln-ink-soft)" }}
          >
            {italicPart}
          </span>
        )}
      </h2>
      {sub && (
        <p
          className="mx-auto mt-5 max-w-[600px] text-[16px] leading-relaxed"
          style={{ color: "rgba(255,255,255,0.62)" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
