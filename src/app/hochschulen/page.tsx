import type { Metadata } from "next";
import Link from "next/link";
import {
  Upload,
  CheckCircle,
  Smartphone,
  BarChart3,
  Landmark,
  Presentation,
  GraduationCap,
  Check,
  ShieldCheck,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import LernlyLogo from "@/components/LernlyLogo";
import SiteFooter from "@/components/SiteFooter";
import SectionHeading from "@/components/landing/SectionHeading";
import LeadForm from "./LeadForm";
import RevealObserver from "./RevealObserver";

// =========================================================================
// /hochschulen — B2B landing page for universities (program directors,
// digital-learning staff). Outreach + LinkedIn point here; the B2C landing
// at "/" stays untouched. Server Component; only LeadForm is client-side.
// =========================================================================

const PAGE_TITLE =
  "Lernly für Hochschulen — prüfungsnahe Lernpakete für ganze Kohorten";
const PAGE_DESCRIPTION =
  "Lernly verwandelt die offiziellen Unterlagen eines Moduls in Karteikarten, Quiz und Prüfungssimulationen — freigegeben von Lehrenden, genutzt von Studierenden, messbar für Ihre Hochschule. Betreuter Pilot ab 1.500 €.";

export const metadata: Metadata = {
  title: { absolute: PAGE_TITLE },
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/hochschulen" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    locale: "de_DE",
    type: "website",
    url: "/hochschulen",
    images: [
      {
        url: "/lernly-og.png",
        width: 1200,
        height: 630,
        alt: "Lernly für Hochschulen — prüfungsnahe Lernpakete für ganze Kohorten",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ["/lernly-og.png"],
  },
};

// Primary CTA target: booking link (e.g. Calendly) via env var, mailto as
// fallback. NEXT_PUBLIC_HOCHSCHULEN_CTA_URL must be set in ALL Vercel scopes.
const CTA_URL =
  process.env.NEXT_PUBLIC_HOCHSCHULEN_CTA_URL ||
  "mailto:info@lernly-app.de?subject=Lernly%20Hochschul-Pilot";
const CTA_IS_EXTERNAL = CTA_URL.startsWith("http");

const CTA_PRIMARY_LABEL = "15-Min-Gespräch buchen";

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Upload,
    title: "Upload",
    text: "Lehrende laden die offiziellen Modulunterlagen hoch.",
  },
  {
    icon: CheckCircle,
    title: "Freigabe",
    text: "Das erzeugte Lernpaket wird von Lehrenden geprüft und freigegeben — die Qualitätskontrolle bleibt bei Ihnen.",
  },
  {
    icon: Smartphone,
    title: "Aktives Lernen",
    text: "Die Kohorte lernt mobil mit Karteikarten, Quiz und einer Simulation im Stil der echten Klausur.",
  },
  {
    icon: BarChart3,
    title: "Auswertung",
    text: "Sie sehen Aktivierung und Nutzung — anonymisiert und aggregiert.",
  },
];

const AUDIENCES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Landmark,
    title: "Für die Hochschule",
    text: "Bessere Prüfungsvorbereitung ohne Mehraufwand fürs Lehrpersonal — plus Sichtbarkeit, wie Studierende lernen.",
  },
  {
    icon: Presentation,
    title: "Für Lehrende",
    text: "Aus vorhandenen Folien wird aktives Lernmaterial. Kein Zusatzaufwand, volle Kontrolle per Freigabe.",
  },
  {
    icon: GraduationCap,
    title: "Für Studierende",
    text: "In zwei Minuten vom Folienberg zu „ich weiß, wo ich anfange“ — mobil und aktiv.",
  },
];

const PILOT_ITEMS = [
  "1 Modul · bis zu 100 Teilnehmer · 6–8 Wochen",
  "Zentrales Lernpaket aus Ihren Unterlagen",
  "Freigabe durch Lehrende",
  "Nutzungsauswertung + Abschlussreport",
  "Definierter Support während der Laufzeit",
];

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Wie steht es um den Datenschutz?",
    a: "Verarbeitung nach DSGVO, Auftragsverarbeitungsvertrag (AVV), transparente Unterauftragsverarbeiter und ein klares Löschkonzept. Details klären wir vor dem Piloten mit Ihrer IT/Ihrem Datenschutz.",
  },
  {
    q: "Wie viel Aufwand haben unsere Lehrenden?",
    a: "Minimal: Unterlagen hochladen und das Lernpaket freigeben. Den Rest übernimmt Lernly.",
  },
  {
    q: "Müssen wir etwas integrieren?",
    a: "Für den Piloten nicht. SSO oder eine Moodle-/LTI-Anbindung sind später möglich.",
  },
  {
    q: "Wem gehören die Inhalte?",
    a: "Ihr Material bleibt Ihres. Sie behalten die Rechte an Unterlagen und freigegebenen Lernpaketen.",
  },
];

function PrimaryCta({ className }: { className?: string }) {
  return (
    <a
      href={CTA_URL}
      {...(CTA_IS_EXTERNAL
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      className={
        "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-[15px] font-semibold text-white transition hover:opacity-90 " +
        (className ?? "")
      }
      style={{ background: "#2B3499" }}
    >
      {CTA_PRIMARY_LABEL}
    </a>
  );
}

export default function HochschulenPage() {
  return (
    <>
      <RevealObserver />

      {/* Slim B2B header — deliberately not the student SiteNav (no signup
          CTAs, no product anchors); one job: logo home + booking CTA. */}
      <nav
        className="sticky top-0 z-40 w-full"
        style={{
          background: "var(--color-ln-nav-bg)",
          backdropFilter: "saturate(1.8) blur(20px)",
          WebkitBackdropFilter: "saturate(1.8) blur(20px)",
        }}
      >
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3 px-6 py-[14px]">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "22px",
              fontWeight: 700,
              letterSpacing: "-0.7px",
              lineHeight: 1,
            }}
          >
            <LernlyLogo size={36} alt="" />
            <span>Lernly</span>
            <span
              className="ml-1 hidden rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] sm:inline"
              style={{
                borderColor: "rgba(255,255,255,0.14)",
                color: "rgba(255,255,255,0.6)",
                fontFamily: "var(--font-inter)",
                letterSpacing: "0.14em",
              }}
            >
              Für Hochschulen
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <Link
              href="/"
              className="hidden text-[14px] font-medium text-white transition hover:opacity-70 md:inline"
            >
              Für Studierende
            </Link>
            <a
              href={CTA_URL}
              {...(CTA_IS_EXTERNAL
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="rounded-lg px-4 py-2 text-[13.5px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "#2B3499" }}
            >
              Gespräch buchen
            </a>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* ===== Hero ===== */}
        <section className="relative overflow-hidden px-6 pb-16 pt-16 md:pb-24 md:pt-24">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[460px] w-[640px] -translate-x-1/2 -translate-y-1/3 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(91,184,216,0.16), transparent 70%)",
            }}
          />
          <div className="relative mx-auto max-w-[900px] text-center">
            <p
              className="ln-reveal mb-5 text-[12px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "var(--color-ln-cyan)" }}
            >
              Lernly für Hochschulen
            </p>
            <h1
              className="ln-reveal font-bold leading-[1.06] tracking-[-1.6px] text-white"
              style={{ fontSize: "clamp(32px, 5.2vw, 58px)" }}
            >
              Aus Ihren Kursunterlagen werden aktive, prüfungsnahe Lernpakete —{" "}
              <span
                className="lernly-italic"
                style={{ color: "var(--color-ln-ink-soft)" }}
              >
                für ganze Kohorten.
              </span>
            </h1>
            <p
              className="ln-reveal mx-auto mt-6 max-w-[660px] text-[16px] leading-relaxed md:text-[17px]"
              style={{ color: "rgba(255,255,255,0.66)" }}
            >
              Lernly verwandelt die offiziellen Unterlagen eines Moduls in
              Karteikarten, Quiz und Prüfungssimulationen. Freigegeben von
              Ihren Lehrenden, genutzt von Ihren Studierenden, messbar für Sie.
            </p>
            <div className="ln-reveal mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PrimaryCta className="w-full sm:w-auto" />
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-white/[0.08] sm:w-auto"
                style={{
                  borderColor: "rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                2-Minuten-Demo ansehen
              </Link>
            </div>
            <p
              className="ln-reveal mt-5 text-[13px]"
              style={{ color: "var(--color-ln-mute)" }}
            >
              Auf Basis des Lernly-Produkts, mit dem Studierende bereits lernen.
            </p>
          </div>
        </section>

        {/* ===== Problem ===== */}
        <section className="px-6 py-14 md:py-20">
          <SectionHeading
            eyebrow="Das Problem"
            boldPart="Studierende scheitern nicht am Material —"
            italicPart="an der Menge."
            sub="Hunderte Folien, kein Einstieg, passives Lesen kurz vor der Klausur. Die Folge: schwächere Ergebnisse, mehr Betreuungsaufwand, unzufriedene Kohorten. Generische KI wie ChatGPT nutzen Ihre Studierenden längst — nur außerhalb Ihrer Kontrolle und ohne Bezug zu Ihrem offiziellen Material."
          />
        </section>

        {/* ===== How it works (4 steps) ===== */}
        <section className="px-6 py-14 md:py-20">
          <SectionHeading
            eyebrow="Der Ablauf"
            boldPart="So funktioniert Lernly"
            italicPart="für Ihre Programme"
          />
          <div className="ln-stagger mx-auto mt-12 grid max-w-[1200px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div key={step.title} className="ln-reveal ln-glass-card p-6">
                <div className="flex items-center justify-between">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ background: "rgba(91,184,216,0.12)" }}
                  >
                    <step.icon
                      size={20}
                      strokeWidth={2}
                      aria-hidden
                      style={{ color: "var(--color-ln-cyan)" }}
                    />
                  </span>
                  <span
                    className="text-[12px] font-semibold tracking-[0.14em]"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    0{i + 1}
                  </span>
                </div>
                <h3
                  className="mt-4 text-[17px] font-semibold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {step.title}
                </h3>
                <p
                  className="mt-2 text-[14px] leading-[1.6]"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Audiences (3 cards) ===== */}
        <section className="px-6 py-14 md:py-20">
          <SectionHeading
            eyebrow="Für alle Beteiligten"
            boldPart="Ein Werkzeug,"
            italicPart="drei Perspektiven."
          />
          <div className="ln-stagger mx-auto mt-12 grid max-w-[1100px] grid-cols-1 gap-4 md:grid-cols-3">
            {AUDIENCES.map((card) => (
              <div key={card.title} className="ln-reveal ln-glass-card p-6">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: "rgba(91,184,216,0.12)" }}
                >
                  <card.icon
                    size={20}
                    strokeWidth={2}
                    aria-hidden
                    style={{ color: "var(--color-ln-cyan)" }}
                  />
                </span>
                <h3
                  className="mt-4 text-[17px] font-semibold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {card.title}
                </h3>
                <p
                  className="mt-2 text-[14px] leading-[1.6]"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  {card.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Pilot ===== */}
        <section className="px-6 py-14 md:py-20">
          <SectionHeading
            eyebrow="Der Lernly-Pilot"
            boldPart="Ein betreuter Pilot —"
            italicPart="klein anfangen, Wirkung sehen."
          />
          <div className="ln-reveal ln-glass-card mx-auto mt-10 max-w-[720px] overflow-hidden">
            <ul className="flex flex-col px-6 py-2 md:px-8">
              {PILOT_ITEMS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 py-3.5"
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "rgba(124,196,160,0.14)" }}
                  >
                    <Check
                      size={12}
                      strokeWidth={2.5}
                      aria-hidden
                      style={{ color: "var(--color-ln-sage)" }}
                    />
                  </span>
                  <span className="text-[15px] leading-[1.5] text-white/85">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col items-start gap-4 px-6 pb-6 pt-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
              <p className="text-[14px] leading-[1.6]" style={{ color: "rgba(255,255,255,0.6)" }}>
                <span className="font-semibold text-white">
                  Pilot ab 1.500 €.
                </span>{" "}
                Bezahlt — damit es ein echtes gemeinsames Projekt ist.
              </p>
              <PrimaryCta className="w-full shrink-0 sm:w-auto" />
            </div>
          </div>
        </section>

        {/* ===== What Lernly is not ===== */}
        <section className="px-6 py-10 md:py-14">
          <div
            className="ln-reveal mx-auto flex max-w-[820px] items-start gap-4 rounded-2xl border p-6"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <span
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <ShieldCheck
                size={19}
                strokeWidth={2}
                aria-hidden
                style={{ color: "rgba(255,255,255,0.55)" }}
              />
            </span>
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                Was Lernly nicht ist
              </p>
              <p
                className="mt-2 text-[14px] leading-[1.65]"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                Kein Ersatz-LMS. Keine Benotung. Keine Prüfungsentscheidung.
                Lernly ist ein unterstützendes, formatives Lernwerkzeug —
                ergänzend zu Ihren bestehenden Systemen.
              </p>
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="px-6 py-14 md:py-20">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: FAQ_ITEMS.map((item) => ({
                  "@type": "Question",
                  name: item.q,
                  acceptedAnswer: { "@type": "Answer", text: item.a },
                })),
              }),
            }}
          />
          <div className="mx-auto max-w-[820px]">
            <SectionHeading eyebrow="Fragen?" boldPart="Kurz beantwortet." />
            <div className="ln-reveal ln-glass-card mt-10 overflow-hidden">
              {FAQ_ITEMS.map((item, i) => (
                <details
                  key={item.q}
                  className="group"
                  style={{
                    borderBottom:
                      i === FAQ_ITEMS.length - 1
                        ? "none"
                        : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left [&::-webkit-details-marker]:hidden md:px-8">
                    <span className="text-[15px] font-semibold text-white md:text-[16px]">
                      {item.q}
                    </span>
                    <ChevronDown
                      size={18}
                      strokeWidth={2}
                      aria-hidden
                      className="shrink-0 transition group-open:rotate-180"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    />
                  </summary>
                  <div
                    className="px-6 pb-5 text-[14px] leading-[1.6] md:px-8 md:pb-6"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Bottom CTA + lead form ===== */}
        <section id="kontakt" className="relative overflow-hidden px-6 py-16 md:py-24">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(91,184,216,0.14), transparent 70%)",
            }}
          />
          <div className="relative">
            <SectionHeading
              eyebrow="Kontakt"
              boldPart="Passt Lernly zu"
              italicPart="einem Ihrer Module?"
              sub="Buchen Sie ein unverbindliches 15-Minuten-Gespräch — wir schauen gemeinsam auf ein konkretes Modul."
            />
            <div className="ln-reveal mt-8 flex justify-center">
              <PrimaryCta />
            </div>
            <div
              className="ln-reveal mx-auto mt-10 flex max-w-[560px] items-center gap-4"
              aria-hidden
            >
              <span className="h-px flex-1" style={{ background: "rgba(255,255,255,0.1)" }} />
              <span className="text-[12px] uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.4)" }}>
                oder direkt anfragen
              </span>
              <span className="h-px flex-1" style={{ background: "rgba(255,255,255,0.1)" }} />
            </div>
            <div className="ln-reveal ln-glass-card relative mx-auto mt-8 max-w-[560px] p-6 md:p-8">
              <LeadForm />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
