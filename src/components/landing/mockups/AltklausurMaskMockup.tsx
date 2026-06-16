"use client";

import { FileText, Target } from "lucide-react";
import MockupShell from "./MockupShell";

/**
 * Static copy of NewExamForm's "Altklausur" setup mask (Path A). The real form
 * is interactive (dropzone, useRouter, server actions, auth) so it can't render
 * statically - this is a faithful, inert visual replica with hardcoded state:
 * Path A selected + one Altklausur attached + fidelity "likely".
 */
const PRIMARY = "var(--color-primary-bright)";
const TEAL = "var(--color-cat-teal)";

const FIDELITY = [
  { label: "Nah an meiner Altklausur", sub: "Eng am Profil & den Hinweisen.", sel: false },
  { label: "Was wahrscheinlich drankommt", sub: "Profil + angrenzende Themen. Sicherer Mittelweg.", sel: true },
  { label: "Sicher ist sicher - breiter", sub: "Breite Abdeckung, Profil als leichte Priorisierung.", sel: false },
];

export default function AltklausurMaskMockup() {
  return (
    <MockupShell glow="#2B3499" glowStrong glowX="50%" glowY="48%" tilt="r">
      <div
        className="text-[11px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        Wie lernst du für diese Klausur?
      </div>

      {/* Path A - selected, "Beste Ergebnisse" */}
      <div className="mt-2.5 space-y-2">
        <div
          className="rounded-xl border px-3 py-2.5"
          style={{ background: "rgba(110,128,242,0.10)", borderColor: PRIMARY }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-white">
                Ich hab eine Altklausur oder weiß, was drankommt
              </div>
              <div className="mt-0.5 text-[11.5px] leading-snug" style={{ color: "rgba(255,255,255,0.6)" }}>
                Lade die Altklausur hoch, gib Prof-Hinweise, der Lens macht den Rest.
              </div>
            </div>
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
              style={{ background: "rgba(79,209,165,0.14)", color: TEAL, border: "1px solid rgba(79,209,165,0.35)" }}
            >
              <Target size={10} strokeWidth={2.2} aria-hidden />
              Beste Ergebnisse
            </span>
          </div>
        </div>
        <div
          className="rounded-xl border px-3 py-2.5"
          style={{ background: "#171C30", borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="text-[13.5px] font-semibold text-white/85">Ich will einfach den Stoff verstehen</div>
        </div>
      </div>

      {/* Attached Altklausur */}
      <div className="mt-3.5">
        <div
          className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Altklausur
        </div>
        <div
          className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5"
          style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "rgba(79,209,165,0.16)" }}
          >
            <FileText size={14} style={{ color: TEAL }} />
          </span>
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-white/85">
            Klausur_WS24.pdf · 412 KB
          </span>
        </div>
      </div>

      {/* Fidelity */}
      <div className="mt-3.5">
        <div
          className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Wie eng am Altklausur-Stoff?
        </div>
        <div className="space-y-1.5">
          {FIDELITY.map((o) => (
            <div
              key={o.label}
              className="rounded-lg border px-3 py-2"
              style={{
                background: o.sel ? "rgba(110,128,242,0.10)" : "#171C30",
                borderColor: o.sel ? PRIMARY : "rgba(255,255,255,0.06)",
              }}
            >
              <div className="text-[13px] font-semibold text-white">{o.label}</div>
              <div className="text-[11.5px] leading-snug" style={{ color: "rgba(255,255,255,0.55)" }}>
                {o.sub}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] italic" style={{ color: "rgba(255,255,255,0.45)" }}>
          Schwerpunkt, keine Garantie: wir können nicht wissen, was genau drankommt.
        </p>
      </div>
    </MockupShell>
  );
}
