"use client";

import { type CSSProperties } from "react";
import { Clock, Layers, PenLine, Signal, Wifi } from "lucide-react";

/**
 * Focused phone-hub excerpt for "Läuft im Browser. Auch ohne WLAN." A slim
 * static copy (countdown + two study modes) inside a phone bezel — not the full
 * PackHub (that's the hero) and not a bitmap.
 */
const PRIMARY = "var(--color-primary-bright)";
const AMBER = "var(--color-amber)";
const TEAL = "var(--color-cat-teal)";

export default function PhoneHubMockup() {
  return (
    <div className="relative">
      <div
        className="ln-fb-glow"
        style={
          {
            background: "radial-gradient(circle, #3A4BD8 0%, transparent 70%)",
            "--fb-gx": "50%",
            "--fb-gy": "45%",
          } as CSSProperties
        }
        aria-hidden
      />
      <div className="ln-fb-device ln-fb-tilt-phone">
        <div inert aria-hidden className="ln-ps-phone mx-auto pointer-events-none select-none">
          <div className="overflow-hidden rounded-[30px]" style={{ background: "var(--color-bg)" }}>
            {/* status bar */}
            <div className="flex items-center justify-between px-4 pb-1.5 pt-3">
              <span className="text-[11px] font-semibold text-white/90">9:41</span>
              <div className="flex items-center gap-1 text-white/70">
                <Signal size={12} />
                <Wifi size={12} />
              </div>
            </div>

            <div className="px-3.5 pb-5 pt-1">
              <div className="text-[13px] font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
                Strategisches Management
              </div>

              {/* countdown */}
              <div
                className="mt-2.5 flex items-center gap-2 rounded-xl border px-3 py-2"
                style={{ background: "rgba(242,163,60,0.10)", borderColor: "rgba(242,163,60,0.28)" }}
              >
                <Clock size={15} style={{ color: AMBER }} />
                <span className="text-[13px] font-semibold" style={{ color: AMBER }}>
                  noch 9 Tage bis zur Klausur
                </span>
              </div>

              {/* modes */}
              <div className="mt-3 space-y-2">
                {[
                  { icon: PenLine, tone: "rgba(242,132,92,0.16)", color: "var(--color-cat-coral)", title: "Übungsklausur", sub: "14 Fragen" },
                  { icon: Layers, tone: "rgba(79,209,165,0.16)", color: TEAL, title: "Karteikarten", sub: "34 Karten" },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <div
                      key={m.title}
                      className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
                      style={{ background: "#141930", borderColor: "rgba(255,255,255,0.06)" }}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: m.tone }}>
                        <Icon size={16} style={{ color: m.color }} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-white">{m.title}</div>
                        <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>{m.sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className="mt-3 rounded-xl py-2.5 text-center text-[12.5px] font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #2B3499, #4B57D6)" }}
              >
                Weiterlernen
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                <Wifi size={11} style={{ color: PRIMARY }} />
                Offline gespeichert
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
