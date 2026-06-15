"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import UploadMaskMockup from "@/components/landing/mockups/UploadMaskMockup";
import QuizResultMockup from "@/components/landing/mockups/QuizResultMockup";
import PhoneHubMockup from "@/components/landing/mockups/PhoneHubMockup";
import TopicConceptMockup from "@/components/landing/mockups/TopicConceptMockup";

// Lazy + client-only: the real FlashcardDeck pulls framer-motion + confetti.
// Card 4 is below the fold, so keep that weight out of the SSR/initial bundle.
const FlashcardMockup = dynamic(
  () => import("@/components/landing/mockups/FlashcardMockup"),
  { ssr: false, loading: () => <div className="min-h-[260px]" /> },
);

/* ------------------------------------------------------------------ *
 * Feature grid — every visual is a rendered, inert demo of the real app
 * (razor-sharp DOM, no bitmaps). Upload / Quiz-result / Phone-hub / Flashcard
 * + a multilingual proof row.
 * ------------------------------------------------------------------ */

const INDIGO = "#2B3499";
const INDIGO_LIGHT = "#4B57D6";
const INDIGO_GRAD = `linear-gradient(135deg, ${INDIGO}, ${INDIGO_LIGHT})`;

export default function FeatureBento() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="ln-fb-section relative w-full overflow-hidden px-5 py-14 md:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute right-[4%] top-16 h-[520px] w-[520px] rounded-full opacity-20 blur-[150px]"
        style={{ background: `radial-gradient(circle, ${INDIGO_LIGHT}, transparent 70%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[6%] bottom-0 hidden h-[460px] w-[460px] rounded-full opacity-[0.14] blur-[150px] md:block"
        style={{ background: `radial-gradient(circle, ${INDIGO}, transparent 70%)` }}
      />

      <div className="relative z-10 mx-auto max-w-[1140px]">
        <Header />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Card 1 — Upload */}
          <Card
            eyebrow="PDF rein, Lernset raus"
            title="Dein Skript. In 2 Minuten abfragbar."
            body="Hochladen, Kaffee holen, loslegen. Karteikarten, Probeklausur, Blueprint — ohne eine Karte selbst zu tippen."
          >
            <UploadMaskMockup />
          </Card>

          {/* Card 2 — Quiz (HERO) */}
          <Card
            hero
            eyebrow="Keine Quiz-Fragen von der Stange"
            title="Probeklausur im Stil deiner Prüfung."
            body="Lernly liest deine Altklausuren mit und fragt dich so, wie dein Prof fragt."
          >
            <QuizResultMockup />
          </Card>

          {/* Card 3 — Offline phone */}
          <Card
            eyebrow="Immer dabei"
            title="Läuft im Browser. Auch ohne WLAN."
            body="Einmal laden, als Lern-Set gespeichert. Bib, Zug, unterwegs — kein App-Download, kein Login-Stress."
          >
            <PhoneHubMockup />
          </Card>

          {/* Card 4 — real Karteikarte component (razor-sharp, not a screenshot) */}
          <Card
            eyebrow="Aktiv abgefragt, nicht berieselt"
            title="Karteikarten, die dich rankriegen."
            body="Frage, umdrehen, bewerten — nur was sitzt, verschwindet. Genau wie in der App."
          >
            <FlashcardMockup />
          </Card>
        </div>

        {/* Multilingual proof — English material is an advantage, not a break */}
        <div className="mt-16 grid grid-cols-1 items-center gap-8 md:mt-20 md:grid-cols-2 md:gap-12">
          <div>
            <p
              className="font-sans text-[11px] font-medium uppercase tracking-[0.22em]"
              style={{ color: "#8A93C8" }}
            >
              Jedes Fach, jede Sprache
            </p>
            <h3 className="mt-3 font-display text-2xl font-semibold leading-snug text-white md:text-[2rem]">
              Folien auf Deutsch oder Englisch?
            </h3>
            <p
              className="mt-3 max-w-[44ch] font-sans text-[16px] leading-relaxed"
              style={{ color: "#A9B0C4" }}
            >
              Egal — Lernly versteht beides. Dein Paket kommt in der Sprache deines Stoffs.
            </p>
          </div>
          <TopicConceptMockup />
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
    <header className="mb-8 text-center md:mb-12">
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
/* Card shell — text on top, screenshot bleeding off the bottom        */
/* ------------------------------------------------------------------ */

function Card({
  hero = false,
  eyebrow,
  title,
  body,
  children,
}: {
  hero?: boolean;
  eyebrow: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-[22px] border p-7 md:p-8"
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

      {/* Rendered mockup — fully visible (no bleed; must stay readable). */}
      <div className="relative z-[1] mt-7">{children}</div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Shared text primitives                                              */
/* ------------------------------------------------------------------ */

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className="font-sans text-[11px] font-medium uppercase tracking-[0.22em]"
      style={{ color: "#8A93C8" }}
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
