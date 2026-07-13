import { FileSignature, Upload, CheckCircle, Smartphone, BarChart3, type LucideIcon } from "lucide-react";

// Pilot timeline (week 0-8). Server-renderable, pure JSX. Vertical rail on
// mobile, five columns on desktop.

const PHASES: { week: string; title: string; text: string; icon: LucideIcon }[] = [
  {
    week: "Woche 0",
    title: "Kickoff & AVV",
    text: "30-Minuten-Gespräch: Modul, Zeitraum und Erfolgskriterien festlegen. Pilotvertrag und AVV liefern wir.",
    icon: FileSignature,
  },
  {
    week: "Woche 1",
    title: "Upload & Generierung",
    text: "Lehrende laden die offiziellen Modulunterlagen hoch — optional mit Altklausur zur Gewichtung.",
    icon: Upload,
  },
  {
    week: "Woche 1–2",
    title: "Freigabe",
    text: "Lehrende prüfen das generierte Lernpaket und geben es frei. Korrekturen arbeiten wir ein.",
    icon: CheckCircle,
  },
  {
    week: "Woche 2–7",
    title: "Die Kohorte lernt",
    text: "Zugang per Link, mobil im Browser — Karteikarten, Quiz und Wiederholung nach Spaced-Repetition.",
    icon: Smartphone,
  },
  {
    week: "Woche 8",
    title: "Auswertung & Report",
    text: "Gemeinsamer Termin: aggregierte Auswertung gegen die definierten Erfolgskriterien, Abschlussreport.",
    icon: BarChart3,
  },
];

export default function PilotTimeline() {
  return (
    <ol className="ln-stagger mx-auto grid max-w-[1200px] grid-cols-1 gap-4 lg:grid-cols-5">
      {PHASES.map((p, i) => (
        <li key={p.title} className="ln-reveal relative flex gap-4 lg:block">
          {/* Vertical connector (mobile) */}
          {i < PHASES.length - 1 && (
            <span
              aria-hidden
              className="absolute left-[21px] top-12 h-[calc(100%-24px)] w-px lg:hidden"
              style={{ background: "rgba(255,255,255,0.1)" }}
            />
          )}
          <span
            className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl lg:mb-4"
            style={{ background: "rgba(91,184,216,0.12)" }}
          >
            <p.icon size={19} strokeWidth={2} aria-hidden style={{ color: "var(--color-ln-cyan)" }} />
          </span>
          <div className="pb-6 lg:pb-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {p.week}
            </p>
            <h3
              className="mt-1 text-[16px] font-semibold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {p.title}
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-[1.6]" style={{ color: "rgba(255,255,255,0.6)" }}>
              {p.text}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
