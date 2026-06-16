"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * MockupShell - shared inert "app window" frame for the landing's static-copy
 * mockups (razor-sharp DOM, not bitmaps). Glow + ≤6° tilt + app-surface chrome.
 * Inert (inert attr + pointer-events-none + aria-hidden) so the demo UI is
 * purely visual. Bottom-only bleed is handled by the call-site wrapper.
 */
export default function MockupShell({
  glow = "#2B3499",
  glowStrong = false,
  glowX = "50%",
  glowY = "50%",
  tilt = "l",
  className = "",
  children,
}: {
  glow?: string;
  glowStrong?: boolean;
  glowX?: string;
  glowY?: string;
  tilt?: "l" | "r" | "phone";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`relative ${className}`}>
      <div
        className={`ln-fb-glow ${glowStrong ? "ln-fb-glow--hero" : ""}`}
        style={
          {
            background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
            "--fb-gx": glowX,
            "--fb-gy": glowY,
          } as CSSProperties
        }
        aria-hidden
      />
      <div className={`ln-fb-device ln-fb-tilt-${tilt}`}>
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
          {children}
        </div>
      </div>
    </div>
  );
}
