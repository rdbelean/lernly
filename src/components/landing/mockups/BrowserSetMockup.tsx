"use client";

import { type CSSProperties } from "react";
import { Check, Lock, WifiOff } from "lucide-react";

/**
 * Card 3 visual — a browser window showing a saved study set with a clear
 * "Offline verfügbar" indicator. Communicates "runs in the browser, works
 * offline" far better than a phone/watch widget. Inert, razor-sharp DOM.
 */
const TEAL = "var(--color-cat-teal)";
const PRIMARY = "var(--color-primary-bright)";

const RATINGS = ["Wusste ich", "Unsicher", "Nochmal"];

export default function BrowserSetMockup() {
  return (
    <div className="relative">
      <div
        className="ln-fb-glow"
        style={
          {
            background: "radial-gradient(circle, #2B3499 0%, transparent 70%)",
            "--fb-gx": "50%",
            "--fb-gy": "52%",
          } as CSSProperties
        }
        aria-hidden
      />
      <div className="ln-fb-device ln-fb-tilt-l">
        <div
          inert
          aria-hidden
          className="pointer-events-none select-none overflow-hidden rounded-[18px] border"
          style={{
            borderColor: "rgba(255,255,255,0.10)",
            boxShadow:
              "0 34px 60px -28px rgba(0,0,0,0.72), 0 10px 28px -16px rgba(43,52,153,0.5)",
          }}
        >
          {/* Browser chrome */}
          <div
            className="flex items-center gap-2 border-b px-3 py-2.5"
            style={{ background: "var(--color-surface-2)", borderColor: "rgba(255,255,255,0.06)" }}
          >
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.13)" }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
            </span>
            <div
              className="ml-1 flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2.5 py-1"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <Lock size={10} className="shrink-0 text-white/40" />
              <span className="truncate text-[11px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                lernly-app.de/paket/strat-mgmt
              </span>
            </div>
          </div>

          {/* Content — a saved set, available offline */}
          <div className="p-4" style={{ background: "var(--color-bg)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.45)" }}>
                Karte 12 / 38
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                style={{ background: "rgba(79,209,165,0.14)", color: TEAL, border: "1px solid rgba(79,209,165,0.32)" }}
              >
                <WifiOff size={11} strokeWidth={2.2} aria-hidden />
                Offline verfügbar
              </span>
            </div>

            <div
              className="mt-3 rounded-2xl border px-4 py-6"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
            >
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: PRIMARY }}>
                Strategie
              </span>
              <p className="mt-2 text-[14.5px] font-medium leading-snug text-white">
                Was beschreibt die Preiselastizität der Nachfrage?
              </p>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {RATINGS.map((r) => (
                <div
                  key={r}
                  className="flex items-center justify-center whitespace-nowrap rounded-lg border px-1.5 py-2 text-center text-[10.5px] text-white/70"
                  style={{ background: "#171C30", borderColor: "rgba(255,255,255,0.06)" }}
                >
                  {r}
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              <Check size={12} strokeWidth={2.4} style={{ color: TEAL }} />
              Einmal geladen — funktioniert ohne WLAN weiter.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
