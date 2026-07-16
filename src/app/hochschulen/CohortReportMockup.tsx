// =========================================================================
// CohortReportMockup — the pilot report as a light "floating product card"
// (white, 20px radius, hairline, layered shadow, soft-tinted status chips —
// the GradBlueprint signature treatment for report/analytics views).
// IMPORTANT: this depicts the AGGREGATED PILOT REPORT deliverable, not a
// live product feature. It is explicitly labeled "Beispieldarstellung"
// so no fake feature is implied. Pure JSX — server-renderable.
// =========================================================================

const STATS: { value: string; label: string; chip: string }[] = [
  { value: "78 %", label: "Aktivierte Studierende", chip: "hs-chip-blue" },
  { value: "12.400", label: "Gelernte Karten", chip: "hs-chip-green" },
  { value: "71 %", label: "Ø Quiz-Ergebnis", chip: "hs-chip-amber" },
  { value: "4,1", label: "Lerntage / Woche", chip: "hs-chip-blue" },
];

// Per-topic mastery — the "where the cohort struggles" view. Status colors
// follow the functional chip system (green/amber/orange/red).
const TOPICS = [
  { name: "Deskriptive Statistik", pct: 82, chip: "hs-chip-green", bar: "#16A34A" },
  { name: "Wahrscheinlichkeit", pct: 64, chip: "hs-chip-amber", bar: "#D97706" },
  { name: "Hypothesentests", pct: 51, chip: "hs-chip-orange", bar: "#EA580C" },
  { name: "Regression", pct: 43, chip: "hs-chip-red", bar: "#DC2626" },
];

// Weekly engagement across the 8 pilot weeks (relative heights).
const WEEKS = [22, 45, 58, 52, 66, 74, 88, 70];

export default function CohortReportMockup() {
  return (
    <div>
      <div
        className="hs-card p-5 md:p-6"
        role="img"
        aria-label="Beispieldarstellung des Pilot-Abschlussreports mit Kennzahlen der Kohorte"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--hs-mute)" }}
            >
              Pilot-Auswertung
            </p>
            <p
              className="truncate text-[15px] font-semibold"
              style={{ fontFamily: "var(--font-display)", color: "var(--hs-ink)" }}
            >
              Statistik I · WiSe · 80 Studierende
            </p>
          </div>
          <span className="hs-chip-amber shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.1em]">
            Beispieldarstellung
          </span>
        </div>

        {/* Stat tiles with soft-tinted value chips */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border p-2.5"
              style={{ borderColor: "var(--hs-line)" }}
            >
              <span
                className={`hs-chip ${s.chip} text-[13px] font-bold`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {s.value}
              </span>
              <p className="mt-1.5 text-[10px] leading-tight" style={{ color: "var(--hs-mute)" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Topic mastery bars */}
        <div className="mt-3 rounded-2xl border p-3.5" style={{ borderColor: "var(--hs-line)" }}>
          <p
            className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "var(--hs-mute)" }}
          >
            Beherrschung nach Thema
          </p>
          <div className="flex flex-col gap-2">
            {TOPICS.map((t) => (
              <div key={t.name} className="flex items-center gap-2">
                <span
                  className="w-[38%] truncate text-[10.5px]"
                  style={{ color: "var(--hs-ink)" }}
                >
                  {t.name}
                </span>
                <span
                  className="h-2 flex-1 overflow-hidden rounded-full"
                  style={{ background: "var(--hs-soft)" }}
                >
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${t.pct}%`, background: t.bar, opacity: 0.8 }}
                  />
                </span>
                <span className={`hs-chip ${t.chip}`}>{t.pct} %</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly activity */}
        <div className="mt-3 rounded-2xl border p-3.5" style={{ borderColor: "var(--hs-line)" }}>
          <p
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "var(--hs-mute)" }}
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
                      ? "var(--hs-accent)"
                      : "rgba(20,33,197,0.18)",
                }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[9px]" style={{ color: "var(--hs-mute)" }}>
            <span>W1</span>
            <span>W8</span>
          </div>
        </div>

        <p className="mt-3 text-[9.5px]" style={{ color: "var(--hs-mute)" }}>
          Aggregiert und anonymisiert, keine Auswertung einzelner Studierender.
        </p>
      </div>
      <p
        className="mt-4 text-center text-[12px]"
        style={{ color: "var(--hs-mute)" }}
      >
        Beispieldarstellung: So ist der Abschlussreport Ihres Piloten aufgebaut.
      </p>
    </div>
  );
}
