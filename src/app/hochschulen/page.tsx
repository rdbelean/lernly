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
  type LucideIcon,
} from "lucide-react";
import LernlyLogo from "@/components/LernlyLogo";
import SiteFooter from "@/components/SiteFooter";
import SectionHeading from "@/components/landing/SectionHeading";
import PackHubMockup from "@/components/landing/mockups/PackHubMockup";
import UploadMaskMockup from "@/components/landing/mockups/UploadMaskMockup";
import QuizResultMockup from "@/components/landing/mockups/QuizResultMockup";
import TopicConceptMockup from "@/components/landing/mockups/TopicConceptMockup";
import LeadForm from "./LeadForm";
import RevealObserver from "./RevealObserver";
import FlashcardMockupLazy from "./FlashcardMockupLazy";
import CohortReportMockup from "./CohortReportMockup";
import PilotTimeline from "./PilotTimeline";
import CalBooking from "./CalBooking";

// =========================================================================
// /hochschulen — B2B page for universities (v2, research-driven rebuild).
// Audience: a single teaching champion (Professor:in, Studiengangsleitung)
// who must defend the pilot internally against three gatekeepers: data
// protection officer, IT, and exam-law concerns. The page therefore shows
// the real product (mockups), cites real numbers with sources, and answers
// the compliance checklist prominently. Tone: Sie-Form, sober, no hype.
// The B2C landing at "/" stays untouched.
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

const NAV_ANCHORS = [
  { href: "#produkt", label: "Produkt" },
  { href: "#ablauf", label: "Ablauf" },
  { href: "#pilot", label: "Pilot" },
  { href: "#datenschutz", label: "Datenschutz" },
  { href: "#faq", label: "FAQ" },
];

const HERO_FACTS = [
  "Begleiteter Pilot",
  "1 Modul · bis 100 Studierende",
  "6–8 Wochen",
  "ab 1.500 € · Direktauftrag",
];

// Trust bar: verifiable facts instead of a logo wall. Supabase project runs
// in West EU (Ireland); Anthropic's commercial API does not use inputs for
// model training by default.
const TRUST_CHIPS: { icon: LucideIcon; text: string }[] = [
  { icon: ShieldCheck, text: "DSGVO-konform · AVV auf Anfrage" },
  { icon: Server, text: "Datenhaltung in der EU (Irland)" },
  { icon: BrainCircuit, text: "Kein KI-Training mit Ihren Inhalten" },
  { icon: UserCheck, text: "Freigabe durch Ihre Lehrenden" },
];

// Problem section: real, citable numbers — the page must work as a
// forwardable internal decision document, so every stat carries its source.
const PROBLEM_STATS = [
  {
    value: "92 %",
    text: "der Studierenden nutzen KI-Tools im Studium",
    source: "h_da-Längsschnittstudie 2025, n = 4.910",
    href: "https://h-da.de/meldung-einzelansicht/bundesweite-studie-mehr-als-90-der-studierenden-nutzen-ki-basierte-tools-wie-chatgpt-fuers-studium",
  },
  {
    value: "37 %",
    text: "kennen KI-Regeln ihrer Hochschule — mehr nicht",
    source: "Bitkom 2024",
    href: "https://www.bitkom.org/Presse/Presseinformation/So-digital-sind-Deutschlands-Hochschulen",
  },
  {
    value: "28 %",
    text: "brechen das Bachelorstudium ab, in MINT-Fächern über 40 %",
    source: "DZHW Brief 05/2022",
    href: "https://www.dzhw.eu/pdf/pub_brief/dzhw_brief_05_2022_anhang.pdf",
  },
  {
    value: "1 : 58",
    text: "Betreuungsrelation — Studierende je Professur",
    source: "DHV-Barometer 2024",
    href: "https://www.forschung-und-lehre.de/lehre/bundesweite-betreuungsrelation-verbessert-sich-auf-158-7467",
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
      style={{ background: "#2B3499" }}
    >
      {label ?? "15-Min-Gespräch buchen"}
    </a>
  );
}

// Alternating text+mockup module (Particify pattern). Server-renderable;
// mockups are client components and hydrate on their own.
function ProductModule({
  kicker,
  title,
  children,
  mockup,
  reverse = false,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
  mockup: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="ln-reveal grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={reverse ? "lg:order-2" : undefined}>
        <p
          className="text-[12px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "var(--color-ln-cyan)" }}
        >
          {kicker}
        </p>
        <h3
          className="mt-3 text-[24px] font-bold leading-[1.15] tracking-[-0.6px] text-white md:text-[28px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
        <div
          className="mt-4 flex flex-col gap-3 text-[15px] leading-[1.65]"
          style={{ color: "rgba(255,255,255,0.65)" }}
        >
          {children}
        </div>
      </div>
      <div className={reverse ? "lg:order-1" : undefined}>{mockup}</div>
    </div>
  );
}

export default function HochschulenPage() {
  return (
    <>
      <RevealObserver />

      {/* Slim B2B header — logo home, section anchors, one booking CTA. */}
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
          <div className="flex shrink-0 items-center gap-3 lg:gap-6">
            <div className="hidden items-center gap-6 lg:flex">
              {NAV_ANCHORS.map((a) => (
                <a
                  key={a.href}
                  href={a.href}
                  className="text-[14px] font-medium text-white transition hover:opacity-70"
                >
                  {a.label}
                </a>
              ))}
            </div>
            <span
              className="hidden h-5 w-px lg:block"
              style={{ background: "rgba(255,255,255,0.1)" }}
            />
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
        <section className="relative overflow-hidden px-6 pb-14 pt-14 md:pb-20 md:pt-20">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[460px] w-[640px] -translate-x-1/2 -translate-y-1/3 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(91,184,216,0.16), transparent 70%)",
            }}
          />
          <div className="relative mx-auto grid max-w-[1200px] items-start gap-12 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="text-center lg:text-left">
              <p
                className="ln-reveal mb-5 text-[12px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: "var(--color-ln-cyan)" }}
              >
                Lernly für Hochschulen
              </p>
              <h1
                className="ln-reveal font-bold leading-[1.08] tracking-[-1.4px] text-white"
                style={{ fontSize: "clamp(32px, 3.9vw, 48px)" }}
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
                className="ln-reveal mx-auto mt-6 max-w-[660px] text-[16px] leading-relaxed md:text-[17px] lg:mx-0"
                style={{ color: "rgba(255,255,255,0.66)" }}
              >
                Lernly verwandelt die offiziellen Unterlagen eines Moduls in
                Karteikarten, Quiz und Prüfungssimulationen. Freigegeben von
                Ihren Lehrenden, genutzt von Ihren Studierenden, messbar für
                Sie.
              </p>
              <div className="ln-reveal mt-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                {HERO_FACTS.map((f) => (
                  <span
                    key={f}
                    className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium"
                    style={{
                      borderColor: "rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.75)",
                    }}
                  >
                    {f}
                  </span>
                ))}
              </div>
              <div className="ln-reveal mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                <PrimaryCta className="w-full sm:w-auto" />
                <Link
                  href="/#demo"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-white/[0.08] sm:w-auto"
                  style={{
                    borderColor: "rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  Echtes Lernpaket ansehen
                </Link>
              </div>
            </div>
            {/* Booking widget beside the title — desktop only; mobile books
                via the CTA or the embed at the end of the page. */}
            <div className="ln-reveal hidden lg:block">
              <CalBooking namespace="hero" maxHeight={620} />
            </div>
          </div>

          {/* The product itself, immediately — the real PackHub with demo data. */}
          <div className="relative mx-auto mt-14 max-w-[860px]">
            <PackHubMockup />
          </div>
        </section>

        {/* ===== Trust bar (facts instead of logos) ===== */}
        <section className="px-6 pb-4 pt-2">
          <div className="ln-stagger mx-auto grid max-w-[1100px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_CHIPS.map((c) => (
              <div
                key={c.text}
                className="ln-reveal flex items-center gap-3 rounded-xl border px-4 py-3"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <c.icon
                  size={17}
                  strokeWidth={2}
                  aria-hidden
                  className="shrink-0"
                  style={{ color: "var(--color-ln-sage)" }}
                />
                <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {c.text}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Problem ===== */}
        <section className="scroll-mt-24 px-6 py-16 md:py-24">
          <SectionHeading
            eyebrow="Die Ausgangslage"
            boldPart="Studierende scheitern nicht am Material —"
            italicPart="an der Menge."
          />
          <div className="ln-stagger mx-auto mt-12 grid max-w-[1100px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROBLEM_STATS.map((s) => (
              <div key={s.value} className="ln-reveal ln-glass-card flex flex-col p-6">
                <p
                  className="text-[34px] font-bold leading-none text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {s.value}
                </p>
                <p
                  className="mt-3 flex-1 text-[14px] leading-[1.55]"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {s.text}
                </p>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 text-[11.5px] underline-offset-2 transition hover:text-white hover:underline"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Quelle: {s.source}
                </a>
              </div>
            ))}
          </div>
          <div className="ln-reveal mx-auto mt-10 max-w-[760px] text-center">
            <p className="text-[16px] leading-[1.7] md:text-[17px]" style={{ color: "rgba(255,255,255,0.7)" }}>
              Die KI-Nutzung Ihrer Studierenden findet längst statt — nur
              außerhalb Ihrer Kontrolle, ohne Bezug zu Ihren offiziellen
              Materialien und ohne didaktische Qualitätssicherung.{" "}
              <span className="font-semibold text-white">
                Lernly macht daraus einen kontrollierten Prozess: Ihre
                Unterlagen, die Freigabe Ihrer Lehrenden, messbare Nutzung.
              </span>
            </p>
          </div>
        </section>

        {/* ===== Product detail modules ===== */}
        <section id="produkt" className="scroll-mt-24 overflow-hidden px-6 py-16 md:py-24">
          <SectionHeading
            eyebrow="Das Produkt"
            boldPart="Sehen Sie, was Ihre"
            italicPart="Studierenden bekommen."
            sub="Kein Konzept, keine Illustration — das ist die Software, mit der Studierende bereits lernen."
          />

          <div className="mx-auto mt-16 flex max-w-[1200px] flex-col gap-20 md:gap-28">
            {/* A — Upload */}
            <ProductModule
              kicker="Schritt 1 · Ihre Unterlagen"
              title="Aus den offiziellen Unterlagen Ihres Moduls"
              mockup={<UploadMaskMockup />}
            >
              <p>
                Lehrende laden Skripte, Folien oder Reader als PDF hoch — mehr
                Vorbereitung braucht es nicht. In unter zwei Minuten entsteht
                daraus ein vollständiges, interaktives Lernpaket.
              </p>
              <p>
                Optional werten wir eine Altklausur aus: Sie gewichtet die
                Inhalte nach Prüfungsrelevanz, damit die Kohorte dort übt, wo
                es zählt.
              </p>
            </ProductModule>

            {/* B — Approval as PROCESS (no fake UI: this is the pilot workflow) */}
            <ProductModule
              kicker="Schritt 2 · Qualitätssicherung"
              title="Die Qualitätskontrolle bleibt bei Ihren Lehrenden"
              reverse
              mockup={
                <div className="ln-glass-card flex flex-col gap-1 p-6">
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
                          style={{ background: "rgba(255,255,255,0.1)" }}
                        />
                      )}
                      <span
                        className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: "rgba(124,196,160,0.12)" }}
                      >
                        <s.icon size={19} strokeWidth={2} aria-hidden style={{ color: "var(--color-ln-sage)" }} />
                      </span>
                      <div>
                        <p className="text-[15px] font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
                          {s.title}
                        </p>
                        <p className="mt-1 text-[13.5px] leading-[1.55]" style={{ color: "rgba(255,255,255,0.6)" }}>
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
                Inhalt erreicht Ihre Studierenden, den Ihre Lehrenden nicht
                gesehen haben. KI-generierte Inhalte sind als solche
                gekennzeichnet.
              </p>
              <p>
                Der Freigabe-Workflow ist fester Bestandteil des begleiteten
                Piloten — Ihre Lehrenden behalten die didaktische und
                fachliche Hoheit.
              </p>
            </ProductModule>

            {/* C — Active learning / flashcards */}
            <ProductModule
              kicker="Schritt 3 · Aktives Lernen"
              title="Aktives Abrufen statt passivem Lesen — mobil"
              mockup={<FlashcardMockupLazy />}
            >
              <p>
                Karteikarten mit dreistufiger Selbstbewertung setzen den
                Testing-Effekt um. Ein Spaced-Repetition-Loop legt jede Karte
                zum richtigen Zeitpunkt wieder vor — über alle Themen des
                Moduls hinweg.
              </p>
              <p>
                Alles läuft im Browser, ohne Installation — dort, wo Ihre
                Studierenden ohnehin lernen: auf dem Smartphone.
              </p>
            </ProductModule>

            {/* D — Exam practice */}
            <ProductModule
              kicker="Schritt 4 · Prüfungsnähe"
              title="Üben im Stil der echten Klausur"
              reverse
              mockup={<QuizResultMockup />}
            >
              <p>
                Szenariobasierte Multiple-Choice-Fragen mit Erklärungen zu
                jeder Antwortoption, dazu offene Fragen mit Musterlösungen.
                Das Ergebnis zeigt Stärken und Lücken nach Themen aufgeschlüsselt.
              </p>
              <p>
                Studierende wissen dadurch nicht nur, was sie falsch hatten —
                sondern warum, und was sie als Nächstes wiederholen sollten.
              </p>
            </ProductModule>

            {/* E — Cohort report (labeled example rendering) */}
            <ProductModule
              kicker="Schritt 5 · Sichtbarkeit"
              title="Eine Auswertung, die Ihre Gremien verwenden können"
              mockup={<CohortReportMockup />}
            >
              <p>
                Sie sehen Aktivierung, Nutzung und Themen-Schwächen der
                Kohorte — aggregiert und anonymisiert, ohne Auswertung
                einzelner Studierender.
              </p>
              <p>
                Der Abschlussreport des Piloten ist als dokumentierte Maßnahme
                zur Qualität der Lehre direkt anschlussfähig an QM- und
                Akkreditierungsberichte.
              </p>
            </ProductModule>

            {/* F — English programs strip */}
            <ProductModule
              kicker="Internationale Studiengänge"
              title="Auch auf Englisch — automatisch"
              reverse
              mockup={<TopicConceptMockup />}
            >
              <p>
                Englischsprachiges Material ergibt ein englischsprachiges
                Lernpaket — ohne Konfiguration. Auch für internationale
                Kohorten und Austauschstudierende geeignet.
              </p>
            </ProductModule>
          </div>

          {/* Additional real features, compact */}
          <div className="ln-reveal mx-auto mt-20 max-w-[1000px]">
            <p
              className="mb-4 text-center text-[12px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Außerdem in jedem Lernpaket
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {EXTRA_FEATURES.map((f) => (
                <span
                  key={f}
                  className="rounded-full border px-4 py-2 text-[13px]"
                  style={{
                    borderColor: "rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.03)",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Pilot timeline ===== */}
        <section id="ablauf" className="scroll-mt-24 px-6 py-16 md:py-24">
          <SectionHeading
            eyebrow="Der Ablauf"
            boldPart="Acht Wochen,"
            italicPart="klar strukturiert."
            sub="Ein begleiteter Pilot mit definierten Schritten — und einem Gesamtaufwand von unter zwei Stunden für Ihre Lehrenden."
          />
          <div className="mt-14">
            <PilotTimeline />
          </div>
          <div className="ln-reveal mx-auto mt-12 flex max-w-[900px] flex-wrap justify-center gap-2.5">
            {[
              "Gesamtaufwand Lehrende: unter 2 Stunden",
              "Erfolgskriterien definieren wir gemeinsam",
              "Direktauftrag — kein Vergabeverfahren nötig",
            ].map((t) => (
              <span
                key={t}
                className="flex items-center gap-2 rounded-full border px-4 py-2 text-[13px]"
                style={{
                  borderColor: "rgba(124,196,160,0.25)",
                  background: "rgba(124,196,160,0.06)",
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                <Check size={13} strokeWidth={2.5} aria-hidden style={{ color: "var(--color-ln-sage)" }} />
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* ===== Pilot offer ===== */}
        <section id="pilot" className="scroll-mt-24 px-6 py-16 md:py-24">
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
          <p
            className="ln-reveal mx-auto mt-6 max-w-[640px] text-center text-[14px] leading-[1.6]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Lernly wird von Studierenden bereits im Klausuralltag genutzt — für
            Hochschulen öffnen wir jetzt die ersten Pilotplätze.
          </p>
        </section>

        {/* ===== Learning science ===== */}
        <section className="scroll-mt-24 px-6 py-16 md:py-24">
          <SectionHeading
            eyebrow="Didaktische Fundierung"
            boldPart="Keine KI-Spielerei —"
            italicPart="belegte Lernmethoden."
            sub="Lernly setzt um, was die Lernforschung seit Jahrzehnten zeigt: kursbezogen und ohne Zusatzaufwand für Lehrende."
          />
          <div className="ln-stagger mx-auto mt-12 grid max-w-[1100px] grid-cols-1 gap-4 md:grid-cols-3">
            {EVIDENCE.map((e) => (
              <div key={e.method} className="ln-reveal ln-glass-card flex flex-col p-6">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: "rgba(91,184,216,0.12)" }}
                >
                  <e.icon size={20} strokeWidth={2} aria-hidden style={{ color: "var(--color-ln-cyan)" }} />
                </span>
                <h3
                  className="mt-4 text-[17px] font-semibold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {e.method}
                </h3>
                <p className="mt-2 flex-1 text-[14px] leading-[1.6]" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {e.text}
                </p>
                <p className="mt-3 text-[13px] leading-[1.55]" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {e.feature}
                </p>
                <p className="mt-3 text-[11.5px] italic" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {e.citation}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Privacy & security ===== */}
        <section id="datenschutz" className="scroll-mt-24 px-6 py-16 md:py-24">
          <SectionHeading
            eyebrow="Datenschutz & Sicherheit"
            boldPart="Die Antworten, die Ihr"
            italicPart="Datenschutzbeauftragter braucht."
            sub="Leiten Sie diese Sektion gern direkt an Ihre IT oder Ihren Datenschutzbeauftragten weiter — Details klären wir vor dem Piloten gemeinsam."
          />
          <div className="ln-stagger mx-auto mt-12 grid max-w-[1100px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRIVACY_ITEMS.map((p) => (
              <div key={p.title} className="ln-reveal ln-glass-card p-6">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "rgba(124,196,160,0.12)" }}
                >
                  <p.icon size={18} strokeWidth={2} aria-hidden style={{ color: "var(--color-ln-sage)" }} />
                </span>
                <h3
                  className="mt-4 text-[15.5px] font-semibold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {p.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-[1.6]" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {p.text}
                </p>
              </div>
            ))}
          </div>

          {/* What Lernly does NOT do — exam law / AI Act positioning. */}
          <div
            className="ln-reveal mx-auto mt-8 flex max-w-[1100px] items-start gap-4 rounded-2xl border p-6"
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
                Was Lernly nicht tut
              </p>
              <p
                className="mt-2 text-[14px] leading-[1.65]"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                Keine Benotung. Keine Prüfungsentscheidungen. Kein Proctoring.
                Keine Überwachung einzelner Studierender oder Lehrender.
                Lernly ist ein unterstützendes, formatives Lernwerkzeug —
                ergänzend zu Ihren bestehenden Systemen und auch im Sinne des
                EU AI Act bewusst so gestaltet.
              </p>
            </div>
          </div>
        </section>

        {/* ===== Founder ===== */}
        <section className="px-6 py-16 md:py-24">
          <div className="mx-auto max-w-[820px]">
            <SectionHeading
              eyebrow="Über Lernly"
              boldPart="Wer hinter Lernly steht."
            />
            <div className="ln-reveal ln-glass-card mt-10 p-7 md:p-9">
              <p className="text-[15px] leading-[1.75]" style={{ color: "rgba(255,255,255,0.7)" }}>
                Lernly ist während einer echten Klausurphase an der Universität
                Uppsala entstanden — aus dem Folienberg eines einzigen Moduls
                und der Frage, warum Prüfungsvorbereitung immer noch passives
                Lesen bedeutet. Heute wird Lernly von Studierenden im
                Klausuralltag genutzt und vom Studio Belerate
                weiterentwickelt.
              </p>
              <p className="mt-4 text-[15px] leading-[1.75]" style={{ color: "rgba(255,255,255,0.7)" }}>
                Im Pilotprojekt sprechen Sie direkt mit dem Gründer — kein
                Vertrieb, keine Warteschleife, kurze Wege bei Fragen Ihrer IT
                oder Ihres Datenschutzbeauftragten.
              </p>
              <a
                href="mailto:info@lernly-app.de"
                className="mt-6 inline-flex items-center gap-2 text-[14px] font-medium text-white underline-offset-4 transition hover:underline"
              >
                <Mail size={15} strokeWidth={2} aria-hidden style={{ color: "var(--color-ln-cyan)" }} />
                info@lernly-app.de
              </a>
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section id="faq" className="scroll-mt-24 px-6 py-16 md:py-24">
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
            <SectionHeading
              eyebrow="FAQ"
              boldPart="Die harten Fragen —"
              italicPart="offen beantwortet."
            />
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

        {/* ===== Contact + lead form ===== */}
        <section id="kontakt" className="relative scroll-mt-24 overflow-hidden px-6 py-16 md:py-24">
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
              sub="Buchen Sie direkt ein unverbindliches 15-Minuten-Gespräch — wir schauen gemeinsam auf ein konkretes Modul."
            />
            <div className="ln-reveal relative mx-auto mt-10 max-w-[900px]">
              <CalBooking namespace="kontakt" maxHeight={640} />
            </div>
            <div
              className="ln-reveal mx-auto mt-12 flex max-w-[560px] items-center gap-4"
              aria-hidden
            >
              <span className="h-px flex-1" style={{ background: "rgba(255,255,255,0.1)" }} />
              <span className="text-[12px] uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.4)" }}>
                oder schreiben Sie uns
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
