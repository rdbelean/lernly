import {
  FileSignature,
  Upload,
  CheckCircle,
  Smartphone,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

// =========================================================================
// PvPilotTimeline — the begleiteter Pilot for a Heilpraktikerschule as a
// journey visual, tied to the fixed exam date (März / Oktober) instead of a
// generic 8-week window. Same gradient-track treatment as the /hochschulen
// PilotTimeline; only the phase content is ICP-specific.
// =========================================================================

const PHASES: {
  week: string;
  title: string;
  text: string;
  icon: LucideIcon;
  accent?: "result";
}[] = [
  {
    week: "Start",
    title: "Kickoff & AVV",
    text: "Kurzes Gespräch: Kurs, Laufzeit bis zum nächsten Prüfungstermin und Erfolgskriterien festlegen. Pilotvertrag und AVV liefern wir.",
    icon: FileSignature,
  },
  {
    week: "Woche 1",
    title: "Upload & Generierung",
    text: "Ihre Dozenten laden das Kursmaterial hoch. Daraus entsteht ein MC-Trainer im exakten Prüfungsformat, dazu Karteikarten.",
    icon: Upload,
  },
  {
    week: "Woche 1–2",
    title: "Dozenten-Freigabe",
    text: "Ihre Dozenten prüfen die Fragen fachlich und geben sie frei. Erst danach erhält der Kurs Zugang.",
    icon: CheckCircle,
  },
  {
    week: "Bis zum Termin",
    title: "Der Kurs übt",
    text: "Zugang per Link, mobil im Browser: Übungsklausuren im Prüfungsformat, Karteikarten und Wiederholung nach Spaced-Repetition.",
    icon: Smartphone,
  },
  {
    week: "Nach der Prüfung",
    title: "Auswertung & Report",
    text: "Gemeinsamer Termin: aggregierte Auswertung gegen die definierten Erfolgskriterien, Abschlussreport für Ihre Schule.",
    icon: BarChart3,
    accent: "result",
  },
];

const TRACK_GRADIENT = "linear-gradient(90deg, #1421C5, #3D5CF5)";
const TRACK_GRADIENT_V = "linear-gradient(180deg, #1421C5, #3D5CF5)";

/** Numbered milestone node sitting on the track. */
function Node({ index, accent }: { index: number; accent?: "result" }) {
  return (
    <span
      className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
      style={{
        background: accent === "result" ? "#16A34A" : TRACK_GRADIENT,
        padding: 2.5,
        boxShadow: "0 6px 16px -6px rgba(20, 33, 197, 0.45)",
      }}
    >
      <span
        className="flex h-full w-full items-center justify-center rounded-full bg-white text-[15px] font-bold"
        style={{
          fontFamily: "var(--font-display)",
          color: accent === "result" ? "#15803D" : "var(--hs-accent)",
        }}
      >
        {index + 1}
      </span>
    </span>
  );
}

/** Phase card below (desktop) / beside (mobile) the node. */
function PhaseCard({ phase }: { phase: (typeof PHASES)[number] }) {
  return (
    <div className="hs-card flex h-full flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "rgba(20,33,197,0.08)" }}
        >
          <phase.icon
            size={17}
            strokeWidth={2}
            aria-hidden
            style={{ color: "var(--hs-accent)" }}
          />
        </span>
        <span
          className={`hs-chip ${phase.accent === "result" ? "hs-chip-green" : "hs-chip-blue"}`}
        >
          {phase.week}
        </span>
      </div>
      <h3
        className="mt-3 text-[16px] font-bold leading-snug"
        style={{
          fontFamily: "var(--font-display)",
          letterSpacing: "-0.01em",
          color: "var(--hs-ink)",
        }}
      >
        {phase.title}
      </h3>
      <p className="mt-1.5 text-[13px] leading-[1.6]" style={{ color: "var(--hs-mute)" }}>
        {phase.text}
      </p>
    </div>
  );
}

export default function PvPilotTimeline() {
  return (
    <div className="mx-auto max-w-[1160px]">
      {/* ===== Desktop: horizontal gradient track, staggered cards ===== */}
      <div className="relative hidden lg:block">
        <div
          aria-hidden
          className="absolute left-[10%] right-[10%] top-[22px] h-[3px] rounded-full"
          style={{
            background: TRACK_GRADIENT,
            boxShadow: "0 0 14px rgba(61, 92, 245, 0.35)",
          }}
        />
        <ol className="ln-stagger grid grid-cols-5 gap-4">
          {PHASES.map((p, i) => (
            <li key={p.title} className="hs-reveal flex flex-col items-center">
              <Node index={i} accent={p.accent} />
              <span
                aria-hidden
                className="h-5 w-px"
                style={{ background: "var(--hs-line)" }}
              />
              <div className={i % 2 === 1 ? "w-full pt-6" : "w-full"}>
                <PhaseCard phase={p} />
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* ===== Mobile/tablet: vertical gradient rail ===== */}
      <ol className="ln-stagger relative flex flex-col gap-5 lg:hidden">
        <span
          aria-hidden
          className="absolute bottom-6 left-[21px] top-6 w-[3px] rounded-full"
          style={{
            background: TRACK_GRADIENT_V,
            boxShadow: "0 0 12px rgba(61, 92, 245, 0.3)",
          }}
        />
        {PHASES.map((p, i) => (
          <li key={p.title} className="hs-reveal flex items-start gap-4">
            <Node index={i} accent={p.accent} />
            <div className="min-w-0 flex-1">
              <PhaseCard phase={p} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
