// =========================================================================
// HeroReportCard — the floating signature product card in the hero (the
// GradBlueprint "Application Overview" treatment): white 20px card with
// layered shadow, stat sub-boxes and per-topic status chips. Depicts the
// pilot report deliverable and is labeled as an example rendering.
// Server-renderable, pure JSX — no iframe cost above the fold.
// =========================================================================

const STATS = [
  { label: "Aktiviert", value: "78 %" },
  { label: "Ø Quiz", value: "71 %" },
  { label: "Karten", value: "12.400" },
  { label: "Lerntage", value: "4,1/Wo" },
];

const TOPICS: { name: string; pct: number; chip: string; bar: string }[] = [
  { name: "Deskriptive Statistik", pct: 82, chip: "hs-chip-green", bar: "#16A34A" },
  { name: "Wahrscheinlichkeit", pct: 64, chip: "hs-chip-amber", bar: "#D97706" },
  { name: "Hypothesentests", pct: 51, chip: "hs-chip-orange", bar: "#EA580C" },
  { name: "Regression", pct: 43, chip: "hs-chip-red", bar: "#DC2626" },
];

export default function HeroReportCard() {
  return (
    <div
      className="hs-card p-5 md:p-6"
      role="img"
      aria-label="Beispieldarstellung der Pilot-Auswertung: Kennzahlen der Kohorte und Beherrschung nach Thema"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <p
          className="text-[15px] font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--hs-ink)" }}
        >
          Pilot-Auswertung
        </p>
        <span className="text-[11.5px] font-medium" style={{ color: "var(--hs-mute)" }}>
          Beispiel · WiSe
        </span>
      </div>

      {/* Stat sub-boxes */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border px-3 py-2.5"
            style={{ borderColor: "var(--hs-line)" }}
          >
            <p className="text-[10.5px]" style={{ color: "var(--hs-mute)" }}>
              {s.label}
            </p>
            <p
              className="text-[17px] font-bold leading-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--hs-ink)" }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Topic mastery with status chips */}
      <div className="mt-4">
        <p
          className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: "var(--hs-mute)" }}
        >
          Beherrschung nach Thema
        </p>
        <div className="flex flex-col gap-2.5">
          {TOPICS.map((t) => (
            <div key={t.name} className="flex items-center gap-2.5">
              <span
                className="w-[42%] truncate text-[12px]"
                style={{ color: "var(--hs-ink)" }}
              >
                {t.name}
              </span>
              <span
                className="h-1.5 flex-1 overflow-hidden rounded-full"
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

      <p className="mt-4 text-[10px]" style={{ color: "var(--hs-mute)" }}>
        Aggregiert &amp; anonymisiert, Beispieldarstellung.
      </p>
    </div>
  );
}
