"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { Languages } from "lucide-react";
import SectionHeading from "@/components/landing/SectionHeading";
import UploadMaskMockup from "@/components/landing/mockups/UploadMaskMockup";
import QuizResultMockup from "@/components/landing/mockups/QuizResultMockup";
import BrowserSetMockup from "@/components/landing/mockups/BrowserSetMockup";
import TopicConceptMockup from "@/components/landing/mockups/TopicConceptMockup";

// Lazy + client-only: the real FlashcardDeck pulls framer-motion + confetti.
// Below the fold, so keep that weight out of the SSR/initial bundle.
const FlashcardMockup = dynamic(
  () => import("@/components/landing/mockups/FlashcardMockup"),
  { ssr: false, loading: () => <div className="min-h-[260px]" /> },
);

/* ------------------------------------------------------------------ *
 * Feature bento - rendered, inert demos of the real app (razor-sharp DOM).
 * Asymmetric 12-col bento: Quiz hero (7) + Upload (5) / Browser-offline (5) +
 * Flashcard (7), then a compact DE/EN strip.
 * ------------------------------------------------------------------ */

const INDIGO = "#2B3499";
const INDIGO_LIGHT = "#4B57D6";

export default function FeatureBento() {
  return (
    <section
      id="features"
      className="ln-fb-section relative w-full overflow-hidden px-6 py-14 md:py-20"
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

      <div className="relative z-10 mx-auto max-w-[1200px]">
        <div className="mb-8 md:mb-12">
          <SectionHeading
            eyebrow="Was Lernly anders macht"
            boldPart="Vom Skript zur Bestnote."
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          {/* Quiz - HERO, larger */}
          <Card
            hero
            className="md:col-span-7"
            eyebrow="Keine Quiz-Fragen von der Stange"
            title="Probeklausur im Stil deiner Prüfung."
            body="Lernly liest deine Altklausuren mit und fragt dich so, wie dein Prof fragt, und zeigt dir sofort, wo du stehst."
          >
            <QuizResultMockup />
          </Card>

          {/* Upload */}
          <Card
            className="md:col-span-5"
            eyebrow="PDF rein, Lernset raus"
            title="Dein Skript. In 2 Minuten abfragbar."
            body="Hochladen, Kaffee holen, loslegen. Ohne eine Karte selbst zu tippen."
          >
            <UploadMaskMockup />
          </Card>

          {/* Browser / offline */}
          <Card
            className="md:col-span-5"
            eyebrow="Immer dabei"
            title="Läuft im Browser. Auch ohne WLAN."
            body="Einmal geladen, läuft im Browser weiter: Bib, Zug, unterwegs. Kein App-Download, kein Login-Stress."
          >
            <BrowserSetMockup />
          </Card>

          {/* Flashcard - larger */}
          <Card
            className="md:col-span-7"
            eyebrow="Aktiv abgefragt, nicht berieselt"
            title="Karteikarten, die dich rankriegen."
            body="Frage, umdrehen, bewerten. Nur was sitzt, verschwindet. Genau wie in der App."
          >
            <FlashcardMockup />
          </Card>

          {/* DE/EN - compact full-width strip (folded multilingual proof) */}
          <article
            className="group relative overflow-hidden rounded-[22px] border p-7 md:col-span-12 md:p-8"
            style={{
              backgroundColor: "#141930",
              borderColor: "rgba(255,255,255,0.07)",
              boxShadow: "0 22px 60px -34px rgba(0,0,0,0.65)",
            }}
          >
            <div className="ln-fb-noise" aria-hidden />
            <div className="relative z-10 grid grid-cols-1 items-center gap-7 lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-12">
              <div>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-sans text-[11px] font-semibold"
                  style={{ background: "rgba(110,128,242,0.12)", borderColor: "rgba(110,128,242,0.3)", color: "#A9B4FF" }}
                >
                  <Languages size={13} strokeWidth={2} aria-hidden />
                  DE / EN
                </span>
                <h3 className="mt-3 text-balance font-display text-xl font-semibold leading-snug text-white md:text-2xl">
                  Folien auf Deutsch oder Englisch? Egal.
                </h3>
                <p className="mt-2 max-w-[46ch] font-sans text-[15px] leading-relaxed" style={{ color: "#A9B0C4" }}>
                  Lernly versteht beides und baut dein Paket in der Sprache deines Stoffs: BWL, Jura, Medizin, Technik.
                </p>
              </div>
              <TopicConceptMockup />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Card shell - text on top, rendered mockup below                     */
/* ------------------------------------------------------------------ */

function Card({
  hero = false,
  eyebrow,
  title,
  body,
  className = "",
  children,
}: {
  hero?: boolean;
  eyebrow: string;
  title: string;
  body: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[22px] border p-7 md:p-8 ${className}`}
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
        <CardTitle large={hero}>{title}</CardTitle>
        <CardBody>{body}</CardBody>
      </div>

      {/* Rendered mockup - fully visible (no bleed; must stay readable). */}
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

function CardTitle({ children, large = false }: { children: ReactNode; large?: boolean }) {
  return (
    <h3
      className={`mt-3 text-pretty font-display font-semibold leading-snug text-white ${
        large ? "text-[1.45rem] md:text-[1.85rem]" : "text-xl md:text-[1.45rem]"
      }`}
    >
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
