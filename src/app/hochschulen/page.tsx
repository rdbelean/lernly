import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Server,
  BrainCircuit,
  UserCheck,
  Sparkles,
  SearchCheck,
  CheckCircle,
  Check,
  FileText,
  Lock,
  Trash2,
  ListChecks,
  FlaskConical,
  Repeat,
  Mail,
  ChevronDown,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import LernlyLogo from "@/components/LernlyLogo";
import UploadMaskMockup from "@/components/landing/mockups/UploadMaskMockup";
import QuizResultMockup from "@/components/landing/mockups/QuizResultMockup";
import TopicConceptMockup from "@/components/landing/mockups/TopicConceptMockup";
import { SITE_URL } from "@/lib/site";
import LeadForm from "./LeadForm";
import RevealObserver from "./RevealObserver";
import FlashcardMockupLazy from "./FlashcardMockupLazy";
import CohortReportMockup from "./CohortReportMockup";
import PilotTimeline from "./PilotTimeline";
import CalBooking from "./CalBooking";
import HsSectionHeading from "./HsSectionHeading";
import HsFooter from "./HsFooter";
import { SegmentProvider, SegmentTabs, Seg } from "./segment";
import "./hochschulen.css";

// =========================================================================
// /hochschulen — B2B page, v3 "Academic Editorial" (light, trust-first).
// Audience: teaching champions at universities AND continuing-education /
// exam-prep providers. Content substance (stats+sources, learning-science
// citations, GDPR depth, pilot mechanics, FAQ) is carried over from v2
// unchanged — v3 changes the visual system, adds conversion blocks (ROI
// band, segment switch, early-partner, founder) and SEO polish.
// The dark B2C landing at "/" stays untouched.
// =========================================================================

const PAGE_TITLE =
  "Lernly für Hochschulen — prüfungsnahe Lernpakete für ganze Kohorten";
const PAGE_DESCRIPTION =
  "Lernly verwandelt die offiziellen Unterlagen eines Moduls in Karteikarten, Quiz und Prüfungssimulationen — freigegeben von Lehrenden, genutzt von Studierenden, messbar für Ihre Hochschule. Begleiteter Pilot: 1 Modul, bis 100 Studierende, ab 1.500 €.";

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

// Primary CTA target: the Cal.com booking page. Overridable via env var
// (all Vercel scopes) — the hardcoded default keeps it working everywhere.
const CTA_URL =
  process.env.NEXT_PUBLIC_HOCHSCHULEN_CTA_URL ||
  "https://cal.com/lernly/hochschulen";
const CTA_IS_EXTERNAL = CTA_URL.startsWith("http");

// Founder block — Daniel fills these in; photo/LinkedIn render only when set.
const FOUNDER_NAME = "Daniel Belean";
const FOUNDER_PHOTO: string | null = null; // e.g. "/daniel.jpg" once uploaded
const FOUNDER_LINKEDIN: string | null = null; // personal LinkedIn profile URL

const NAV_ANCHORS = [
  { href: "#produkt", label: "Produkt" },
  { href: "#ablauf", label: "Ablauf" },
  { href: "#pilot", label: "Pilot" },
  { href: "#datenschutz", label: "Datenschutz" },
  { href: "#faq", label: "FAQ" },
];

// Trust bar: verifiable facts instead of a logo wall (wording unchanged;
// details live in the Datenschutz section + FAQ).
const TRUST_CHIPS: { icon: LucideIcon; text: string }[] = [
  { icon: ShieldCheck, text: "DSGVO-konform · AVV auf Anfrage" },
  { icon: Server, text: "Datenhaltung in der EU (Irland)" },
  { icon: BrainCircuit, text: "Kein KI-Training mit Ihren Inhalten" },
  { icon: UserCheck, text: "Freigabe durch Ihre Lehrenden" },
];

// Problem section: real, citable numbers — the page must work as a
// forwardable internal decision document, so every stat carries its source.
// The 28% dropout stat leads (strongest number, ties to the ROI band above).
const PROBLEM_STATS = [
  {
    value: "28 %",
    text: "brechen das Bachelorstudium ab, in MINT-Fächern über 40 %",
    source: "DZHW Brief 05/2022",
    href: "https://www.dzhw.eu/pdf/pub_brief/dzhw_brief_05_2022_anhang.pdf",
    highlight: true,
  },
  {
    value: "92 %",
    text: "der Studierenden nutzen KI-Tools im Studium",
    source: "h_da-Längsschnittstudie 2025, n = 4.910",
    href: "https://h-da.de/meldung-einzelansicht/bundesweite-studie-mehr-als-90-der-studierenden-nutzen-ki-basierte-tools-wie-chatgpt-fuers-studium",
    highlight: false,
  },
  {
    value: "37 %",
    text: "kennen KI-Regeln ihrer Hochschule — mehr nicht",
    source: "Bitkom 2024",
    href: "https://www.bitkom.org/Presse/Presseinformation/So-digital-sind-Deutschlands-Hochschulen",
    highlight: false,
  },
  {
    value: "1 : 58",
    text: "Betreuungsrelation — Studierende je Professur",
    source: "DHV-Barometer 2024",
    href: "https://www.forschung-und-lehre.de/lehre/bundesweite-betreuungsrelation-verbessert-sich-auf-158-7467",
    highlight: false,
  },
];

const EXTRA_FEATURES = [
  "Visual Map — das große Ganze eines Moduls",
  "Übersicht nach Prüfungsrelevanz",
  "Offene Fragen mit Musterlösungen",
  "KI-Tutor, begrenzt auf Ihr Material",
  "Klausur-Countdown & Lern-Erinnerungen",
];

const PILOT_ITEMS = [
  "1 Modul · bis zu 100 Teilnehmer · 6–8 Wochen",
  "Zentrales Lernpaket aus Ihren Unterlagen",
  "Freigabe durch Lehrende",
  "Nutzungsauswertung + Abschlussreport",
  "Definierter Support während der Laufzeit",
];

const EARLY_PARTNER = [
  "Vorzugskonditionen als einer der ersten Pilotpartner",
  "Direkte Betreuung durch den Gründer — keine Warteschleife",
  "Mitgestaltung der Roadmap (z. B. LMS-Anbindung, Report-Inhalte)",
  "Auf Wunsch spätere Sichtbarkeit als Referenzpartner",
];

// Learning-science evidence with real citations — replaces testimonials.
const EVIDENCE: { icon: LucideIcon; method: string; citation: string; text: string; feature: string }[] = [
  {
    icon: FlaskConical,
    method: "Testing-Effekt (Abrufübung)",
    citation: "Roediger & Karpicke (2006), Psychological Science",
    text: "Aktives Abrufen aus dem Gedächtnis führt zu deutlich besserem Langzeitbehalten als wiederholtes Lesen.",
    feature: "In Lernly: Karteikarten mit Selbstbewertung statt passivem Folien-Lesen.",
  },
  {
    icon: ListChecks,
    method: "Practice Testing",
    citation: "Dunlosky et al. (2013), Psychological Science in the Public Interest",
    text: "In der großen Vergleichsstudie zu zehn Lerntechniken erhält Selbsttesten die höchste Wirksamkeitsbewertung.",
    feature: "In Lernly: Übungsklausur im Stil der echten Prüfung, mit Erklärungen je Antwort.",
  },
  {
    icon: Repeat,
    method: "Verteiltes Lernen (Spaced Repetition)",
    citation: "Cepeda et al. (2006), Psychological Bulletin",
    text: "Meta-Analyse über 254 Studien: Zeitlich verteiltes Wiederholen schlägt massiertes Lernen zuverlässig.",
    feature: "In Lernly: Spaced-Repetition-Loop mit Fällig-Warteschlange über alle Themen.",
  },
];

// GDPR spec-sheet rows — wording unchanged from v2 (legal claims frozen).
const PRIVACY_ITEMS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: FileText,
    title: "AVV & technische Maßnahmen",
    text: "Auftragsverarbeitungsvertrag nach Art. 28 DSGVO auf Anfrage — vor dem Piloten klären wir Details direkt mit Ihrem Datenschutzbeauftragten.",
  },
  {
    icon: Server,
    title: "Datenhaltung in der EU",
    text: "Datenbank, Authentifizierung und Datei-Speicher laufen in der EU (Irland). Analytics in der EU-Cloud.",
  },
  {
    icon: BrainCircuit,
    title: "KI-Verarbeitung transparent",
    text: "Generierung über die Anthropic-API (Claude). Ihre Inhalte werden standardmäßig nicht zum Training von KI-Modellen verwendet — weder von Anthropic noch von Lernly.",
  },
  {
    icon: Lock,
    title: "Geschlossener Kohortenzugang",
    text: "Lernpakete sind nur für die eingeschriebene Kohorte zugänglich — keine Veröffentlichung, vereinbar mit § 60a UrhG. Die Materialhoheit bleibt bei Ihren Lehrenden.",
  },
  {
    icon: Trash2,
    title: "Löschung & Export",
    text: "Nach Pilotende werden hochgeladene Unterlagen und Kohortendaten vollständig gelöscht. Export Ihrer Daten jederzeit möglich.",
  },
  {
    icon: ListChecks,
    title: "Dienstleister offengelegt",
    text: "Eingesetzte Dienste transparent: Supabase (EU), Anthropic, Vercel, Resend, Cal.com (Terminbuchung). Vollständige Liste mit Verarbeitungszwecken auf Anfrage.",
  },
];

// FAQ — wording unchanged from v2 (compliance answers frozen).
const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Wie steht es um den Datenschutz?",
    a: "Verarbeitung nach DSGVO mit Auftragsverarbeitungsvertrag (AVV) auf Anfrage, Datenhaltung in der EU (Irland), transparente Dienstleisterliste und ein klares Löschkonzept. Details klären wir vor dem Piloten direkt mit Ihrer IT und Ihrem Datenschutzbeauftragten.",
  },
  {
    q: "Was passiert mit unseren Unterlagen — Stichwort Urheberrecht?",
    a: "Ihr Material bleibt Ihres. Lernpakete sind nur für die eingeschriebene Kohorte zugänglich (kein öffentlicher Zugriff, vereinbar mit § 60a UrhG), werden nicht veröffentlicht und nach Pilotende vollständig gelöscht. Sie behalten die Rechte an Unterlagen und freigegebenen Lernpaketen.",
  },
  {
    q: "Werden unsere Daten zum Training von KI-Modellen verwendet?",
    a: "Nein. Die Generierung läuft über die Anthropic-API, die Eingaben standardmäßig nicht zum Modelltraining verwendet. Lernly trainiert keine eigenen Modelle mit Ihren Inhalten.",
  },
  {
    q: "Kann die KI Fehler machen — Stichwort Halluzination?",
    a: "KI-generierte Inhalte können prinzipbedingt Fehler enthalten. Deshalb generiert Lernly ausschließlich aus Ihren hochgeladenen Unterlagen — und jedes Lernpaket wird vor dem Kohortenzugang von Ihren Lehrenden geprüft und freigegeben. Korrekturen arbeiten wir im Piloten direkt ein.",
  },
  {
    q: "Wie viel Aufwand haben unsere Lehrenden?",
    a: "Unter zwei Stunden über die gesamte Laufzeit: Unterlagen hochladen, Lernpaket prüfen und freigeben, zwei kurze Termine (Kickoff und Abschluss). Den Rest übernimmt Lernly.",
  },
  {
    q: "Brauchen Studierende eigene Konten?",
    a: "Nur eine E-Mail-Adresse (Anmeldung per Magic-Link). Keine Matrikelnummern, keine Installation — Lernly läuft mobil im Browser.",
  },
  {
    q: "Müssen wir etwas integrieren (Moodle, LTI, SSO)?",
    a: "Für den Piloten nicht — er läuft bewusst ohne Eingriff in Ihre IT. Eine Moodle-/LTI-Anbindung und SSO stehen für den Regelbetrieb auf der Roadmap.",
  },
  {
    q: "Wie läuft die Beschaffung?",
    a: "Per Rechnung als Direktauftrag: Der Pilotpreis liegt unterhalb der Direktvergabe-Wertgrenzen aller DACH-Länder — ein Vergabeverfahren ist nicht erforderlich. Pilotvertrag und AVV liefern wir.",
  },
  {
    q: "Was passiert nach dem Piloten?",
    a: "Gemeinsame Auswertung gegen die zu Beginn definierten Erfolgskriterien. Danach entscheiden Sie über Verlängerung oder Ausweitung — es gibt keine automatische Verlängerung und keine Bindung.",
  },
  {
    q: "Bewertet Lernly Studierende oder Prüfungsleistungen?",
    a: "Nein. Lernly vergibt keine Noten, trifft keine Prüfungsentscheidungen und überwacht keine einzelnen Studierenden oder Lehrenden. Es ist ein unterstützendes, formatives Lernwerkzeug — auch im Sinne des EU AI Act bewusst so gestaltet.",
  },
];

function PrimaryCta({ className, label }: { className?: string; label?: string }) {
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
      style={{ background: "var(--hs-accent)" }}
    >
      {label ?? "15-Min-Gespräch buchen"}
    </a>
  );
}

// Distributed mid-page CTA row: one quiet sentence + the primary action.
function CtaRow({ text }: { text: string }) {
  return (
    <div className="hs-reveal mx-auto mt-14 flex max-w-[720px] flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
      <p className="text-[16px] font-medium" style={{ color: "var(--hs-ink)" }}>
        {text}
      </p>
      <PrimaryCta className="w-full shrink-0 sm:w-auto" />
    </div>
  );
}

// Alternating text+mockup module. Mockups are DOM renderings of the real
// app, so the wrapper carries the descriptive label (in lieu of alt text).
function ProductModule({
  kicker,
  title,
  children,
  mockup,
  mockupLabel,
  reverse = false,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
  mockup: React.ReactNode;
  mockupLabel: string;
  reverse?: boolean;
}) {
  return (
    <div className="hs-reveal grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={reverse ? "lg:order-2" : undefined}>
        <p className="hs-eyebrow">{kicker}</p>
        <h3
          className="mt-3 text-[24px] font-bold leading-[1.18] tracking-[-0.5px] md:text-[27px]"
          style={{ fontFamily: "var(--font-display)", color: "var(--hs-ink)" }}
        >
          {title}
        </h3>
        <div
          className="mt-4 flex flex-col gap-3 text-[15.5px] leading-[1.7]"
          style={{ color: "var(--hs-mute)" }}
        >
          {children}
        </div>
      </div>
      <div
        className={reverse ? "lg:order-1" : undefined}
        role="img"
        aria-label={mockupLabel}
      >
        {mockup}
      </div>
    </div>
  );
}

export default function HochschulenPage() {
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Lernly für Hochschulen — Pilotprogramm",
    serviceType:
      "Digitales Lernwerkzeug für prüfungsnahe Lernpakete und Prüfungsvorbereitung",
    provider: {
      "@type": "Organization",
      name: "Lernly",
      url: SITE_URL,
    },
    areaServed: ["DE", "AT", "CH"],
    url: `${SITE_URL}/hochschulen`,
    offers: {
      "@type": "Offer",
      price: "1500",
      priceCurrency: "EUR",
      description:
        "Begleiteter Pilot: 1 Modul, bis 100 Studierende, 6–8 Wochen — inkl. Lernpaket, Lehrenden-Freigabe, Auswertung und Abschlussreport.",
    },
  };

  return (
    <div className="hs-root flex min-h-screen flex-col">
      <RevealObserver />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />

      {/* Sticky slim nav — light, hairline, one booking CTA. */}
      <nav
        className="sticky top-0 z-40 w-full border-b"
        style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "saturate(1.4) blur(14px)",
          WebkitBackdropFilter: "saturate(1.4) blur(14px)",
          borderColor: "var(--hs-line)",
        }}
      >
        <div className="mx-auto flex w-full max-w-[1160px] items-center justify-between gap-3 px-6 py-3">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "21px",
              fontWeight: 700,
              letterSpacing: "-0.6px",
              lineHeight: 1,
              color: "var(--hs-ink)",
            }}
          >
            <LernlyLogo size={34} alt="" />
            <span>Lernly</span>
            <span
              className="ml-1 hidden rounded-full border px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] sm:inline"
              style={{
                borderColor: "var(--hs-line)",
                color: "var(--hs-mute)",
                fontFamily: "var(--font-inter)",
              }}
            >
              Für Hochschulen
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-3 lg:gap-6">
            <div className="hidden items-center gap-6 lg:flex">
              {NAV_ANCHORS.map((a) => (
                <a
                  key={a.href}
                  href={a.href}
                  className="text-[14px] font-medium transition hover:text-[color:var(--hs-accent)]"
                  style={{ color: "var(--hs-ink)" }}
                >
                  {a.label}
                </a>
              ))}
            </div>
            <span
              className="hidden h-5 w-px lg:block"
              style={{ background: "var(--hs-line)" }}
            />
            <a
              href={CTA_URL}
              {...(CTA_IS_EXTERNAL
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="rounded-lg px-4 py-2 text-[13.5px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "var(--hs-accent)" }}
            >
              Gespräch buchen
            </a>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <SegmentProvider>
          {/* ===== Hero ===== */}
          <section className="px-6 pb-16 pt-12 md:pb-20 md:pt-16">
            <div className="mx-auto grid max-w-[1160px] items-start gap-12 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div className="text-center lg:text-left">
                <div className="mb-6 flex justify-center lg:justify-start">
                  <SegmentTabs />
                </div>
                <h1
                  className="font-bold leading-[1.1] tracking-[-1.2px]"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(31px, 3.7vw, 46px)",
                    color: "var(--hs-ink)",
                  }}
                >
                  <Seg
                    h={
                      <>
                        Aus Ihren Kursunterlagen werden aktive, prüfungsnahe
                        Lernpakete — für ganze Kohorten.
                      </>
                    }
                    a={
                      <>
                        Aus Ihren Kursunterlagen werden aktive, prüfungsnahe
                        Lernpakete — für alle Ihre Teilnehmer.
                      </>
                    }
                  />
                </h1>
                <p
                  className="mx-auto mt-5 max-w-[620px] text-[16.5px] leading-[1.7] lg:mx-0"
                  style={{ color: "var(--hs-mute)" }}
                >
                  <Seg
                    h="Lernly verwandelt die offiziellen Unterlagen eines Moduls in Karteikarten, Quiz und Prüfungssimulationen. Freigegeben von Ihren Lehrenden, genutzt von Ihren Studierenden, messbar für Sie."
                    a="Lernly verwandelt Ihre Kursunterlagen in Karteikarten, Quiz und Prüfungssimulationen. Freigegeben von Ihren Dozenten, genutzt von Ihren Teilnehmern, messbar für Sie."
                  />
                </p>
                {/* One-sentence pilot summary for skimmers. */}
                <p
                  className="mx-auto mt-4 max-w-[620px] text-[14.5px] leading-[1.65] lg:mx-0"
                  style={{ color: "var(--hs-ink)" }}
                >
                  <span className="font-semibold">Begleiteter Pilot:</span>{" "}
                  <Seg
                    h="1 Modul, bis 100 Studierende, 6–8 Wochen, ab 1.500 € — per Direktauftrag, ohne Vergabeverfahren."
                    a="1 Kurs, bis 100 Teilnehmer, 6–8 Wochen, ab 1.500 € — eine einfache Rechnung, kein Beschaffungsprozess."
                  />
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                  <PrimaryCta className="w-full sm:w-auto" />
                  <a
                    href="/#demo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-6 py-3 text-[15px] font-semibold transition hover:border-[color:var(--hs-accent)] sm:w-auto"
                    style={{
                      borderColor: "var(--hs-line)",
                      color: "var(--hs-ink)",
                      background: "#fff",
                    }}
                  >
                    Studierenden-Ansicht öffnen
                    <ExternalLink size={15} strokeWidth={2} aria-hidden style={{ color: "var(--hs-mute)" }} />
                  </a>
                </div>
              </div>
              {/* Booking widget beside the title — desktop only; mobile books
                  via the CTA or the embed at the end of the page. */}
              <div className="hidden lg:block">
                <CalBooking namespace="hero" maxHeight={491} compact lazy />
              </div>
            </div>
          </section>

          {/* ===== ROI / business case band ===== */}
          <section className="hs-soft-bg border-y px-6 py-12 md:py-14" style={{ borderColor: "var(--hs-line)" }}>
            <div className="hs-reveal mx-auto max-w-[860px] text-center">
              <p className="hs-eyebrow mb-4">Der Business-Case</p>
              <p
                className="text-[19px] font-medium leading-[1.6] md:text-[21px]"
                style={{ color: "var(--hs-ink)" }}
              >
                <Seg
                  h={
                    <>
                      Ein Studienabbrecher bedeutet fünfstellige entgangene
                      Studiengebühren. Eine höhere Bestehensquote ist Ihr
                      Argument für die nächste Kohorte.{" "}
                      <span style={{ color: "var(--hs-accent)" }}>
                        Lernly zielt genau darauf — und der Pilot macht es
                        messbar.
                      </span>
                    </>
                  }
                  a={
                    <>
                      Ihre Bestehensquote ist Ihr Marketing.{" "}
                      <span style={{ color: "var(--hs-accent)" }}>
                        Wir heben sie — für weniger als den Deckungsbeitrag
                        eines einzigen zusätzlichen Teilnehmers.
                      </span>
                    </>
                  }
                />
              </p>
            </div>
          </section>
        </SegmentProvider>

        {/* ===== Trust bar ===== */}
        <section className="px-6 pb-4 pt-10">
          <div className="ln-stagger mx-auto grid max-w-[1100px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_CHIPS.map((c) => (
              <div
                key={c.text}
                className="hs-reveal flex items-center gap-3 rounded-xl border px-4 py-3"
                style={{ borderColor: "var(--hs-line)", background: "#fff" }}
              >
                <c.icon
                  size={17}
                  strokeWidth={2}
                  aria-hidden
                  className="shrink-0"
                  style={{ color: "var(--hs-accent)" }}
                />
                <span className="text-[13px] font-medium" style={{ color: "var(--hs-ink)" }}>
                  {c.text}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Problem stats ===== */}
        <section className="px-6 py-16 md:py-24">
          <HsSectionHeading
            eyebrow="Die Ausgangslage"
            title={
              <>
                Studierende scheitern nicht am Material —{" "}
                <span style={{ color: "var(--hs-mute)" }}>an der Menge.</span>
              </>
            }
          />
          <div className="ln-stagger mx-auto mt-12 grid max-w-[1100px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROBLEM_STATS.map((s) => (
              <div
                key={s.value}
                className="hs-reveal hs-card flex flex-col p-6"
                style={
                  s.highlight
                    ? {
                        background: "var(--hs-accent-soft)",
                        borderColor: "rgba(43,52,153,0.25)",
                      }
                    : undefined
                }
              >
                <p
                  className="font-bold leading-none"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: s.highlight ? "44px" : "34px",
                    color: s.highlight ? "var(--hs-accent)" : "var(--hs-ink)",
                  }}
                >
                  {s.value}
                </p>
                <p
                  className="mt-3 flex-1 text-[14px] leading-[1.55]"
                  style={{ color: "var(--hs-ink)" }}
                >
                  {s.text}
                </p>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 text-[11.5px] underline-offset-2 transition hover:underline"
                  style={{ color: "var(--hs-mute)" }}
                >
                  Quelle: {s.source}
                </a>
              </div>
            ))}
          </div>
          <div className="hs-reveal mx-auto mt-10 max-w-[720px] text-center">
            <p className="text-[16px] leading-[1.7] md:text-[17px]" style={{ color: "var(--hs-mute)" }}>
              Die KI-Nutzung Ihrer Studierenden findet längst statt — nur
              außerhalb Ihrer Kontrolle und ohne Bezug zu Ihren Materialien.{" "}
              <span className="font-semibold" style={{ color: "var(--hs-ink)" }}>
                Lernly macht daraus einen kontrollierten Prozess: Ihre
                Unterlagen, die Freigabe Ihrer Lehrenden, messbare Nutzung.
              </span>
            </p>
          </div>
        </section>

        {/* ===== Product walkthrough ===== */}
        <section id="produkt" className="hs-soft-bg scroll-mt-20 overflow-hidden border-y px-6 py-16 md:py-24" style={{ borderColor: "var(--hs-line)" }}>
          <HsSectionHeading
            eyebrow="Das Produkt"
            title="Sehen Sie, was Ihre Studierenden bekommen."
            sub="Kein Konzept, keine Illustration — das ist die Software, mit der Studierende bereits lernen."
          />

          <div className="mx-auto mt-16 flex max-w-[1160px] flex-col gap-20 md:gap-24">
            <ProductModule
              kicker="Schritt 1 · Ihre Unterlagen"
              title="Aus den offiziellen Unterlagen Ihres Moduls"
              mockup={<UploadMaskMockup />}
              mockupLabel="Lernly-Oberfläche: Upload-Maske mit PDF-Dateien und Prüfungsformat-Auswahl"
            >
              <p>
                Lehrende laden Skripte oder Folien als PDF hoch. In unter zwei
                Minuten entsteht daraus ein vollständiges, interaktives
                Lernpaket.
              </p>
              <p>
                Optional gewichtet eine Altklausur die Inhalte nach
                Prüfungsrelevanz — die Kohorte übt dort, wo es zählt.
              </p>
            </ProductModule>

            <ProductModule
              kicker="Schritt 2 · Qualitätssicherung"
              title="Die Qualitätskontrolle bleibt bei Ihren Lehrenden"
              reverse
              mockupLabel="Ablaufdarstellung: Lernly generiert, Lehrende prüfen, Kohorte erhält Zugang"
              mockup={
                <div className="hs-card flex flex-col gap-1 p-6">
                  {[
                    {
                      icon: Sparkles,
                      title: "Lernly generiert",
                      text: "Karteikarten, Quiz und Übersicht — ausschließlich aus Ihren Unterlagen.",
                    },
                    {
                      icon: SearchCheck,
                      title: "Lehrende prüfen",
                      text: "Fachliche Kontrolle jedes Inhalts. Korrekturen werden eingearbeitet.",
                    },
                    {
                      icon: CheckCircle,
                      title: "Kohorte erhält Zugang",
                      text: "Erst nach Freigabe — kein Inhalt erreicht Studierende ungeprüft.",
                    },
                  ].map((s, i, arr) => (
                    <div key={s.title} className="relative flex gap-4 pb-5 last:pb-0">
                      {i < arr.length - 1 && (
                        <span
                          aria-hidden
                          className="absolute left-[21px] top-12 h-[calc(100%-28px)] w-px"
                          style={{ background: "var(--hs-line)" }}
                        />
                      )}
                      <span
                        className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: "var(--hs-accent-soft)" }}
                      >
                        <s.icon size={19} strokeWidth={2} aria-hidden style={{ color: "var(--hs-accent)" }} />
                      </span>
                      <div>
                        <p className="text-[15px] font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--hs-ink)" }}>
                          {s.title}
                        </p>
                        <p className="mt-1 text-[13.5px] leading-[1.55]" style={{ color: "var(--hs-mute)" }}>
                          {s.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              }
            >
              <p>
                Das unterscheidet Lernly von der wilden ChatGPT-Nutzung: Kein
                Inhalt erreicht Ihre Studierenden ungeprüft. KI-generierte
                Inhalte sind als solche gekennzeichnet.
              </p>
              <p>
                Der Freigabe-Workflow ist fester Bestandteil des begleiteten
                Piloten — die fachliche Hoheit bleibt bei Ihren Lehrenden.
              </p>
            </ProductModule>

            <ProductModule
              kicker="Schritt 3 · Aktives Lernen"
              title="Aktives Abrufen statt passivem Lesen — mobil"
              mockup={<FlashcardMockupLazy />}
              mockupLabel="Lernly-Oberfläche: Karteikarten-Ansicht mit Frage und Selbstbewertung"
            >
              <p>
                Karteikarten mit Selbstbewertung setzen den Testing-Effekt um.
                Ein Spaced-Repetition-Loop legt jede Karte zum richtigen
                Zeitpunkt wieder vor.
              </p>
              <p>
                Alles läuft im Browser, ohne Installation — dort, wo Ihre
                Studierenden ohnehin lernen: auf dem Smartphone.
              </p>
            </ProductModule>

            <ProductModule
              kicker="Schritt 4 · Prüfungsnähe"
              title="Üben im Stil der echten Klausur"
              reverse
              mockup={<QuizResultMockup />}
              mockupLabel="Lernly-Oberfläche: Quiz-Ergebnis mit Punktzahl und Auswertung nach Themen"
            >
              <p>
                Szenariobasierte Multiple-Choice-Fragen mit Erklärungen zu
                jeder Antwortoption, dazu offene Fragen mit Musterlösungen.
              </p>
              <p>
                Das Ergebnis zeigt Stärken und Lücken nach Themen — Studierende
                wissen, was sie als Nächstes wiederholen sollten.
              </p>
            </ProductModule>

            <ProductModule
              kicker="Schritt 5 · Sichtbarkeit"
              title="Eine Auswertung, die Ihre Gremien verwenden können"
              mockup={<CohortReportMockup />}
              mockupLabel="Beispieldarstellung des Pilot-Abschlussreports: Aktivierung, Themen-Beherrschung und Wochenaktivität der Kohorte"
            >
              <p>
                Aktivierung, Nutzung und Themen-Schwächen der Kohorte —
                aggregiert und anonymisiert, ohne Auswertung einzelner
                Studierender.
              </p>
              <p>
                Der Abschlussreport ist als dokumentierte Maßnahme zur Qualität
                der Lehre direkt anschlussfähig an QM- und
                Akkreditierungsberichte.
              </p>
            </ProductModule>

            <ProductModule
              kicker="Internationale Studiengänge"
              title="Auch auf Englisch — automatisch"
              reverse
              mockup={<TopicConceptMockup />}
              mockupLabel="Lernly-Oberfläche: englischsprachige Konzeptkarte zu Porter's Five Forces"
            >
              <p>
                Englischsprachiges Material ergibt ein englischsprachiges
                Lernpaket — ohne Konfiguration. Geeignet für internationale
                Kohorten und Austauschstudierende.
              </p>
            </ProductModule>
          </div>

          <div className="hs-reveal mx-auto mt-16 max-w-[1000px]">
            <p className="hs-eyebrow mb-4 text-center" style={{ color: "var(--hs-mute)" }}>
              Außerdem in jedem Lernpaket
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {EXTRA_FEATURES.map((f) => (
                <span
                  key={f}
                  className="rounded-full border px-4 py-2 text-[13px]"
                  style={{
                    borderColor: "var(--hs-line)",
                    background: "#fff",
                    color: "var(--hs-mute)",
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          <CtaRow text="Sehen wir uns Ihr Modul gemeinsam an?" />
        </section>

        {/* ===== Academy / continuing-education segment ===== */}
        <section className="px-6 py-16 md:py-20">
          <div className="mx-auto grid max-w-[1100px] items-center gap-10 lg:grid-cols-[1fr_1fr]">
            <div className="hs-reveal">
              <p className="hs-eyebrow">Weiterbildung & Prüfungsvorbereitung</p>
              <h2
                className="mt-3 font-bold leading-[1.15] tracking-[-0.7px]"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(26px, 3vw, 34px)",
                  color: "var(--hs-ink)",
                }}
              >
                Auch für Akademien, Repetitorien und
                Prüfungsvorbereitungs-Anbieter.
              </h2>
              <p className="mt-4 text-[15.5px] leading-[1.7]" style={{ color: "var(--hs-mute)" }}>
                Derselbe Ablauf, Ihre Sprache: Aus Ihren Kursunterlagen werden
                Lernpakete für Ihre Teilnehmer — freigegeben von Ihren
                Dozenten. Der Report zeigt nicht Akkreditierungs-Kennzahlen,
                sondern das, was Ihr Geschäft trägt: Vorbereitung und
                Bestehensquote.
              </p>
              <p
                className="hs-serif mt-5 border-l-2 pl-4 text-[17px] italic leading-[1.6]"
                style={{ borderColor: "var(--hs-accent)", color: "var(--hs-ink)" }}
              >
                Ihre Bestehensquote ist Ihr Marketing. Wir heben sie — für
                weniger als den Deckungsbeitrag eines einzigen zusätzlichen
                Teilnehmers.
              </p>
            </div>
            <div className="hs-reveal flex flex-col gap-3">
              {[
                "IHK- & Kammer-Prüfungsvorbereitung",
                "Repetitorien & Examenskurse",
                "Akademien, Bildungsträger & Fernlehrgänge",
              ].map((t) => (
                <div
                  key={t}
                  className="hs-card flex items-center gap-3 px-5 py-4"
                >
                  <Check size={16} strokeWidth={2.5} aria-hidden style={{ color: "var(--hs-accent)" }} />
                  <span className="text-[15px] font-medium" style={{ color: "var(--hs-ink)" }}>
                    {t}
                  </span>
                </div>
              ))}
              <a
                href={CTA_URL}
                {...(CTA_IS_EXTERNAL ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="hs-link mt-2 text-[14.5px] font-medium"
              >
                Gespräch für Ihren Kurs buchen →
              </a>
            </div>
          </div>
        </section>

        {/* ===== Pilot timeline ===== */}
        <section id="ablauf" className="hs-soft-bg scroll-mt-20 border-y px-6 py-16 md:py-24" style={{ borderColor: "var(--hs-line)" }}>
          <HsSectionHeading
            eyebrow="Der Ablauf"
            title="Acht Wochen, klar strukturiert."
            sub="Ein begleiteter Pilot mit definierten Schritten — und einem Gesamtaufwand von unter zwei Stunden für Ihre Lehrenden."
          />
          <div className="mt-14">
            <PilotTimeline />
          </div>
          <div className="hs-reveal mx-auto mt-12 flex max-w-[900px] flex-wrap justify-center gap-2.5">
            {[
              "Gesamtaufwand Lehrende: unter 2 Stunden",
              "Erfolgskriterien definieren wir gemeinsam",
              "Direktauftrag — kein Vergabeverfahren nötig",
            ].map((t) => (
              <span
                key={t}
                className="flex items-center gap-2 rounded-full border px-4 py-2 text-[13px]"
                style={{
                  borderColor: "var(--hs-line)",
                  background: "#fff",
                  color: "var(--hs-ink)",
                }}
              >
                <Check size={13} strokeWidth={2.5} aria-hidden style={{ color: "var(--hs-accent)" }} />
                {t}
              </span>
            ))}
          </div>
          <CtaRow text="Kickoff in einer Woche möglich — 15 Minuten reichen für den Start." />
        </section>

        {/* ===== Pilot offer + early partner ===== */}
        <section id="pilot" className="scroll-mt-20 px-6 py-16 md:py-24">
          <HsSectionHeading
            eyebrow="Der Lernly-Pilot"
            title="Ein betreuter Pilot — klein anfangen, Wirkung sehen."
          />
          <div className="hs-reveal hs-card mx-auto mt-10 max-w-[720px] overflow-hidden">
            <ul className="flex flex-col px-6 py-2 md:px-8">
              {PILOT_ITEMS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 border-b py-3.5 last:border-b-0"
                  style={{ borderColor: "var(--hs-line)" }}
                >
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "var(--hs-accent-soft)" }}
                  >
                    <Check
                      size={12}
                      strokeWidth={2.5}
                      aria-hidden
                      style={{ color: "var(--hs-accent)" }}
                    />
                  </span>
                  <span className="text-[15px] leading-[1.5]" style={{ color: "var(--hs-ink)" }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <div
              className="flex flex-col items-start gap-4 border-t px-6 pb-6 pt-4 sm:flex-row sm:items-center sm:justify-between md:px-8"
              style={{ borderColor: "var(--hs-line)", background: "var(--hs-soft)" }}
            >
              <p className="text-[14px] leading-[1.6]" style={{ color: "var(--hs-mute)" }}>
                <span className="font-semibold" style={{ color: "var(--hs-ink)" }}>
                  Pilot ab 1.500 €.
                </span>{" "}
                Bezahlt — damit es ein echtes gemeinsames Projekt ist.
              </p>
              <PrimaryCta className="w-full shrink-0 sm:w-auto" />
            </div>
          </div>

          {/* Early-partner advantages — turns missing social proof into an offer. */}
          <div className="hs-reveal mx-auto mt-12 max-w-[900px]">
            <p className="hs-eyebrow mb-5 text-center">Früh-Partner-Vorteile</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {EARLY_PARTNER.map((t) => (
                <div key={t} className="flex items-start gap-3 rounded-xl border px-4 py-3.5" style={{ borderColor: "var(--hs-line)" }}>
                  <Check size={15} strokeWidth={2.5} aria-hidden className="mt-0.5 shrink-0" style={{ color: "var(--hs-accent)" }} />
                  <span className="text-[14px] leading-[1.55]" style={{ color: "var(--hs-ink)" }}>
                    {t}
                  </span>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-6 max-w-[640px] text-center text-[14px] leading-[1.6]" style={{ color: "var(--hs-mute)" }}>
              Lernly wird von Studierenden bereits im Klausuralltag genutzt —
              für Hochschulen öffnen wir jetzt die ersten Pilotplätze.
            </p>
          </div>
        </section>

        {/* ===== Learning science ===== */}
        <section className="hs-soft-bg border-y px-6 py-16 md:py-24" style={{ borderColor: "var(--hs-line)" }}>
          <HsSectionHeading
            eyebrow="Didaktische Fundierung"
            title="Keine KI-Spielerei — belegte Lernmethoden."
            sub="Lernly setzt um, was die Lernforschung seit Jahrzehnten zeigt: kursbezogen und ohne Zusatzaufwand für Lehrende."
          />
          <div className="ln-stagger mx-auto mt-12 grid max-w-[1100px] grid-cols-1 gap-4 md:grid-cols-3">
            {EVIDENCE.map((e) => (
              <div key={e.method} className="hs-reveal hs-card flex flex-col p-6">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: "var(--hs-accent-soft)" }}
                >
                  <e.icon size={20} strokeWidth={2} aria-hidden style={{ color: "var(--hs-accent)" }} />
                </span>
                <h3
                  className="mt-4 text-[17px] font-semibold"
                  style={{ fontFamily: "var(--font-display)", color: "var(--hs-ink)" }}
                >
                  {e.method}
                </h3>
                <p className="hs-serif mt-3 flex-1 text-[15px] italic leading-[1.65]" style={{ color: "var(--hs-ink)" }}>
                  „{e.text}“
                </p>
                <p className="mt-3 text-[13px] leading-[1.55]" style={{ color: "var(--hs-mute)" }}>
                  {e.feature}
                </p>
                <p className="mt-3 text-[11.5px]" style={{ color: "var(--hs-mute)" }}>
                  {e.citation}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Privacy spec sheet ===== */}
        <section id="datenschutz" className="scroll-mt-20 px-6 py-16 md:py-24">
          <HsSectionHeading
            eyebrow="Datenschutz & Sicherheit"
            title="Die Antworten, die Ihr Datenschutzbeauftragter braucht."
            sub="Leiten Sie diese Sektion gern direkt an Ihre IT oder Ihren Datenschutzbeauftragten weiter — Details klären wir vor dem Piloten gemeinsam."
          />
          <div className="hs-reveal hs-card mx-auto mt-12 max-w-[900px] overflow-hidden">
            {PRIVACY_ITEMS.map((p, i) => (
              <div
                key={p.title}
                className="grid gap-2 px-6 py-5 sm:grid-cols-[240px_1fr] sm:gap-6 md:px-8"
                style={{
                  borderTop: i === 0 ? "none" : "1px solid var(--hs-line)",
                }}
              >
                <div className="flex items-start gap-3">
                  <p.icon
                    size={16}
                    strokeWidth={2}
                    aria-hidden
                    className="mt-0.5 shrink-0"
                    style={{ color: "var(--hs-accent)" }}
                  />
                  <span className="text-[14px] font-semibold leading-[1.4]" style={{ color: "var(--hs-ink)" }}>
                    {p.title}
                  </span>
                </div>
                <p className="text-[14px] leading-[1.65]" style={{ color: "var(--hs-mute)" }}>
                  {p.text}
                </p>
              </div>
            ))}
            <div
              className="grid gap-2 px-6 py-5 sm:grid-cols-[240px_1fr] sm:gap-6 md:px-8"
              style={{ borderTop: "1px solid var(--hs-line)", background: "var(--hs-soft)" }}
            >
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={16}
                  strokeWidth={2}
                  aria-hidden
                  className="mt-0.5 shrink-0"
                  style={{ color: "var(--hs-accent)" }}
                />
                <span className="text-[14px] font-semibold leading-[1.4]" style={{ color: "var(--hs-ink)" }}>
                  Was Lernly nicht tut
                </span>
              </div>
              <p className="text-[14px] leading-[1.65]" style={{ color: "var(--hs-mute)" }}>
                Keine Benotung. Keine Prüfungsentscheidungen. Kein Proctoring.
                Keine Überwachung einzelner Studierender oder Lehrender.
                Lernly ist ein unterstützendes, formatives Lernwerkzeug —
                ergänzend zu Ihren bestehenden Systemen und auch im Sinne des
                EU AI Act bewusst so gestaltet.
              </p>
            </div>
          </div>
          <CtaRow text="Ihr Datenschutzbeauftragter hat Fragen? Wir antworten direkt." />
        </section>

        {/* ===== Founder ===== */}
        <section className="hs-soft-bg border-y px-6 py-16 md:py-20" style={{ borderColor: "var(--hs-line)" }}>
          <div className="mx-auto max-w-[820px]">
            <HsSectionHeading eyebrow="Über Lernly" title="Wer hinter Lernly steht." />
            <div className="hs-reveal hs-card mt-10 flex flex-col gap-6 p-7 sm:flex-row md:p-9">
              {FOUNDER_PHOTO && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={FOUNDER_PHOTO}
                  alt={`${FOUNDER_NAME}, Gründer von Lernly`}
                  width={96}
                  height={96}
                  loading="lazy"
                  className="h-24 w-24 shrink-0 rounded-2xl object-cover"
                />
              )}
              <div>
                <p className="text-[16px] font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--hs-ink)" }}>
                  {FOUNDER_NAME}
                  <span className="ml-2 text-[13px] font-normal" style={{ color: "var(--hs-mute)" }}>
                    Gründer
                  </span>
                </p>
                <p className="mt-3 text-[15px] leading-[1.75]" style={{ color: "var(--hs-mute)" }}>
                  Lernly ist während einer echten Klausurphase an der
                  Universität Uppsala entstanden — aus dem Folienberg eines
                  einzigen Moduls. Heute wird es von Studierenden im
                  Klausuralltag genutzt und vom Studio Belerate
                  weiterentwickelt.
                </p>
                <p className="mt-3 text-[15px] leading-[1.75]" style={{ color: "var(--hs-mute)" }}>
                  Im Pilotprojekt sprechen Sie direkt mit dem Gründer — kein
                  Vertrieb, kurze Wege bei Fragen Ihrer IT oder Ihres
                  Datenschutzbeauftragten.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-5">
                  <a
                    href="mailto:info@lernly-app.de"
                    className="inline-flex items-center gap-2 text-[14px] font-medium hover:underline"
                    style={{ color: "var(--hs-accent)" }}
                  >
                    <Mail size={15} strokeWidth={2} aria-hidden />
                    info@lernly-app.de
                  </a>
                  {FOUNDER_LINKEDIN && (
                    <a
                      href={FOUNDER_LINKEDIN}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[14px] font-medium hover:underline"
                      style={{ color: "var(--hs-accent)" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
                      </svg>
                      LinkedIn-Profil
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section id="faq" className="scroll-mt-20 px-6 py-16 md:py-24">
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
            <HsSectionHeading eyebrow="FAQ" title="Die harten Fragen — offen beantwortet." />
            <div className="hs-reveal hs-card mt-10 overflow-hidden">
              {FAQ_ITEMS.map((item, i) => (
                <details
                  key={item.q}
                  className="group"
                  style={{
                    borderBottom:
                      i === FAQ_ITEMS.length - 1
                        ? "none"
                        : "1px solid var(--hs-line)",
                  }}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left [&::-webkit-details-marker]:hidden md:px-8">
                    <span className="text-[15px] font-semibold md:text-[16px]" style={{ color: "var(--hs-ink)" }}>
                      {item.q}
                    </span>
                    <ChevronDown
                      size={18}
                      strokeWidth={2}
                      aria-hidden
                      className="shrink-0 transition group-open:rotate-180"
                      style={{ color: "var(--hs-mute)" }}
                    />
                  </summary>
                  <div className="px-6 pb-5 text-[14px] leading-[1.65] md:px-8 md:pb-6" style={{ color: "var(--hs-mute)" }}>
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Contact ===== */}
        <section id="kontakt" className="hs-soft-bg scroll-mt-20 border-t px-6 py-16 md:py-24" style={{ borderColor: "var(--hs-line)" }}>
          <HsSectionHeading
            eyebrow="Kontakt"
            title="Passt Lernly zu einem Ihrer Module?"
            sub="Buchen Sie direkt ein unverbindliches 15-Minuten-Gespräch — wir schauen gemeinsam auf ein konkretes Modul."
          />
          <div className="hs-reveal relative mx-auto mt-10 max-w-[900px]">
            <CalBooking namespace="kontakt" maxHeight={640} lazy />
          </div>
          <div className="hs-reveal mx-auto mt-12 flex max-w-[560px] items-center gap-4" aria-hidden>
            <span className="h-px flex-1" style={{ background: "var(--hs-line)" }} />
            <span className="text-[12px] uppercase tracking-[0.16em]" style={{ color: "var(--hs-mute)" }}>
              oder schreiben Sie uns
            </span>
            <span className="h-px flex-1" style={{ background: "var(--hs-line)" }} />
          </div>
          <div className="hs-reveal hs-card relative mx-auto mt-8 max-w-[560px] p-6 md:p-8">
            <LeadForm />
          </div>
        </section>
      </main>

      <HsFooter />
    </div>
  );
}
