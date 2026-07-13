"use client";

import MockupShell from "@/components/landing/mockups/MockupShell";

// =========================================================================
// CohortReportMockup — stylized pilot-report dashboard for /hochschulen.
// IMPORTANT: this depicts the AGGREGATED PILOT REPORT deliverable, not a
// live product feature. It is explicitly labeled "Beispieldarstellung"
// (per founder decision) so no fake feature is implied. Pure JSX + tokens,
// modeled after the admin chart idiom (HTML bars, stat tiles).
// =========================================================================

const STATS = [
  { label: "Aktivierte Studierende", value: "78 %", sub: "62 von 80" },
  { label: "Gelernte Karten", value: "12.400", sub: "gesamt" },
  { label: "Ø Quiz-Ergebnis", value: "71 %", sub: "letzte Woche" },
  { label: "Aktive Lerntage", value: "4,1", sub: "pro Woche" },
];

// Per-topic mastery — the "where the cohort struggles" view that maps to
// QM/accreditation needs.
const TOPICS = [
  { name: "Deskriptive Statistik", pct: 82, color: "var(--color-cat-teal)" },
  { name: "Wahrscheinlichkeit", pct: 64, color: "var(--color-primary-bright)" },
  { name: "Hypothesentests", pct: 51, color: "var(--color-amber)" },
  { name: "Regression", pct: 43, color: "var(--color-amber)" },
];

// Weekly engagement across the 8 pilot weeks (relative heights).
const WEEKS = [22, 45, 58, 52, 66, 74, 88, 70];

export default function CohortReportMockup() {
  return (
    <div>
      <MockupShell glow="#5bb8d8" tilt="r">
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                Pilot-Auswertung
              </p>
              <p
                className="truncate text-[14px] font-semibold text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Statistik I · WiSe · 80 Studierende
              </p>
            </div>
            <span
              className="shrink-0 rounded-full border px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.1em]"
              style={{
                borderColor: "rgba(242,163,60,0.4)",
                background: "rgba(242,163,60,0.1)",
                color: "var(--color-amber)",
              }}
            >
              Beispieldarstellung
            </span>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-lg border p-2.5"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <p
                  className="text-[17px] font-bold leading-none text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {s.value}
                </p>
                <p className="mt-1 text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {s.label}
                </p>
                <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {s.sub}
                </p>
              </div>
            ))}
          </div>

          {/* Topic mastery bars */}
          <div
            className="rounded-lg border p-3"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <p
              className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Beherrschung nach Thema
            </p>
            <div className="flex flex-col gap-2">
              {TOPICS.map((t) => (
                <div key={t.name} className="flex items-center gap-2">
                  <span
                    className="w-[38%] truncate text-[10.5px]"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    {t.name}
                  </span>
                  <span
                    className="h-2 flex-1 overflow-hidden rounded-full"
                    style={{ background: "rgba(255,255,255,0.07)" }}
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${t.pct}%`, background: t.color }}
                    />
                  </span>
                  <span
                    className="w-8 text-right text-[10.5px] font-semibold"
                    style={{ color: "rgba(255,255,255,0.75)" }}
                  >
                    {t.pct} %
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly activity */}
          <div
            className="rounded-lg border p-3"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <p
              className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Aktivität je Pilotwoche
            </p>
            <div className="flex h-12 items-end gap-1.5">
              {WEEKS.map((h, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-t"
                  style={{
                    height: `${h}%`,
                    background:
                      i === WEEKS.length - 2
                        ? "var(--color-ln-cyan)"
                        : "rgba(91,184,216,0.35)",
                  }}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>
              <span>W1</span>
              <span>W8</span>
            </div>
          </div>

          <p className="text-[9.5px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            Aggregiert und anonymisiert — keine Auswertung einzelner Studierender.
          </p>
        </div>
      </MockupShell>
      <p
        className="mt-4 text-center text-[12px]"
        style={{ color: "var(--hs-mute)" }}
      >
        Beispieldarstellung — so ist der Abschlussreport Ihres Piloten aufgebaut.
      </p>
    </div>
  );
}
