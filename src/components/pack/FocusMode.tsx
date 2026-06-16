"use client";

import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";

type Language = "en" | "de";

// FocusMode — wraps a study view and offers a distraction-free full-screen
// toggle. When active it becomes a fixed overlay over the sidebar + pack chrome
// (page background, scrollable), with a quiet close affordance and Esc-to-exit.
// The children stay mounted across the toggle (only the wrapper's positioning
// changes), so in-progress flashcard / quiz state is never lost.
export default function FocusMode({
  children,
  language = "de",
  contentClassName = "mx-auto w-full max-w-[760px] px-4 pb-20 sm:px-6",
}: {
  children: React.ReactNode;
  language?: Language;
  contentClassName?: string;
}) {
  const [focused, setFocused] = useState(false);
  const isEn = language === "en";

  useEffect(() => {
    if (!focused) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocused(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [focused]);

  return (
    <div
      className={
        focused ? "fixed inset-0 z-50 overflow-y-auto overscroll-contain" : "relative"
      }
      style={focused ? { background: "var(--color-bg)" } : undefined}
    >
      <div
        className={
          focused
            ? "sticky top-0 z-10 flex justify-end px-4 py-3 sm:px-6"
            : "mb-3 flex justify-end"
        }
        style={focused ? { background: "var(--color-bg)" } : undefined}
      >
        <button
          type="button"
          onClick={() => setFocused((f) => !f)}
          aria-pressed={focused}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition hover:bg-white/[0.06]"
          style={{
            borderColor: "rgba(255,255,255,0.12)",
            color: "var(--color-text-dim)",
          }}
        >
          {focused ? (
            <>
              <X size={14} strokeWidth={2} aria-hidden />
              {isEn ? "Close" : "Schließen"}
            </>
          ) : (
            <>
              <Maximize2 size={14} strokeWidth={2} aria-hidden />
              {isEn ? "Focus" : "Fokus"}
            </>
          )}
        </button>
      </div>

      <div className={focused ? contentClassName : ""}>{children}</div>
    </div>
  );
}
