"use client";

import { Check, FileText, Signal, Wifi } from "lucide-react";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ *
 * Cinematic feature grid — Flighty-style.
 *
 * Every card's visual is meant to be a REAL Lernly product screenshot,
 * rendered in a tilted, glowing, edge-bleeding device frame. Until those
 * PNGs exist in /public/mockups, we fall back to enlarged CSS widgets that
 * already wear the same tilt / glow / bleed treatment, so only the asset
 * swap remains.
 *
 * To go live with real renders:
 *   1. Drop the four PNGs into /public/mockups (see paths in SHOTS below).
 *   2. Flip MOCKUPS_READY to true.
 * ------------------------------------------------------------------ */
const MOCKUPS_READY = false;

const SHOTS = {
  upload: "/mockups/upload.png",
  quiz: "/mockups/quiz.png",
  phone: "/mockups/phone-flashcard.png",
  dashboard: "/mockups/dashboard.png",
} as const;

const INDIGO = "#2B3499";
const INDIGO_LIGHT = "#4B57D6";
const INDIGO_GRAD = `linear-gradient(135deg, ${INDIGO}, ${INDIGO_LIGHT})`;

// Per-card atmospheric glow — indigo-dominant, never a flat card fill.
const GLOW = {
  upload: "#2B3499",
  quiz: "#4B57D6",
  phone: "#3A4BD8",
  dashboard: "#2E5BBF",
} as const;

export default function FeatureBento() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="ln-fb-section relative w-full overflow-hidden px-5 py-20 md:py-28"
    >
      {/* Section-wide dusk haze */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[4%] top-16 h-[520px] w-[520px] rounded-full opacity-20 blur-[150px]"
        style={{ background: `radial-gradient(circle, ${INDIGO_LIGHT}, transparent 70%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[6%] bottom-0 h-[460px] w-[460px] rounded-full opacity-[0.14] blur-[150px]"
        style={{ background: `radial-gradient(circle, ${INDIGO}, transparent 70%)` }}
      />

      <div className="relative z-10 mx-auto max-w-[1140px]">
        <Header />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Card 1 — Upload (left, indigo, bleeds bottom-right) */}
          <Card
            glow={GLOW.upload}
            eyebrow="PDF rein, Lernset raus"
            title="Dein Skript. In 2 Minuten abfragbar."
            body="Hochladen, Kaffee holen, loslegen. Karteikarten, Probeklausur, Blueprint — ohne eine Karte selbst zu tippen."
            tilt="l"
            stageClass="md:left-8 md:right-0 md:bottom-[-30px]"
            deviceClass="md:w-[120%]"
          >
            {/* TODO: replace with real screenshot render (SHOTS.upload) */}
            <Shot src={SHOTS.upload} alt="Lernly Upload-Ansicht">
              <BrowserChrome url="lernly-app.de · neues Paket">
                <UploadWidget />
              </BrowserChrome>
            </Shot>
          </Card>

          {/* Card 2 — Quiz (HERO, right, strongest glow, bleeds bottom) */}
          <Card
            hero
            glow={GLOW.quiz}
            eyebrow="Keine Quiz-Fragen von der Stange"
            title="Probeklausur im Stil deiner Prüfung."
            body="Lernly liest deine Altklausuren mit und fragt dich so, wie dein Prof fragt."
            tilt="r"
            stageClass="md:left-7 md:right-7 md:bottom-[-26px]"
            deviceClass="md:w-[116%]"
          >
            {/* TODO: replace with real screenshot render (SHOTS.quiz) */}
            <Shot src={SHOTS.quiz} alt="Lernly Probeklausur-Ansicht">
              <BrowserChrome url="lernly-app.de · Probeklausur" accent>
                <QuizWidget />
              </BrowserChrome>
            </Shot>
          </Card>

          {/* Card 3 — Offline phone (left, cool indigo, bleeds off bottom) */}
          <Card
            glow={GLOW.phone}
            eyebrow="Immer dabei"
            title="Läuft im Browser. Auch ohne WLAN."
            body="Einmal laden, als Lern-Set gespeichert. Bib, Zug, unterwegs — kein App-Download, kein Login-Stress."
            tilt="phone"
            stageClass="md:left-0 md:right-0 md:bottom-[-48px]"
            deviceClass=""
          >
            {/* TODO: replace with real screenshot render (SHOTS.phone) */}
            <Shot src={SHOTS.phone} alt="Lernly Karteikarte auf dem Handy" phone>
              <PhoneChrome>
                <PhoneFlashcard />
              </PhoneChrome>
            </Shot>
          </Card>

          {/* Card 4 — Dashboard (right, teal-indigo, bleeds bottom-right) */}
          <Card
            glow={GLOW.dashboard}
            eyebrow="Dein Fortschritt auf einen Blick"
            title="Blueprint für die Bestnote."
            body="Gemeisterte Karten, Quiz-Score und Prüfungsrelevanz — du siehst sofort, wie bereit du bist."
            tilt="r"
            stageClass="md:left-8 md:right-0 md:bottom-[-30px]"
            deviceClass="md:w-[120%]"
          >
            {/* TODO: replace with real screenshot render (SHOTS.dashboard) */}
            <Shot src={SHOTS.dashboard} alt="Lernly Fortschritts-Dashboard">
              <BrowserChrome url="lernly-app.de · dein Paket">
                <DashboardWidget />
              </BrowserChrome>
            </Shot>
          </Card>
        </div>

        <PriceBand />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function Header() {
  return (
    <header className="mb-12 text-center md:mb-16">
      <Eyebrow>Was Lernly anders macht</Eyebrow>
      <h2
        id="features-heading"
        className="mx-auto mt-4 max-w-[20ch] text-balance font-display text-[2.5rem] font-bold leading-[1.05] tracking-tight text-white md:text-[3.75rem]"
      >
        Klausur in 7 Tagen?
        <br />
        <span className="font-semibold italic text-white/40">Reicht.</span>
      </h2>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Card shell — noise + glow + tilted/bleeding device stage            */
/* ------------------------------------------------------------------ */

function Card({
  glow,
  hero = false,
  eyebrow,
  title,
  body,
  tilt,
  stageClass = "",
  deviceClass = "",
  children,
}: {
  glow: string;
  hero?: boolean;
  eyebrow: string;
  title: string;
  body: string;
  tilt: "l" | "r" | "phone";
  stageClass?: string;
  deviceClass?: string;
  children: ReactNode;
}) {
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[22px] border p-7 md:p-8 ${
        hero ? "md:min-h-[510px]" : "md:min-h-[490px]"
      }`}
      style={{
        backgroundColor: hero ? "#171C30" : "#141930",
        borderColor: hero ? "rgba(75,87,214,0.45)" : "rgba(255,255,255,0.07)",
        boxShadow: hero
          ? "0 0 0 1px rgba(75,87,214,0.15), 0 30px 80px -34px rgba(43,52,153,0.7)"
          : "0 22px 60px -34px rgba(0,0,0,0.65)",
      }}
    >
      <div className="ln-fb-noise" aria-hidden />

      <div className="relative z-20">
        <Eyebrow>{eyebrow}</Eyebrow>
        <CardTitle>{title}</CardTitle>
        <CardBody>{body}</CardBody>
      </div>

      <div
        className={`ln-fb-stage relative z-[1] mt-8 md:absolute md:mt-0 ${stageClass}`}
      >
        <div
          className={`ln-fb-glow ${hero ? "ln-fb-glow--hero" : ""}`}
          style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 70%)` }}
          aria-hidden
        />
        <div className={`ln-fb-device ln-fb-tilt-${tilt} ${deviceClass}`}>{children}</div>
      </div>
    </article>
  );
}

/* Screenshot slot: real PNG when ready, else the CSS fallback device. */
function Shot({
  src,
  alt,
  phone = false,
  children,
}: {
  src: string;
  alt: string;
  phone?: boolean;
  children: ReactNode;
}) {
  if (MOCKUPS_READY) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={phone ? "ln-fb-shot mx-auto w-[268px] max-w-full" : "ln-fb-shot"}
      />
    );
  }
  return <>{children}</>;
}

/* ------------------------------------------------------------------ */
/* Shared text primitives                                              */
/* ------------------------------------------------------------------ */

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className="font-sans text-[11px] font-medium uppercase tracking-[0.22em]"
      style={{ color: "#6B7290" }}
    >
      {children}
    </p>
  );
}

function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-3 text-pretty font-display text-xl font-semibold leading-snug text-white md:text-[1.45rem]">
      {children}
    </h3>
  );
}

function CardBody({ children }: { children: ReactNode }) {
  return (
    <p
      className="mt-2 max-w-[44ch] font-sans text-[15px] leading-relaxed"
      style={{ color: "#A9B0C4" }}
    >
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Device chrome (fallback frames)                                     */
/* ------------------------------------------------------------------ */

function BrowserChrome({
  url,
  accent = false,
  children,
}: {
  url: string;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-[16px] border"
      style={{
        background: "#0F1322",
        borderColor: accent ? "rgba(75,87,214,0.3)" : "rgba(255,255,255,0.1)",
        boxShadow:
          "0 34px 64px -28px rgba(0,0,0,0.8), 0 10px 30px -14px rgba(43,52,153,0.55)",
      }}
    >
      <div
        className="flex items-center gap-2 border-b px-4 py-2.5"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
      >
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.13)" }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
        <span
          className="ml-3 flex-1 truncate rounded-md px-3 py-1 font-sans text-[11px]"
          style={{ background: "rgba(255,255,255,0.04)", color: "#6B7290" }}
        >
          {url}
        </span>
      </div>
      <div className="p-4 md:p-5">{children}</div>
    </div>
  );
}

function PhoneChrome({ children }: { children: ReactNode }) {
  return (
    <div
      className="mx-auto w-[268px] rounded-[34px] border p-2.5"
      style={{
        background: "#0A0D1A",
        borderColor: "rgba(255,255,255,0.12)",
        boxShadow:
          "0 44px 74px -30px rgba(0,0,0,0.85), 0 14px 34px -16px rgba(58,75,216,0.45)",
      }}
    >
      <div
        className="overflow-hidden rounded-[26px] border"
        style={{ background: "#0F1322", borderColor: "rgba(255,255,255,0.06)" }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fallback widgets (enlarged ~40%) — replaced by real screenshots     */
/* ------------------------------------------------------------------ */

function UploadWidget() {
  return (
    <div>
      <div
        className="flex items-center gap-3 rounded-xl border px-3.5 py-3"
        style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "rgba(75,87,214,0.18)" }}
        >
          <FileText size={18} style={{ color: INDIGO_LIGHT }} />
        </span>
        <span className="truncate font-sans text-[14px] font-medium text-white/85">
          Vorlesung_BWL.pdf
        </span>
        <span className="ml-auto font-sans text-[12px]" style={{ color: "#6B7290" }}>
          4.2 MB
        </span>
      </div>
      <div
        className="mt-4 h-2.5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="h-full rounded-full" style={{ width: "70%", background: INDIGO_GRAD }} />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Pill>38 Karten</Pill>
        <Pill>1 Probeklausur</Pill>
        <span className="ml-auto font-sans text-[12px]" style={{ color: "#6B7290" }}>
          fertig in 1:54
        </span>
      </div>
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 font-sans text-[12px] font-medium text-white/75"
      style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
    >
      {children}
    </span>
  );
}

function QuizWidget() {
  const options = [
    { label: "Product", correct: false },
    { label: "Price", correct: false },
    { label: "Personalkosten", correct: true },
    { label: "Promotion", correct: false },
  ];
  return (
    <div>
      <span
        className="font-sans text-[11px] uppercase tracking-[0.2em]"
        style={{ color: "#6B7290" }}
      >
        Frage 4/20
      </span>
      <p className="mt-2 font-sans text-[15px] font-medium leading-snug text-white">
        Welcher Faktor zählt nicht zum Marketing-Mix?
      </p>
      <ul className="mt-4 space-y-2.5">
        {options.map((o) => (
          <li key={o.label}>
            <div
              className="flex items-center justify-between rounded-xl border px-4 py-3 font-sans text-[14px]"
              style={
                o.correct
                  ? {
                      background: INDIGO_GRAD,
                      borderColor: "transparent",
                      color: "#FFFFFF",
                      fontWeight: 600,
                    }
                  : {
                      backgroundColor: "rgba(255,255,255,0.02)",
                      borderColor: "rgba(255,255,255,0.08)",
                      color: "#A9B0C4",
                    }
              }
            >
              <span>{o.label}</span>
              {o.correct && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                  <Check size={13} strokeWidth={3} />
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PhoneFlashcard() {
  return (
    <>
      <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
        <span className="font-sans text-[12px] font-semibold text-white/90">9:41</span>
        <div className="flex items-center gap-1.5 text-white/70">
          <Signal size={13} />
          <Wifi size={13} />
        </div>
      </div>
      <div className="px-4 pb-6 pt-1.5">
        <span
          className="font-sans text-[11px] font-semibold uppercase tracking-[0.15em]"
          style={{ color: INDIGO_LIGHT }}
        >
          Karte 12 / 38
        </span>
        <div
          className="mt-3 rounded-2xl border px-4 py-7"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <p className="font-sans text-[14px] font-medium leading-snug text-white">
            Was beschreibt die Preiselastizität der Nachfrage?
          </p>
        </div>
        <div
          className="mt-4 rounded-xl py-3 text-center font-sans text-[13px] font-semibold text-white"
          style={{ background: INDIGO_GRAD }}
        >
          Tippen zum Umdrehen
        </div>
      </div>
    </>
  );
}

function DashboardWidget() {
  const rows = [
    { label: "Karten gemeistert", value: "31 / 38", pct: 80, tag: null },
    { label: "Quiz-Score", value: "88%", pct: 88, tag: "Hoch" },
  ];
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="font-sans text-[14px] font-semibold text-white">
          Klausur-Bereitschaft
        </span>
        <span
          className="rounded-full px-2.5 py-0.5 font-sans text-[11px] font-semibold"
          style={{ background: "rgba(75,87,214,0.22)", color: "#A9B4FF" }}
        >
          +18%
        </span>
      </div>
      <div className="mt-5 space-y-5">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between">
              <span className="font-sans text-[13px]" style={{ color: "#A9B0C4" }}>
                {r.label}
              </span>
              <span className="flex items-center gap-2 font-sans text-[13px] font-semibold text-white">
                {r.value}
                {r.tag && (
                  <span className="font-sans text-[11px] font-medium" style={{ color: INDIGO_LIGHT }}>
                    {r.tag}
                  </span>
                )}
              </span>
            </div>
            <div
              className="mt-2 h-2.5 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            >
              <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: INDIGO_GRAD }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Price band                                                          */
/* ------------------------------------------------------------------ */

function PriceBand() {
  return (
    <div
      className="mt-5 flex flex-col items-start gap-5 border-t pt-10 md:flex-row md:items-center md:gap-10"
      style={{ borderColor: "rgba(255,255,255,0.07)" }}
    >
      <span
        className="bg-clip-text font-display text-[4rem] font-bold leading-none tracking-tight text-transparent md:text-[5rem]"
        style={{ backgroundImage: INDIGO_GRAD }}
      >
        0€
      </span>
      <div>
        <h3 className="font-display text-xl font-semibold text-white md:text-2xl">
          2 Pakete gratis. Jeden Monat.
        </h3>
        <p
          className="mt-1 max-w-[52ch] font-sans text-[15px] leading-relaxed"
          style={{ color: "#A9B0C4" }}
        >
          Kein Account nötig zum Testen. Keine Kreditkarte, keine Verpflichtung.
        </p>
      </div>
    </div>
  );
}
