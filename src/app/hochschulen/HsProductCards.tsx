import { UploadCloud, FileText } from "lucide-react";

// =========================================================================
// Light product cards for /hochschulen (GradBlueprint treatment: white
// cards, hairlines, ink text, functional status chips). These are
// route-local LIGHT recreations of the product surfaces — the shared dark
// mockups in src/components/landing/mockups/ stay untouched for the B2C
// landing. Content mirrors the real product views.
// =========================================================================

/** "Material hochladen" — upload mask with files and format picker. */
export function HsUploadCard() {
  return (
    <div className="hs-card p-5 md:p-6">
      <p
        className="text-[15px] font-semibold"
        style={{ fontFamily: "var(--font-display)", color: "var(--hs-ink)" }}
      >
        Material hochladen
      </p>

      {/* Dropzone */}
      <div
        className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-7 text-center"
        style={{ borderColor: "var(--hs-line)", background: "var(--hs-soft)" }}
      >
        <span
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ background: "rgba(20,33,197,0.08)" }}
        >
          <UploadCloud size={20} strokeWidth={2} aria-hidden style={{ color: "var(--hs-accent)" }} />
        </span>
        <p className="text-[13.5px] font-medium" style={{ color: "var(--hs-ink)" }}>
          PDFs, Folien oder Notizen hier rein
        </p>
        <p className="text-[11.5px]" style={{ color: "var(--hs-mute)" }}>
          bis zu 8 Dateien · PDF, TXT, MD
        </p>
      </div>

      {/* Attached files */}
      {[
        ["Vorlesung_BWL.pdf", "4,2 MB"],
        ["Mitschrift_Woche3.pdf", "1,1 MB"],
      ].map(([name, size]) => (
        <div
          key={name}
          className="mt-2 flex items-center justify-between rounded-xl border px-3.5 py-2.5"
          style={{ borderColor: "var(--hs-line)" }}
        >
          <span className="flex items-center gap-2 text-[13px]" style={{ color: "var(--hs-ink)" }}>
            <FileText size={14} strokeWidth={2} aria-hidden style={{ color: "var(--hs-mute)" }} />
            {name}
          </span>
          <span className="text-[11.5px]" style={{ color: "var(--hs-mute)" }}>
            {size}
          </span>
        </div>
      ))}

      {/* Format picker */}
      <p
        className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--hs-mute)" }}
      >
        Prüfungsformat
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <span
          className="rounded-xl border px-3 py-2 text-center text-[13px] font-semibold"
          style={{
            borderColor: "var(--hs-accent)",
            background: "rgba(20,33,197,0.06)",
            color: "var(--hs-accent)",
          }}
        >
          Multiple Choice
        </span>
        <span
          className="rounded-xl border px-3 py-2 text-center text-[13px] font-medium"
          style={{ borderColor: "var(--hs-line)", color: "var(--hs-mute)" }}
        >
          Offene Fragen
        </span>
      </div>
    </div>
  );
}

const QUIZ_TOPICS: { name: string; pct: number; chip: string; bar: string }[] = [
  { name: "Strategie-Frameworks", pct: 92, chip: "hs-chip-green", bar: "#16A34A" },
  { name: "Wertschöpfungskette", pct: 81, chip: "hs-chip-green", bar: "#16A34A" },
  { name: "Marktdynamik", pct: 68, chip: "hs-chip-amber", bar: "#D97706" },
  { name: "Kernkompetenzen", pct: 54, chip: "hs-chip-orange", bar: "#EA580C" },
];

/** Exam-result view — 88 % score with per-topic status chips. */
export function HsQuizResultCard() {
  return (
    <div className="hs-card p-5 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <p
          className="text-[15px] font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--hs-ink)" }}
        >
          Übungsklausur · Ergebnis
        </p>
        <span className="hs-chip hs-chip-green">Bestanden</span>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <p
          className="text-[44px] font-bold leading-none"
          style={{ fontFamily: "var(--font-display)", color: "var(--hs-ink)" }}
        >
          88 %
        </p>
        <p className="pb-1 text-[12.5px]" style={{ color: "var(--hs-mute)" }}>
          22 von 25 Punkten
        </p>
      </div>

      <div className="mt-5">
        <p
          className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: "var(--hs-mute)" }}
        >
          Ergebnis nach Thema
        </p>
        <div className="flex flex-col gap-2.5">
          {QUIZ_TOPICS.map((t) => (
            <div key={t.name} className="flex items-center gap-2.5">
              <span className="w-[42%] truncate text-[12px]" style={{ color: "var(--hs-ink)" }}>
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

      <p className="mt-4 text-[11.5px] leading-relaxed" style={{ color: "var(--hs-mute)" }}>
        Jede Antwortoption mit Erklärung — Studierende sehen, was sie als
        Nächstes wiederholen sollten.
      </p>
    </div>
  );
}

/** English concept card — multilingual proof (light treatment). */
export function HsTopicConceptCard() {
  return (
    <div className="hs-card p-5 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--hs-mute)" }}
        >
          Topic · Competitive Strategy
        </p>
        <span className="hs-chip hs-chip-green">High relevance</span>
      </div>

      <p
        className="mt-3 text-[19px] font-bold"
        style={{ fontFamily: "var(--font-display)", color: "var(--hs-ink)" }}
      >
        Porter&rsquo;s Five Forces
      </p>
      <p className="text-[11.5px]" style={{ color: "var(--hs-mute)" }}>
        Michael E. Porter, 1979
      </p>

      <p className="mt-3 text-[13.5px] leading-[1.65]" style={{ color: "var(--hs-mute)" }}>
        A framework for analysing the competitive intensity of an industry:
        supplier power, buyer power, threat of new entrants, threat of
        substitutes, and rivalry among existing competitors.
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className="hs-chip hs-chip-blue">Exam focus</span>
        <span className="hs-chip hs-chip-amber">Often confused with SWOT</span>
      </div>
    </div>
  );
}
