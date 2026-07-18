import {
  UploadCloud,
  FileText,
  RotateCcw,
  RefreshCw,
  Minus,
  Check,
} from "lucide-react";

// =========================================================================
// Light product cards for /pruefungsvorbereitung (ICP: private
// Heilpraktikerschulen). Same "Academic Editorial" treatment as the
// /hochschulen HsProductCards (white cards, hairlines, ink text, functional
// status chips) so the two B2B routes read as one system. Only the CONTENT
// is ICP-specific: the amtsärztliche Überprüfung (60 MC-Fragen, 5 Optionen,
// Mehrfachauswahl, Schwelle 45 von 60) and Heilpraktiker-Themen.
// Pure JSX, server-renderable. The dark B2C mockups stay untouched.
// =========================================================================

// The verified exam format, shown once as the signature hero card: an MC
// question in the EXACT format of the written exam (5 options, multiple
// answers, 45-of-60 threshold). This is the core proof of the page.
const HERO_OPTIONS: { label: string; checked: boolean }[] = [
  { label: "Masern", checked: true },
  { label: "Tuberkulose", checked: true },
  { label: "Grippaler Infekt", checked: false },
  { label: "Keuchhusten (Pertussis)", checked: false },
  { label: "Migräne", checked: false },
];

/** Hero: one MC question in the exact written-exam format. */
export function PvHeroExamCard() {
  return (
    <div
      className="hs-card p-5 md:p-6"
      role="img"
      aria-label="Lernly-Oberfläche: Übungsfrage im exakten Prüfungsformat der amtsärztlichen Überprüfung, 5 Antwortoptionen mit Mehrfachauswahl"
    >
      {/* Header: progress + exam-format chip */}
      <div className="flex items-center justify-between gap-2">
        <p
          className="text-[15px] font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--hs-ink)" }}
        >
          Übungsklausur
          <span className="ml-2 text-[12px] font-medium" style={{ color: "var(--hs-mute)" }}>
            Frage 12 / 60
          </span>
        </p>
        <span className="hs-chip hs-chip-blue">Prüfungsformat</span>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full"
        style={{ background: "var(--hs-soft)" }}
      >
        <span
          className="block h-full rounded-full"
          style={{ width: "20%", background: "var(--hs-accent)" }}
        />
      </div>

      {/* Question */}
      <p
        className="mt-4 text-[15.5px] font-semibold leading-snug"
        style={{ fontFamily: "var(--font-display)", color: "var(--hs-ink)" }}
      >
        Welche der folgenden Erkrankungen sind nach dem
        Infektionsschutzgesetz namentlich meldepflichtig?
      </p>

      {/* 5 options, checkbox style (multiple answers possible) */}
      <div className="mt-3 flex flex-col gap-2">
        {HERO_OPTIONS.map((o) => (
          <div
            key={o.label}
            className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5"
            style={
              o.checked
                ? {
                    borderColor: "var(--hs-accent)",
                    background: "rgba(20,33,197,0.06)",
                  }
                : { borderColor: "var(--hs-line)" }
            }
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border"
              style={
                o.checked
                  ? { background: "var(--hs-accent)", borderColor: "var(--hs-accent)" }
                  : { borderColor: "var(--hs-line)" }
              }
            >
              {o.checked && <Check size={13} strokeWidth={3} aria-hidden style={{ color: "#fff" }} />}
            </span>
            <span
              className="text-[13.5px]"
              style={{ color: o.checked ? "var(--hs-ink)" : "var(--hs-mute)" }}
            >
              {o.label}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11.5px] leading-relaxed" style={{ color: "var(--hs-mute)" }}>
        5 Antwortoptionen, Mehrfachauswahl möglich. 45 von 60 richtig zum
        Bestehen. Genau wie in der Überprüfung.
      </p>
    </div>
  );
}

/** "Material hochladen" — upload mask with files and format picker. */
export function PvUploadCard() {
  return (
    <div className="hs-card p-5 md:p-6">
      <p
        className="text-[15px] font-semibold"
        style={{ fontFamily: "var(--font-display)", color: "var(--hs-ink)" }}
      >
        Kursmaterial hochladen
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
          Skripte, Folien oder Notizen hier rein
        </p>
        <p className="text-[11.5px]" style={{ color: "var(--hs-mute)" }}>
          bis zu 8 Dateien · PDF, TXT, MD
        </p>
      </div>

      {/* Attached files */}
      {[
        ["Skript_Infektionslehre.pdf", "3,8 MB"],
        ["Anatomie_Herz-Kreislauf.pdf", "2,1 MB"],
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
      <p className="mt-2 text-[11px]" style={{ color: "var(--hs-mute)" }}>
        60 Fragen, 5 Optionen, Mehrfachauswahl. Wie in der Überprüfung.
      </p>
    </div>
  );
}

const RESULT_TOPICS: { name: string; pct: number; chip: string; bar: string }[] = [
  { name: "Infektionslehre", pct: 90, chip: "hs-chip-green", bar: "#16A34A" },
  { name: "Anatomie & Physiologie", pct: 82, chip: "hs-chip-green", bar: "#16A34A" },
  { name: "Notfälle & Erste Hilfe", pct: 66, chip: "hs-chip-amber", bar: "#D97706" },
  { name: "Gesetzeskunde", pct: 52, chip: "hs-chip-orange", bar: "#EA580C" },
];

/** Exam-result view — score against the 45-of-60 threshold. */
export function PvMcResultCard() {
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
          48 / 60
        </p>
        <p className="pb-1 text-[12.5px]" style={{ color: "var(--hs-mute)" }}>
          Schwelle: 45 richtig
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
          {RESULT_TOPICS.map((t) => (
            <div key={t.name} className="flex items-center gap-2.5">
              <span className="w-[46%] truncate text-[12px]" style={{ color: "var(--hs-ink)" }}>
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
        Jede Antwortoption mit Erklärung. Anwärter sehen, was vor dem Termin
        noch wiederholt werden muss.
      </p>
    </div>
  );
}

/** Flashcard view — question side with the three-step self-rating. */
export function PvFlashcardCard() {
  return (
    <div className="hs-card p-5 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <p
          className="text-[15px] font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--hs-ink)" }}
        >
          Karteikarten
          <span className="ml-2 text-[12px] font-medium" style={{ color: "var(--hs-mute)" }}>
            1 / 3
          </span>
        </p>
        <span className="hs-chip hs-chip-blue">Anatomie</span>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full"
        style={{ background: "var(--hs-soft)" }}
      >
        <span
          className="block h-full rounded-full"
          style={{ width: "33%", background: "var(--hs-accent)" }}
        />
      </div>

      {/* Question face */}
      <div
        className="mt-4 flex flex-col items-center justify-center rounded-2xl border px-5 py-10 text-center"
        style={{ borderColor: "var(--hs-line)", background: "var(--hs-soft)" }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--hs-mute)" }}
        >
          Frage
        </p>
        <p
          className="mt-2 max-w-[320px] text-[17px] font-semibold leading-snug"
          style={{ fontFamily: "var(--font-display)", color: "var(--hs-ink)" }}
        >
          Welche Herzklappen trennen die Vorhöfe von den Kammern?
        </p>
        <p
          className="mt-6 inline-flex items-center gap-1.5 text-[11.5px]"
          style={{ color: "var(--hs-mute)" }}
        >
          <RefreshCw size={12} strokeWidth={2} aria-hidden />
          Klicken zum Umdrehen
        </p>
      </div>

      {/* Self-rating actions in status colors */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { label: "Nochmal", icon: RotateCcw, chip: "hs-chip-red" },
          { label: "Fast", icon: Minus, chip: "hs-chip-amber" },
          { label: "Sitzt", icon: Check, chip: "hs-chip-green" },
        ].map((a) => (
          <span
            key={a.label}
            className={`${a.chip} flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[12px] font-semibold`}
          >
            <a.icon size={15} strokeWidth={2.2} aria-hidden />
            {a.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---- Kohorten-Report (aggregated, anonymized) --------------------------

const COHORT_STATS: { value: string; label: string; chip: string }[] = [
  { value: "82 %", label: "Aktive Anwärter", chip: "hs-chip-blue" },
  { value: "68 %", label: "Über der Schwelle (45)", chip: "hs-chip-green" },
  { value: "71 %", label: "Ø Übungsklausur", chip: "hs-chip-amber" },
  { value: "4,3", label: "Lerntage / Woche", chip: "hs-chip-blue" },
];

const COHORT_TOPICS = [
  { name: "Infektionslehre", pct: 84, chip: "hs-chip-green", bar: "#16A34A" },
  { name: "Anatomie & Physiologie", pct: 72, chip: "hs-chip-amber", bar: "#D97706" },
  { name: "Notfälle & Erste Hilfe", pct: 58, chip: "hs-chip-orange", bar: "#EA580C" },
  { name: "Gesetzeskunde", pct: 46, chip: "hs-chip-red", bar: "#DC2626" },
];

// Weekly engagement across the run to the exam date (relative heights).
const COHORT_WEEKS = [24, 40, 55, 50, 63, 72, 85, 78];

/** The pilot report as a light floating product card. Explicitly labeled a
    "Beispieldarstellung" so no fake feature or result is implied. */
export function PvCohortReport() {
  return (
    <div>
      <div
        className="hs-card p-5 md:p-6"
        role="img"
        aria-label="Beispieldarstellung der Kurs-Auswertung mit Kennzahlen und Themen-Beherrschung des Kurses"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--hs-mute)" }}
            >
              Kurs-Auswertung
            </p>
            <p
              className="truncate text-[15px] font-semibold"
              style={{ fontFamily: "var(--font-display)", color: "var(--hs-ink)" }}
            >
              Vorbereitungskurs · Termin Oktober · 24 Anwärter
            </p>
          </div>
          <span className="hs-chip-amber shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.1em]">
            Beispieldarstellung
          </span>
        </div>

        {/* Stat tiles */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COHORT_STATS.map((s) => (
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
            {COHORT_TOPICS.map((t) => (
              <div key={t.name} className="flex items-center gap-2">
                <span
                  className="w-[44%] truncate text-[10.5px]"
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
            Aktivität je Woche bis zum Termin
          </p>
          <div className="flex h-12 items-end gap-1.5">
            {COHORT_WEEKS.map((h, i) => (
              <span
                key={i}
                className="flex-1 rounded-t"
                style={{
                  height: `${h}%`,
                  background:
                    i === COHORT_WEEKS.length - 2
                      ? "var(--hs-accent)"
                      : "rgba(20,33,197,0.18)",
                }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[9px]" style={{ color: "var(--hs-mute)" }}>
            <span>Start</span>
            <span>Termin</span>
          </div>
        </div>

        <p className="mt-3 text-[9.5px]" style={{ color: "var(--hs-mute)" }}>
          Aggregiert und anonymisiert, keine Auswertung einzelner Anwärter.
        </p>
      </div>
      <p
        className="mt-4 text-center text-[12px]"
        style={{ color: "var(--hs-mute)" }}
      >
        Beispieldarstellung: So sehen Sie den Fortschritt Ihres Kurses.
      </p>
    </div>
  );
}
