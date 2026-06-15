"use client";

import { type ReactNode, useState } from "react";

/**
 * FeatureBento — "Was Lernly anders macht"
 *
 * Strict design system:
 *  - Background deep navy (#0A0E23), cards #0D1228 / border-white/8.
 *  - ONE accent: blue -> indigo (#60A5FA -> #818CF8). Used only for stat
 *    numbers, provenance badges, correct-answer states and the price.
 *  - Everything else stays monochrome navy/white. No per-card color themes.
 *  - Geist Sans for text, Geist Mono for all data/chips/stats.
 *  - The demo is the hero: every card shows real product UI built in pure
 *    HTML/CSS — no external images, no abstract illustrations.
 *
 * The Klausur-Simulator card promises "echte Altklausuren". Per the brief we
 * only ship that promise (title + provenance badge) once the feature is live.
 */
const ALTKLAUSUR_LIVE = false;

const ACCENT = "linear-gradient(135deg,#60A5FA,#818CF8)";

export default function FeatureBento() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="ln-bento relative w-full overflow-hidden px-5 py-20 md:py-28"
    >
      {/* Two restrained radial glows — nothing louder. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-[8%] h-[460px] w-[460px] rounded-full opacity-[0.16] blur-[120px]"
        style={{ background: "radial-gradient(circle,#60A5FA,transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-[6%] h-[420px] w-[420px] rounded-full opacity-[0.12] blur-[120px]"
        style={{ background: "radial-gradient(circle,#818CF8,transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto max-w-[1180px]">
        <Header />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          {/* Row 1 — two large cards, 7/5 split */}
          <Card className="md:col-span-7">
            <UploadCard />
          </Card>
          <Card className="md:col-span-5">
            <KlausurCard />
          </Card>

          {/* Row 2 — three cards, 4/4/4 */}
          <Card className="md:col-span-4">
            <RelevanzCard />
          </Card>
          <Card className="md:col-span-4">
            <RecallCard />
          </Card>
          <div className="grid gap-5 md:col-span-4">
            <Card className="flex-1">
              <SpeedCard />
            </Card>
            <Card>
              <OfflineCard />
            </Card>
          </div>

          {/* Row 3 — full-width price band */}
          <Card className="md:col-span-12">
            <PriceBand />
          </Card>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section header                                                      */
/* ------------------------------------------------------------------ */

function Header() {
  return (
    <header className="mb-12 md:mb-16">
      <Eyebrow>Was Lernly anders macht</Eyebrow>
      <h2
        id="features-heading"
        className="mt-4 text-balance text-[2.75rem] font-semibold leading-[1.02] tracking-tight text-white md:text-[4.25rem]"
        style={{ fontFamily: "var(--font-geist)" }}
      >
        Klausur in 7 Tagen?
        <br />
        <span className="italic text-white/50">Reicht.</span>
      </h2>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0D1228] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 md:p-7 ${className}`}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[11px] uppercase tracking-[0.25em] text-white/40"
      style={{ fontFamily: "var(--font-geist-mono)" }}
    >
      {children}
    </p>
  );
}

function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h3
      className="mt-3 text-pretty text-xl font-semibold leading-snug text-white md:text-[1.4rem]"
      style={{ fontFamily: "var(--font-geist)" }}
    >
      {children}
    </h3>
  );
}

function CardBody({ children }: { children: ReactNode }) {
  return (
    <p
      className="mt-2 max-w-[42ch] text-[15px] leading-relaxed text-white/65 md:text-base"
      style={{ fontFamily: "var(--font-geist)" }}
    >
      {children}
    </p>
  );
}

function Chip({
  children,
  accent = false,
}: {
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] ${
        accent
          ? "border-transparent text-[#0A0E23]"
          : "border-white/10 text-white/70"
      }`}
      style={{
        fontFamily: "var(--font-geist-mono)",
        background: accent ? ACCENT : "rgba(255,255,255,0.03)",
      }}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Card 1 — Upload                                                     */
/* ------------------------------------------------------------------ */

function UploadCard() {
  return (
    <div className="flex h-full flex-col">
      <Eyebrow>PDF rein, Lernset raus</Eyebrow>
      <CardTitle>Dein Skript. In 2 Minuten abfragbar.</CardTitle>
      <CardBody>
        Hochladen, Kaffee holen, loslegen. Karteikarten, Probeklausur,
        Blueprint — ohne eine Karte selbst zu tippen.
      </CardBody>

      {/* Mockup */}
      <div className="mt-6 rounded-xl border border-white/[0.08] bg-[#0A0E23] p-4">
        {/* File chip */}
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <FileGlyph />
          <span
            className="truncate text-[13px] text-white/80"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Vorlesung_BWL.pdf
          </span>
          <span
            className="ml-auto text-[12px] text-white/40"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            4.2 MB
          </span>
        </div>

        {/* Progress with single slow shimmer */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="ln-bento-progress h-full rounded-full"
            style={{ width: "82%", background: ACCENT }}
          />
        </div>

        {/* Result chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Chip>38 Karten</Chip>
          <Chip>1 Probeklausur</Chip>
          <span
            className="ml-auto text-[12px] text-white/50"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            fertig in 1:54
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card 2 — Klausur-Simulator                                          */
/* ------------------------------------------------------------------ */

function KlausurCard() {
  const options = [
    { label: "Product", correct: false },
    { label: "Price", correct: false },
    { label: "Personalkosten", correct: true },
    { label: "Promotion", correct: false },
  ];

  return (
    <div className="flex h-full flex-col">
      <Eyebrow>Keine Quiz-Fragen von der Stange</Eyebrow>
      <CardTitle>
        {ALTKLAUSUR_LIVE
          ? "Probeklausuren aus echten Altklausuren."
          : "Probeklausur im Stil deiner Prüfung."}
      </CardTitle>
      <CardBody>
        Lernly liest deine Altklausuren mit und fragt dich so, wie dein Prof
        fragt.
      </CardBody>

      {/* Quiz mockup */}
      <div className="mt-6 rounded-xl border border-white/[0.08] bg-[#0A0E23] p-4">
        <span
          className="text-[11px] uppercase tracking-[0.2em] text-white/40"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          Frage 4/20
        </span>
        <p
          className="mt-2 text-[14px] font-medium leading-snug text-white"
          style={{ fontFamily: "var(--font-geist)" }}
        >
          Welcher Faktor zählt nicht zum Marketing-Mix?
        </p>

        <ul className="mt-3 space-y-2">
          {options.map((o) => (
            <li key={o.label}>
              <div
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-[13px] ${
                  o.correct
                    ? "border-transparent text-white"
                    : "border-white/10 text-white/70"
                }`}
                style={{
                  fontFamily: "var(--font-geist)",
                  background: o.correct
                    ? "rgba(96,165,250,0.14)"
                    : "rgba(255,255,255,0.02)",
                  boxShadow: o.correct
                    ? "inset 0 0 0 1px rgba(129,140,248,0.5)"
                    : undefined,
                }}
              >
                <span>{o.label}</span>
                {o.correct && <CheckMark />}
              </div>
            </li>
          ))}
        </ul>

        {ALTKLAUSUR_LIVE && (
          <div className="mt-3">
            <Chip accent>Kam in 3 von 4 Altklausuren dran</Chip>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card 3 — Relevanz table                                             */
/* ------------------------------------------------------------------ */

function RelevanzCard() {
  const rows = [
    { label: "Dein Skript", value: "400 Folien" },
    { label: "Prüfungsrelevant", value: "~40", accent: true },
    { label: "Lernly zeigt", value: "welche", accent: true },
    { label: "Zeit gespart", value: "Stunden" },
  ];

  return (
    <div className="flex h-full flex-col">
      <Eyebrow>Nicht alles, nur das Richtige</Eyebrow>
      <CardTitle>Was wirklich geprüft wird.</CardTitle>

      <div className="mt-6 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0A0E23]">
        {rows.map((r, i) => (
          <div
            key={r.label}
            className={`flex items-center justify-between px-4 py-3 ${
              i !== rows.length - 1 ? "border-b border-white/[0.06]" : ""
            }`}
          >
            <span
              className="text-[13px] text-white/60"
              style={{ fontFamily: "var(--font-geist)" }}
            >
              {r.label}
            </span>
            <span
              className="text-[13px] font-medium"
              style={{
                fontFamily: "var(--font-geist-mono)",
                color: r.accent ? "#93B4FF" : "rgba(255,255,255,0.85)",
              }}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card 4 — Active Recall flashcard (flip on tap/hover)                */
/* ------------------------------------------------------------------ */

function RecallCard() {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <Eyebrow>Lesen ≠ Lernen</Eyebrow>
      <CardTitle>Du wirst abgefragt. Nicht berieselt.</CardTitle>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setFlipped((v) => !v)}
          onMouseEnter={() => setFlipped(true)}
          onMouseLeave={() => setFlipped(false)}
          aria-label="Karteikarte umdrehen"
          className="ln-flip-card w-full text-left"
          data-flipped={flipped}
        >
          <div className="ln-flip-inner relative h-[110px] w-full">
            {/* Front */}
            <div className="ln-flip-face flex items-center rounded-xl border border-white/[0.08] bg-[#0A0E23] px-4">
              <p
                className="text-[14px] font-medium leading-snug text-white"
                style={{ fontFamily: "var(--font-geist)" }}
              >
                Was beschreibt die Preiselastizität der Nachfrage?
              </p>
            </div>
            {/* Back */}
            <div
              className="ln-flip-face ln-flip-back flex items-center rounded-xl border px-4"
              style={{
                borderColor: "rgba(129,140,248,0.4)",
                background: "rgba(96,165,250,0.10)",
              }}
            >
              <p
                className="text-[13px] leading-snug text-white/85"
                style={{ fontFamily: "var(--font-geist)" }}
              >
                Wie stark die nachgefragte Menge auf eine Preisänderung
                reagiert.
              </p>
            </div>
          </div>
        </button>

        {/* Rating buttons */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {["Wusste ich", "Unsicher", "Keine Ahnung"].map((label) => (
            <span
              key={label}
              className="flex min-h-[44px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-2 text-center text-[11px] text-white/70"
              style={{ fontFamily: "var(--font-geist)" }}
            >
              {label}
            </span>
          ))}
        </div>

        <p
          className="mt-3 text-[12px] text-white/45"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          Nur falsche kommen wieder.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card 5 — Speed stat                                                 */
/* ------------------------------------------------------------------ */

function SpeedCard() {
  return (
    <div className="flex h-full flex-col">
      <Eyebrow>Schluss mit Karten schreiben</Eyebrow>
      <div className="mt-4 flex items-baseline gap-2">
        <span
          className="bg-clip-text text-[3.5rem] font-semibold leading-none tracking-tight text-transparent"
          style={{ fontFamily: "var(--font-geist)", backgroundImage: ACCENT }}
        >
          ~120
        </span>
        <span
          className="text-[14px] text-white/50"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          Sek / Fach
        </span>
      </div>
      <CardBody>
        Was dich sonst einen Abend kostet, macht Lernly bevor dein Kaffee kalt
        ist.
      </CardBody>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card 6 — Offline                                                    */
/* ------------------------------------------------------------------ */

function OfflineCard() {
  return (
    <div className="flex h-full flex-col">
      <CardTitle>Läuft auch ohne WLAN.</CardTitle>
      <CardBody>Einmal laden, als HTML speichern. Bib, Zug, Klo — egal.</CardBody>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Price band                                                          */
/* ------------------------------------------------------------------ */

function PriceBand() {
  return (
    <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:gap-10">
      <span
        className="bg-clip-text text-[4rem] font-semibold leading-none tracking-tight text-transparent md:text-[5rem]"
        style={{ fontFamily: "var(--font-geist)", backgroundImage: ACCENT }}
      >
        0€
      </span>
      <div>
        <h3
          className="text-xl font-semibold text-white md:text-2xl"
          style={{ fontFamily: "var(--font-geist)" }}
        >
          2 Pakete gratis. Jeden Monat.
        </h3>
        <p
          className="mt-1 max-w-[48ch] text-[15px] leading-relaxed text-white/65"
          style={{ fontFamily: "var(--font-geist)" }}
        >
          Free-Tier resettet monatlich. Keine Kreditkarte, keine Verpflichtung.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tiny inline glyphs (monochrome, no emoji)                           */
/* ------------------------------------------------------------------ */

function FileGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 text-white/55"
    >
      <path
        d="M6 2h8l4 4v16H6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M14 2v4h4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CheckMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 13l4 4L19 7"
        stroke="#93B4FF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
