"use client";

import { type ReactNode } from "react";
import {
  FileText,
  Layers,
  Sparkles,
  GraduationCap,
  Check,
  Wifi,
  Target,
  TrendingUp,
} from "lucide-react";

/**
 * Premium 4-card bento grid for the Lernly landing page.
 *
 * Visual anchor: the Flighty feature grid — dark theme, ambient glowing radial
 * gradients behind each card, translucent glassmorphism overlays and a clean,
 * Apple-esque type rhythm. 2x2 on desktop, single column on mobile.
 *
 * Each card maps a Flighty card aesthetic to a Lernly feature:
 *   1. Dark space        → PDF → flashcards in 2 minutes
 *   2. Sunset gradient   → Quiz simulator from real exams
 *   3. Neon orange glow  → Always with you, no app download
 *   4. Emerald data UI   → Your blueprint for the top grade
 */
export default function FeatureBento() {
  return (
    <section id="features" className="scroll-mt-24 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1180px]">
        {/* Heading */}
        <div className="mx-auto mb-14 max-w-[760px] text-center">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
            Was Lernly anders macht
          </p>
          <h2
            className="font-display font-bold leading-[1.05] tracking-[-1.6px] text-white text-balance"
            style={{ fontSize: "clamp(30px, 5vw, 56px)" }}
          >
            Dein Stoff. Einmal hochgeladen.
            <span className="block text-white/55">Sofort lernbereit.</span>
          </h2>
        </div>

        {/* 2x2 bento grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SpaceCard />
          <SunsetCard />
          <NeonCard />
          <EmeraldCard />
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * Shared card chrome
 * ------------------------------------------------------------------------- */

function BentoCard({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={
        "group relative flex min-h-[440px] flex-col overflow-hidden rounded-3xl border border-white/10 " +
        className
      }
      style={style}
    >
      {/* subtle top sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
        }}
      />
      {children}
    </div>
  );
}

function CardCopy({
  lead,
  rest,
}: {
  lead: string;
  rest: string;
}) {
  return (
    <p className="text-[15px] leading-relaxed text-white/60">
      <span className="font-semibold text-white">{lead}</span> {rest}
    </p>
  );
}

/* ----------------------------------------------------------------------------
 * 1 — Dark space / stars → PDF to flashcards
 * ------------------------------------------------------------------------- */

function SpaceCard() {
  return (
    <BentoCard
      style={{
        background:
          "radial-gradient(120% 90% at 80% 10%, rgba(110,128,242,0.35), transparent 55%), radial-gradient(90% 70% at 15% 90%, rgba(43,52,153,0.45), transparent 60%), #0A0D1C",
      }}
    >
      {/* starfield */}
      <Starfield />

      <div className="relative z-10 p-8 md:p-9">
        <h3
          className="font-display font-semibold leading-[1.12] tracking-[-0.5px] text-white text-balance"
          style={{ fontSize: "clamp(22px, 2.6vw, 28px)" }}
        >
          Aus PDF zu Karteikarten.
        </h3>
        <p
          className="font-display font-semibold leading-[1.12] tracking-[-0.5px] text-[#8E9AF5]"
          style={{ fontSize: "clamp(22px, 2.6vw, 28px)" }}
        >
          In 2 Minuten.
        </p>
      </div>

      {/* floating glass status card */}
      <div className="relative z-10 mt-auto flex items-end justify-center px-6 pb-10">
        <div
          className="relative w-full max-w-[320px] rounded-2xl border border-white/15 p-5 backdrop-blur-xl"
          style={{
            background: "rgba(20,25,48,0.55)",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px -20px rgba(0,0,0,0.8)",
          }}
        >
          {/* glowing ring accent */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-2xl"
            style={{
              boxShadow:
                "0 0 22px 1px rgba(110,128,242,0.45), inset 0 0 18px rgba(110,128,242,0.18)",
            }}
          />
          <div className="relative flex items-center gap-4">
            {/* PDF morphing into flashcard stack */}
            <div className="relative h-14 w-12 shrink-0">
              <div className="absolute inset-0 flex items-center justify-center rounded-lg border border-white/15 bg-white/5">
                <FileText className="h-5 w-5 text-white/70" />
              </div>
              <div
                className="absolute left-3 top-2 h-12 w-11 rounded-lg border border-[#6E80F2]/40"
                style={{ background: "rgba(110,128,242,0.18)" }}
              />
              <div
                className="absolute left-5 top-3 flex h-12 w-11 items-center justify-center rounded-lg border border-[#8E9AF5]/60"
                style={{
                  background:
                    "linear-gradient(160deg, rgba(110,128,242,0.45), rgba(43,52,153,0.6))",
                }}
              >
                <Layers className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-white">
                Vorlesung_BWL.pdf
              </p>
              <p className="mt-0.5 text-[12px] text-white/45">
                38 Karteikarten erstellt
              </p>
              {/* ready tag */}
              <span
                className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#bcc6ff]"
                style={{
                  background: "rgba(110,128,242,0.16)",
                  boxShadow: "0 0 16px rgba(110,128,242,0.5)",
                }}
              >
                <Sparkles className="h-3 w-3" />
                Ready to Study
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-8 pb-8 md:px-9">
        <CardCopy
          lead="Lade dein Skript hoch."
          rest="Lernly liest jede Folie und baut sofort abfragbare Karteikarten — ohne dass du eine einzige selbst tippst."
        />
      </div>
    </BentoCard>
  );
}

function Starfield() {
  const stars = [
    [12, 18], [28, 8], [44, 22], [62, 12], [78, 28], [88, 16],
    [18, 40], [36, 52], [54, 38], [72, 48], [90, 42],
    [8, 64], [24, 74], [40, 66], [58, 78], [76, 70], [92, 80],
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {stars.map(([x, y], i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: i % 3 === 0 ? 2 : 1,
            height: i % 3 === 0 ? 2 : 1,
            opacity: i % 3 === 0 ? 0.7 : 0.35,
          }}
        />
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * 2 — Sunset gradient → Quiz simulator from real exams
 * ------------------------------------------------------------------------- */

function SunsetCard() {
  return (
    <BentoCard
      style={{
        background:
          "radial-gradient(120% 100% at 50% 0%, #1a1430 0%, #2a1838 30%, #6e2b3f 62%, #d4663a 88%, #f2a33c 100%)",
      }}
    >
      <div className="relative z-10 p-8 md:p-9">
        <h3
          className="font-display font-semibold leading-[1.12] tracking-[-0.5px] text-white text-balance"
          style={{ fontSize: "clamp(22px, 2.6vw, 28px)" }}
        >
          Quiz-Simulator aus
          <span className="block">echten Klausuren.</span>
        </h3>
      </div>

      {/* graduation cap silhouette */}
      <div className="relative z-0 mt-auto flex items-end justify-center">
        <GraduationCap
          className="h-44 w-44 translate-y-6 text-[#1a1020]"
          strokeWidth={1.1}
          aria-hidden
        />
      </div>

      {/* floating MC question card */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-8">
        <div
          className="rounded-2xl border border-white/15 p-4 backdrop-blur-xl"
          style={{
            background: "rgba(26,16,32,0.6)",
            boxShadow: "0 24px 60px -20px rgba(0,0,0,0.7)",
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F2A33C]">
            Frage 4 / 20
          </p>
          <p className="mt-2 text-[13px] font-medium leading-snug text-white">
            Welcher Faktor zählt nicht zum Marketing-Mix?
          </p>
          <div className="mt-3 space-y-1.5">
            <McOption label="Product" />
            <McOption label="Price" />
            <McOption label="Personalkosten" correct />
            <McOption label="Promotion" />
          </div>
        </div>
      </div>

      <div className="sr-only">
        <CardCopy
          lead="Übe im Stil deiner echten Prüfung."
          rest="Lege deine Altklausur dazu — Lernly erzeugt Multiple-Choice-Fragen im exakten Format deiner Klausur."
        />
      </div>
    </BentoCard>
  );
}

function McOption({ label, correct }: { label: string; correct?: boolean }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px]"
      style={{
        borderColor: correct ? "rgba(79,209,165,0.5)" : "rgba(255,255,255,0.1)",
        background: correct ? "rgba(79,209,165,0.14)" : "rgba(255,255,255,0.04)",
        color: correct ? "#9be9cf" : "rgba(255,255,255,0.7)",
      }}
    >
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
        style={{
          borderColor: correct
            ? "rgba(79,209,165,0.7)"
            : "rgba(255,255,255,0.25)",
          background: correct ? "#4FD1A5" : "transparent",
        }}
      >
        {correct && <Check className="h-2.5 w-2.5 text-[#0A0D1C]" />}
      </span>
      {label}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * 3 — Neon orange radial glow → Always with you, no download
 * ------------------------------------------------------------------------- */

function NeonCard() {
  return (
    <BentoCard
      style={{
        background:
          "radial-gradient(90% 80% at 50% 115%, #ff7a18 0%, #b5300a 30%, #4a1206 55%, #1a0a08 78%, #0d0707 100%)",
      }}
    >
      <div className="relative z-10 p-8 md:p-9">
        <h3
          className="font-display font-semibold leading-[1.12] tracking-[-0.5px] text-white text-balance"
          style={{ fontSize: "clamp(22px, 2.6vw, 28px)" }}
        >
          Immer dabei.
          <span className="block text-white/80">Ohne App-Download.</span>
        </h3>
        <p className="mt-4 max-w-[300px] text-[15px] leading-relaxed text-white/65">
          <span className="font-semibold text-white">Läuft im Browser.</span>{" "}
          In der Bib, im Zug, offline — dein Lern-Set ist immer einen Tap
          entfernt.
        </p>
      </div>

      {/* phone mockup */}
      <div className="relative z-10 mt-auto flex items-end justify-center">
        <div
          className="relative w-[210px] translate-y-8 rounded-[2rem] border-[6px] border-[#1a1413] p-3"
          style={{
            background: "#0d1020",
            boxShadow:
              "0 0 50px rgba(255,122,24,0.35), 0 30px 60px -20px rgba(0,0,0,0.9)",
          }}
        >
          {/* notch */}
          <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-white/15" />
          {/* status bar */}
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold text-white/70">
              9:41
            </span>
            <Wifi className="h-3 w-3 text-white/50" />
          </div>
          {/* card label */}
          <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-[#ff9a4a]">
            Karte 12 / 38
          </p>
          {/* flashcard */}
          <div
            className="mt-2 rounded-xl border border-white/10 p-4"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <p className="text-[11px] leading-snug text-white/85">
              Was beschreibt die Preiselastizität der Nachfrage?
            </p>
            <div className="mt-4 flex justify-center">
              <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] text-white/60">
                Tippen zum Umdrehen
              </span>
            </div>
          </div>
          {/* progress dots */}
          <div className="mt-3 flex items-center justify-center gap-1.5 pb-1">
            <Dot active />
            <Dot active />
            <Dot />
            <Dot />
          </div>
        </div>
      </div>
    </BentoCard>
  );
}

function Dot({ active }: { active?: boolean }) {
  return (
    <span
      className="h-1.5 rounded-full"
      style={{
        width: active ? 16 : 6,
        background: active ? "#ff9a4a" : "rgba(255,255,255,0.25)",
      }}
    />
  );
}

/* ----------------------------------------------------------------------------
 * 4 — Emerald data UI → Blueprint for the top grade
 * ------------------------------------------------------------------------- */

function EmeraldCard() {
  return (
    <BentoCard
      style={{
        background:
          "radial-gradient(110% 90% at 80% 100%, rgba(79,209,165,0.3), transparent 55%), radial-gradient(80% 60% at 10% 0%, rgba(16,52,42,0.6), transparent 60%), #07140f",
      }}
    >
      <div className="relative z-10 p-8 md:p-9">
        <h3
          className="font-display font-semibold leading-[1.12] tracking-[-0.5px] text-white text-balance"
          style={{ fontSize: "clamp(22px, 2.6vw, 28px)" }}
        >
          Dein Blueprint für
          <span className="block text-[#6fe3bd]">die Bestnote.</span>
        </h3>
        <p className="mt-4 max-w-[320px] text-[15px] leading-relaxed text-white/65">
          <span className="font-semibold text-white">Sieh deinen Fortschritt.</span>{" "}
          Gemeisterte Karten, Quiz-Scores und Prüfungsrelevanz auf einen Blick.
        </p>
      </div>

      {/* angled 3D dashboard mockup */}
      <div className="relative z-10 mt-auto flex items-end justify-center overflow-hidden">
        <div
          className="w-[300px] translate-y-6 rounded-2xl border border-white/12 p-5 backdrop-blur-xl"
          style={{
            background: "rgba(8,28,22,0.7)",
            transform:
              "perspective(900px) rotateX(14deg) rotateZ(-6deg) translateY(20px)",
            boxShadow:
              "0 0 0 1px rgba(79,209,165,0.12), 0 30px 60px -20px rgba(0,0,0,0.8)",
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-white">
              Klausur-Bereitschaft
            </p>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#4FD1A5]">
              <TrendingUp className="h-3 w-3" />
              +18%
            </span>
          </div>

          <ProgressRow
            icon={<Layers className="h-3.5 w-3.5" />}
            label="Karten gemeistert"
            value="31 / 38"
            pct={82}
          />
          <ProgressRow
            icon={<Target className="h-3.5 w-3.5" />}
            label="Quiz-Score"
            value="88%"
            pct={88}
          />
          <ProgressRow
            icon={<GraduationCap className="h-3.5 w-3.5" />}
            label="Prüfungsrelevanz"
            value="Hoch"
            pct={70}
          />
        </div>
      </div>
    </BentoCard>
  );
}

function ProgressRow({
  icon,
  label,
  value,
  pct,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  pct: number;
}) {
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 text-white/65">
          <span className="text-[#4FD1A5]">{icon}</span>
          {label}
        </span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #2faf86, #4FD1A5)",
            boxShadow: "0 0 12px rgba(79,209,165,0.6)",
          }}
        />
      </div>
    </div>
  );
}
