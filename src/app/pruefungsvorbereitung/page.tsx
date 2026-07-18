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
  CalendarClock,
  Target,
  BookOpen,
  Mail,
  ChevronDown,
  ArrowRight,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import LernlyLogo from "@/components/LernlyLogo";
import { SITE_URL } from "@/lib/site";
import RevealObserver from "../hochschulen/RevealObserver";
import CalBooking from "../hochschulen/CalBooking";
import HsSectionHeading from "../hochschulen/HsSectionHeading";
import PvPilotTimeline from "./PvPilotTimeline";
import PvFooter from "./PvFooter";
import {
  PvHeroExamCard,
  PvUploadCard,
  PvFlashcardCard,
  PvMcResultCard,
  PvCohortReport,
} from "./PvMockups";
import "../hochschulen/hochschulen.css";

// =========================================================================
// /pruefungsvorbereitung — B2B page for ONE ICP: owners / leadership of
// private Heilpraktikerschulen. The hero outcome is "mehr Ihrer Schüler
// bestehen den schriftlichen Teil der amtsärztlichen Überprüfung"; the AI is
// only the mechanism. One primary CTA (15-min call). Reuses the /hochschulen
// "Academic Editorial" design system (hochschulen.css, HsSectionHeading,
// CalBooking, RevealObserver) so both B2B routes read as one system.
// The dark B2C landing at "/" and /hochschulen stay untouched.
// =========================================================================

const PAGE_TITLE =
  "Lernly für Heilpraktikerschulen: mehr Schüler bestehen den schriftlichen Teil";
const PAGE_DESCRIPTION =
  "Lernly macht aus dem Kursmaterial Ihrer Heilpraktikerschule einen Trainer im exakten Prüfungsformat der amtsärztlichen Überprüfung: 60 Multiple-Choice-Fragen, Mehrfachauswahl, von Ihren Dozenten freigegeben. Ihre Anwärter üben aktiv, Sie sehen den Fortschritt des Kurses. Begleiteter Pilot bis zum nächsten Prüfungstermin.";

export const metadata: Metadata = {
  title: { absolute: PAGE_TITLE },
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/pruefungsvorbereitung" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    locale: "de_DE",
    type: "website",
    url: "/pruefungsvorbereitung",
    images: [
      {
        url: "/lernly-og.png",
        width: 1200,
        height: 630,
        alt: "Lernly für Heilpraktikerschulen: Trainer im exakten Prüfungsformat",
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
// (set in all Vercel scopes). Defaults to the working /hochschulen booking
// link so it never lands on a dead page. Give it a dedicated event type
// later if you want school-specific scheduling.
const CTA_URL =
  process.env.NEXT_PUBLIC_PRUEFUNG_CTA_URL ||
  "https://cal.com/lernly/hochschulen";
const CTA_IS_EXTERNAL = CTA_URL.startsWith("http");

// Founder block — photo/LinkedIn render only when set.
const FOUNDER_NAME = "Daniel Belean";
const FOUNDER_PHOTO: string | null = "/daniel.jpg";
const FOUNDER_LINKEDIN: string | null = "https://www.linkedin.com/in/rdbelean/";

// Pilot price placeholder — confirm/adjust the number for schools.
const PILOT_PRICE = "1.500 €";

const NAV_ANCHORS = [
  { href: "#problem", label: "Die Hürde" },
  { href: "#produkt", label: "So funktioniert es" },
  { href: "#pilot", label: "Pilot" },
  { href: "#datenschutz", label: "Datenschutz" },
  { href: "#faq", label: "FAQ" },
];

// Trust bar: verifiable facts instead of a logo wall.
const TRUST_CHIPS: { icon: LucideIcon; text: string }[] = [
  { icon: Target, text: "Exaktes Prüfungsformat: 60 MC-Fragen" },
  { icon: UserCheck, text: "Freigabe durch Ihre Dozenten" },
  { icon: Server, text: "Datenhaltung in der EU (Irland)" },
  { icon: BrainCircuit, text: "Kein KI-Training mit Ihren Inhalten" },
];

// Problem cards: the verified exam facts as the concrete numbers. NO
// invented pass-rate or dropout statistics.
const PROBLEM_CARDS: {
  value: string;
  text: string;
  tag: string;
  highlight?: boolean;
}[] = [
  {
    value: "45 / 60",
    text: "richtige Antworten sind Pflicht: 75 % im schriftlichen Teil, sonst durchgefallen.",
    tag: "Amtsärztliche Überprüfung",
    highlight: true,
  },
  {
    value: "5 Optionen",
    text: "je Frage, Mehrfachantworten möglich. Wer nur Skripte liest, hat das Format nie geübt.",
    tag: "Multiple Choice",
  },
  {
    value: "2 Termine",
    text: "pro Jahr, in der Regel März und Oktober. Wer durchfällt, wartet ein halbes Jahr.",
    tag: "Feste Deadline",
  },
  {
    value: "Danach mündlich",
    text: "Fallbeispiele vor dem Amtsarzt. Wer schriftlich scheitert, kommt gar nicht so weit.",
    tag: "Zweiter Teil",
  },
];

const EXTRA_FEATURES = [
  "Offene Fragen mit Musterlösungen",
  "Übersicht nach Prüfungsrelevanz",
  "KI-Tutor, begrenzt auf Ihr Material",
  "Countdown bis zum Prüfungstermin",
  "Lern-Erinnerungen per E-Mail",
];

const OUTCOMES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Target,
    title: "Üben im exakten Prüfungsformat",
    text: "60 Multiple-Choice-Fragen, 5 Antwortoptionen, Mehrfachauswahl, Schwelle 45 von 60. Ihre Anwärter trainieren genau die Prüfung, die vor ihnen liegt, nicht ein generisches Quiz.",
  },
  {
    icon: Repeat,
    title: "Aktives Abrufen statt passivem Lesen",
    text: "Karteikarten mit Selbstbewertung und ein Spaced-Repetition-Loop setzen den Testing-Effekt um, die Lernmethode mit der höchsten belegten Wirksamkeit. Mobil, ohne Mehraufwand für Ihre Dozenten.",
  },
  {
    icon: BookOpen,
    title: "Sichtbarer Fortschritt der Kohorte",
    text: "Sie sehen aggregiert und anonymisiert, welche Themen sitzen und wo der Kurs noch schwächelt, und steuern vor dem Termin gezielt nach. Keine Auswertung einzelner Anwärter.",
  },
];

// Learning-science evidence with real citations — reused verbatim from
// /hochschulen (general findings, not Hochschul-specific).
const EVIDENCE: { icon: LucideIcon; method: string; citation: string; text: string; feature: string }[] = [
  {
    icon: FlaskConical,
    method: "Testing-Effekt (Abrufübung)",
    citation: "Roediger & Karpicke (2006), Psychological Science",
    text: "Aktives Abrufen aus dem Gedächtnis führt zu deutlich besserem Langzeitbehalten als wiederholtes Lesen.",
    feature: "In Lernly: Karteikarten mit Selbstbewertung statt passivem Skript-Lesen.",
  },
  {
    icon: ListChecks,
    method: "Practice Testing",
    citation: "Dunlosky et al. (2013), Psychological Science in the Public Interest",
    text: "In der großen Vergleichsstudie zu zehn Lerntechniken erhält Selbsttesten die höchste Wirksamkeitsbewertung.",
    feature: "In Lernly: Übungsklausur im exakten Prüfungsformat, mit Erklärung je Antwort.",
  },
  {
    icon: Repeat,
    method: "Verteiltes Lernen (Spaced Repetition)",
    citation: "Cepeda et al. (2006), Psychological Bulletin",
    text: "Meta-Analyse über 254 Studien: Zeitlich verteiltes Wiederholen schlägt massiertes Lernen zuverlässig.",
    feature: "In Lernly: Spaced-Repetition-Loop mit Fällig-Warteschlange über alle Themen.",
  },
];

const PILOT_ITEMS = [
  "1 Kurs / Jahrgang, feste Laufzeit bis zum nächsten Prüfungstermin",
  "MC-Trainer im exakten Prüfungsformat aus Ihrem Kursmaterial",
  "Freigabe durch Ihre Dozenten vor dem Kurszugang",
  "Aggregierte Auswertung + Abschlussreport für Ihre Schule",
  "Kein Lock-in, keine automatische Verlängerung",
];

const EARLY_PARTNER = [
  "Vorzugskonditionen als eine der ersten Pilotschulen",
  "Direkte Betreuung durch den Gründer, keine Warteschleife",
  "Mitgestaltung der Roadmap (z. B. Report-Inhalte, Fächer-Zuschnitt)",
  "Auf Wunsch spätere Sichtbarkeit als Referenzschule",
];

// GDPR spec-sheet rows — adapted from /hochschulen (Schüler/Dozenten/Kurs).
const PRIVACY_ITEMS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: FileText,
    title: "AVV & technische Maßnahmen",
    text: "Auftragsverarbeitungsvertrag nach Art. 28 DSGVO auf Anfrage. Vor dem Piloten klären wir die Details direkt mit Ihnen.",
  },
  {
    icon: Server,
    title: "Datenhaltung in der EU",
    text: "Datenbank, Authentifizierung und Datei-Speicher laufen in der EU (Irland). Analytics in der EU-Cloud.",
  },
  {
    icon: BrainCircuit,
    title: "KI-Verarbeitung transparent",
    text: "Generierung über die Anthropic-API (Claude). Ihre Inhalte werden standardmäßig nicht zum Training von KI-Modellen verwendet, weder von Anthropic noch von Lernly.",
  },
  {
    icon: Lock,
    title: "Geschlossener Kurszugang",
    text: "Der Trainer ist nur für die eingeschriebenen Anwärter Ihres Kurses zugänglich, keine Veröffentlichung. Die Materialhoheit bleibt bei Ihren Dozenten.",
  },
  {
    icon: Trash2,
    title: "Löschung & Export",
    text: "Nach Pilotende werden hochgeladenes Material und Kursdaten vollständig gelöscht. Export Ihrer Daten jederzeit möglich.",
  },
  {
    icon: ListChecks,
    title: "Dienstleister offengelegt",
    text: "Eingesetzte Dienste transparent: Supabase (EU), Anthropic, Vercel, Resend, Cal.com (Terminbuchung). Vollständige Liste auf Anfrage.",
  },
];

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Ersetzt das meine Dozenten?",
    a: "Nein, es ergänzt sie. Lernly ist ein formatives Übungswerkzeug für Ihre Anwärter zwischen den Präsenzterminen. Die fachliche Hoheit und die Freigabe jeder Frage bleiben bei Ihren Dozenten. Lernly unterrichtet nicht, es lässt üben, im exakten Prüfungsformat.",
  },
  {
    q: "Wie viel Aufwand haben meine Dozenten?",
    a: "Unter zwei Stunden über die gesamte Laufzeit: Kursmaterial hochladen, den generierten Trainer prüfen und freigeben, dazu zwei kurze Termine (Kickoff und Abschluss). Den Rest übernimmt Lernly.",
  },
  {
    q: "Wie steht es um Datenschutz und Urheberrecht?",
    a: "Verarbeitung nach DSGVO mit Auftragsverarbeitungsvertrag (AVV) auf Anfrage, Datenhaltung in der EU (Irland) und ein klares Löschkonzept. Ihr Material bleibt Ihres: Der Trainer ist nur für die eingeschriebenen Anwärter Ihres Kurses zugänglich, wird nicht veröffentlicht und nach Pilotende vollständig gelöscht. Ihre Inhalte werden nicht zum Training von KI-Modellen verwendet.",
  },
  {
    q: "Kann die KI Fehler machen?",
    a: "KI-generierte Inhalte können prinzipbedingt Fehler enthalten. Deshalb generiert Lernly ausschließlich aus Ihrem hochgeladenen Kursmaterial, nicht aus fremden Quellen. Jede Frage wird vor dem Kurszugang von Ihren Dozenten geprüft und freigegeben. Korrekturen arbeiten wir im Piloten direkt ein.",
  },
  {
    q: "Brauchen die Anwärter eigene Konten?",
    a: "Nur eine E-Mail-Adresse (Anmeldung per Magic-Link). Keine Installation, kein Passwortzwang. Lernly läuft mobil im Browser, genau dort, wo Ihre Anwärter ohnehin lernen.",
  },
  {
    q: "Was kostet der Pilot und wie wird abgerechnet?",
    a: `Der begleitete Pilot startet ab ${PILOT_PRICE} per einfacher Rechnung als Direktauftrag. Er ist bezahlt, damit es ein echtes gemeinsames Projekt ist, klar umrissen und ohne automatische Verlängerung.`,
  },
  {
    q: "Was passiert nach dem Piloten?",
    a: "Gemeinsame Auswertung gegen die zu Beginn definierten Erfolgskriterien, inklusive Bestehensquote Ihres Kurses. Danach entscheiden Sie über Verlängerung oder Ausweitung auf weitere Jahrgänge. Es gibt keine Bindung.",
  },
];

function PrimaryCta({ className, label }: { className?: string; label?: string }) {
  return (
    <a
      href={CTA_URL}
      {...(CTA_IS_EXTERNAL
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      className={"hs-btn-primary " + (className ?? "")}
    >
      {label ?? "15-Min-Gespräch buchen"}
      <ArrowRight size={16} strokeWidth={2.2} aria-hidden />
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

// Alternating text+mockup module (identical treatment to /hochschulen).
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
          className="mt-3 text-[24px] font-bold leading-[1.15] md:text-[27px]"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em", color: "var(--hs-ink)" }}
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

export default function PruefungsvorbereitungPage() {
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Lernly für Heilpraktikerschulen: Pilotprogramm zur Prüfungsvorbereitung",
    serviceType:
      "Digitales Übungswerkzeug im Prüfungsformat der amtsärztlichen Heilpraktiker-Überprüfung",
    provider: {
      "@type": "Organization",
      name: "Lernly",
      url: SITE_URL,
    },
    areaServed: ["DE"],
    url: `${SITE_URL}/pruefungsvorbereitung`,
    offers: {
      "@type": "Offer",
      price: "1500",
      priceCurrency: "EUR",
      description:
        "Begleiteter Pilot: 1 Kurs, Laufzeit bis zum nächsten Prüfungstermin, inkl. MC-Trainer im exakten Prüfungsformat, Dozenten-Freigabe, Auswertung und Abschlussreport.",
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
              Prüfungsvorbereitung
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
              className="rounded-full px-4.5 py-2 text-[13.5px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "var(--hs-accent)", paddingLeft: 18, paddingRight: 18 }}
            >
              Gespräch buchen
            </a>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* ===== Hero ===== */}
        <section className="hs-hero-bg overflow-hidden px-6 pb-16 pt-12 md:pb-20 md:pt-16">
          <div className="mx-auto grid max-w-[1160px] items-start gap-12 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="text-center lg:text-left">
              <p className="mb-6 flex justify-center lg:justify-start">
                <span className="hs-eyebrow-pill">Für private Heilpraktikerschulen</span>
              </p>
              <h1
                className="font-bold"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2.4rem, 4.2vw, 3.4rem)",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.05,
                  color: "var(--hs-ink)",
                }}
              >
                Mehr Ihrer Schüler bestehen{" "}
                <span className="hs-gradient-text">den schriftlichen Teil</span>{" "}
                der amtsärztlichen Überprüfung.
              </h1>
              <p
                className="mx-auto mt-5 max-w-[620px] text-[17px] leading-[1.65] md:text-[18px] lg:mx-0"
                style={{ color: "var(--hs-mute)" }}
              >
                Lernly macht aus dem Kursmaterial Ihrer Schule einen Trainer im
                exakten Prüfungsformat: 60 Multiple-Choice-Fragen mit
                Mehrfachauswahl, freigegeben von Ihren Dozenten. Ihre Anwärter
                üben aktiv, Sie sehen den Fortschritt des Kurses.
              </p>
              {/* One-sentence pilot summary for skimmers. */}
              <p
                className="mx-auto mt-4 max-w-[620px] text-[14.5px] leading-[1.65] lg:mx-0"
                style={{ color: "var(--hs-ink)" }}
              >
                <span className="font-semibold">Begleiteter Pilot:</span>{" "}
                ein Kurs, feste Laufzeit bis zum nächsten Prüfungstermin, ab{" "}
                {PILOT_PRICE}. Per Direktauftrag, ohne Beschaffungsprozess.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                <PrimaryCta className="w-full sm:w-auto" />
                <a href="#produkt" className="hs-btn-secondary w-full sm:w-auto">
                  Echten MC-Trainer ansehen
                  <ExternalLink size={15} strokeWidth={2} aria-hidden style={{ color: "var(--hs-mute)" }} />
                </a>
              </div>
            </div>
            {/* Floating signature product card: the MC question in exact format. */}
            <div className="hs-reveal mx-auto w-full max-w-[440px] lg:mx-0 lg:mt-2">
              <PvHeroExamCard />
            </div>
          </div>
        </section>

        {/* ===== Trust bar ===== */}
        <section className="px-6 pb-4 pt-6">
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

        {/* ===== Problem ===== */}
        <section id="problem" className="scroll-mt-20 px-6 py-16 md:py-24">
          <HsSectionHeading
            eyebrow="Die Hürde"
            title={
              <>
                Der schriftliche Teil entscheidet,{" "}
                <span style={{ color: "var(--hs-mute)" }}>wer weiterkommt.</span>
              </>
            }
            sub="Er ist reines Abruf- und Faktenwissen im Multiple-Choice-Format. Genau die Art Prüfung, auf die passives Skript-Lesen am schlechtesten vorbereitet."
          />
          <div className="ln-stagger mx-auto mt-12 grid max-w-[1100px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROBLEM_CARDS.map((s) => (
              <div
                key={s.value}
                className="hs-reveal hs-card flex flex-col p-6"
                style={
                  s.highlight
                    ? {
                        background: "var(--hs-accent-soft)",
                        borderColor: "rgba(20,33,197,0.25)",
                      }
                    : undefined
                }
              >
                <p
                  className="font-bold leading-none"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: s.highlight ? "40px" : "30px",
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
                <span
                  className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={{ background: "var(--hs-soft)", color: "var(--hs-mute)" }}
                >
                  <CalendarClock size={12} strokeWidth={2} aria-hidden />
                  {s.tag}
                </span>
              </div>
            ))}
          </div>
          <div className="hs-reveal mx-auto mt-10 max-w-[720px] text-center">
            <p className="text-[16px] leading-[1.7] md:text-[17px]" style={{ color: "var(--hs-mute)" }}>
              Ihre Schüler lernen oft passiv: Sie lesen Skripte, statt im
              Prüfungsformat zu üben. Und die Bestehensquote Ihrer Schule ist
              Ihr Marketing.{" "}
              <span className="font-semibold" style={{ color: "var(--hs-ink)" }}>
                Jeder Durchfaller kostet Ruf und Weiterempfehlung, jeder
                Bestehende bringt beides.
              </span>
            </p>
          </div>
        </section>

        {/* ===== Product walkthrough ===== */}
        <section id="produkt" className="hs-soft-bg scroll-mt-20 overflow-hidden border-y px-6 py-16 md:py-24" style={{ borderColor: "var(--hs-line)" }}>
          <HsSectionHeading
            eyebrow="So funktioniert es"
            title="Aus Ihrem Kursmaterial wird ein Trainer im Prüfungsformat."
            sub="Kein Konzept, keine Illustration: Das ist die Software, mit der bereits gelernt wird. Die fachliche Hoheit bleibt bei Ihren Dozenten."
          />

          <div className="mx-auto mt-16 flex max-w-[1160px] flex-col gap-20 md:gap-24">
            <ProductModule
              kicker="Schritt 1 · Ihr Kursmaterial"
              title="Ihre Dozenten laden das Kursmaterial hoch"
              mockup={<PvUploadCard />}
              mockupLabel="Lernly-Oberfläche: Upload-Maske mit Kursmaterial und Auswahl des Multiple-Choice-Prüfungsformats"
            >
              <p>
                Skripte, Folien oder Notizen als PDF hochladen. In unter zwei
                Minuten entsteht daraus ein vollständiges, interaktives
                Übungspaket, ausschließlich aus Ihrem Material.
              </p>
              <p>
                Als Format wählen Ihre Dozenten Multiple Choice: 60 Fragen, 5
                Optionen, Mehrfachauswahl. Genau der schriftliche Teil der
                Überprüfung.
              </p>
            </ProductModule>

            <ProductModule
              kicker="Schritt 2 · Prüfungsformat"
              title="Lernly erzeugt den MC-Trainer, dazu Karteikarten"
              reverse
              mockup={<PvFlashcardCard />}
              mockupLabel="Lernly-Oberfläche: Karteikarten-Ansicht mit Frage und Selbstbewertung"
            >
              <p>
                Übungsklausuren im exakten Prüfungsformat mit Erklärung zu jeder
                Antwortoption, dazu Karteikarten mit Selbstbewertung und ein
                Spaced-Repetition-Loop.
              </p>
              <p>
                Aktives Abrufen statt passivem Lesen, mobil im Browser. Genau
                dort, wo Ihre Anwärter zwischen den Präsenzterminen lernen.
              </p>
            </ProductModule>

            <ProductModule
              kicker="Schritt 3 · Dozenten-Freigabe"
              title="Die fachliche Kontrolle bleibt bei Ihren Dozenten"
              mockupLabel="Ablaufdarstellung: Lernly generiert, Dozenten prüfen, der Kurs erhält Zugang"
              mockup={
                <div className="hs-card flex flex-col gap-1 p-6">
                  {[
                    {
                      icon: Sparkles,
                      title: "Lernly generiert",
                      text: "MC-Fragen, Karteikarten und Übersicht. Ausschließlich aus Ihrem Kursmaterial.",
                    },
                    {
                      icon: SearchCheck,
                      title: "Dozenten prüfen",
                      text: "Fachliche Kontrolle jeder Frage. Korrekturen werden eingearbeitet.",
                    },
                    {
                      icon: CheckCircle,
                      title: "Kurs erhält Zugang",
                      text: "Erst nach Freigabe: Keine Frage erreicht die Anwärter ungeprüft.",
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
                Das unterscheidet Lernly von der wilden ChatGPT-Nutzung Ihrer
                Schüler: Keine Frage erreicht den Kurs ungeprüft. KI-generierte
                Inhalte sind als solche gekennzeichnet.
              </p>
              <p>
                Der Freigabe-Workflow ist fester Bestandteil des begleiteten
                Piloten. Die fachliche Hoheit bleibt zu jedem Zeitpunkt bei
                Ihren Dozenten.
              </p>
            </ProductModule>

            <ProductModule
              kicker="Schritt 4 · Übungsklausur"
              title="Üben und auswerten im Stil der echten Prüfung"
              reverse
              mockup={<PvMcResultCard />}
              mockupLabel="Lernly-Oberfläche: Ergebnis einer Übungsklausur mit Punktzahl gegen die Schwelle und Auswertung nach Themen"
            >
              <p>
                Jede Übungsklausur zählt gegen die echte Schwelle: 45 von 60.
                Anwärter sehen sofort, ob sie bestanden hätten, und bei welcher
                Antwort sie danebenlagen.
              </p>
              <p>
                Das Ergebnis zeigt Stärken und Lücken nach Themen. Jeder weiß,
                was vor dem Termin noch wiederholt werden muss.
              </p>
            </ProductModule>

            <ProductModule
              kicker="Schritt 5 · Ihre Sicht"
              title="Der Kurs übt, Sie sehen den Fortschritt"
              mockup={<PvCohortReport />}
              mockupLabel="Beispieldarstellung der Kurs-Auswertung: Aktivierung, Themen-Beherrschung und Aktivität bis zum Prüfungstermin"
            >
              <p>
                Aktivierung, Nutzung und Themen-Schwächen des Kurses, aggregiert
                und anonymisiert, ohne Auswertung einzelner Anwärter.
              </p>
              <p>
                So sehen Sie schon vor dem Termin, wo Ihr Kurs steht, und können
                gezielt gegensteuern, wo es noch hakt.
              </p>
            </ProductModule>
          </div>

          <div className="hs-reveal mx-auto mt-16 max-w-[1000px]">
            <p className="hs-eyebrow mb-4 text-center" style={{ color: "var(--hs-mute)" }}>
              Außerdem in jedem Übungspaket
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

          <CtaRow text="Sehen wir uns einen Ihrer Kurse gemeinsam an?" />
        </section>

        {/* ===== Outcomes ===== */}
        <section className="px-6 py-16 md:py-24">
          <HsSectionHeading
            eyebrow="Was Ihre Schule davon hat"
            title="Nicht mehr Technik. Mehr bestandene Prüfungen."
          />
          <div className="ln-stagger mx-auto mt-12 grid max-w-[1100px] grid-cols-1 gap-4 md:grid-cols-3">
            {OUTCOMES.map((v) => (
              <div key={v.title} className="hs-reveal hs-card flex flex-col p-6">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: "var(--hs-accent-soft)" }}
                >
                  <v.icon size={20} strokeWidth={2} aria-hidden style={{ color: "var(--hs-accent)" }} />
                </span>
                <h3
                  className="mt-4 text-[17px] font-semibold"
                  style={{ fontFamily: "var(--font-display)", color: "var(--hs-ink)" }}
                >
                  {v.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.65]" style={{ color: "var(--hs-mute)" }}>
                  {v.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Learning science ===== */}
        <section className="hs-soft-bg border-y px-6 py-16 md:py-24" style={{ borderColor: "var(--hs-line)" }}>
          <HsSectionHeading
            eyebrow="Didaktische Fundierung"
            title="Keine KI-Spielerei, sondern belegte Lernmethoden."
            sub="Lernly setzt um, was die Lernforschung seit Jahrzehnten zeigt: kursbezogen und ohne Zusatzaufwand für Ihre Dozenten."
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

        {/* ===== Pilot offer + timeline + early partner ===== */}
        <section id="pilot" className="scroll-mt-20 px-6 py-16 md:py-24">
          <HsSectionHeading
            eyebrow="Der Lernly-Pilot"
            title="Ein betreuter Pilot: ein Kurs, ein Termin, klar umrissen."
            sub="Feste Laufzeit bis zum nächsten Prüfungstermin. Bezahlt, damit es ein echtes gemeinsames Projekt ist, ohne Lock-in und ohne automatische Verlängerung."
          />

          <div className="mt-14">
            <PvPilotTimeline />
          </div>

          <div className="hs-reveal hs-card mx-auto mt-16 max-w-[720px] overflow-hidden">
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
                  Pilot ab {PILOT_PRICE}.
                </span>{" "}
                Per Direktauftrag, ohne Beschaffungsprozess.
              </p>
              <PrimaryCta className="w-full shrink-0 sm:w-auto" />
            </div>
          </div>

          {/* Social-proof placeholder — honest, clearly labeled. */}
          <div
            className="hs-reveal mx-auto mt-8 max-w-[720px] rounded-2xl border border-dashed p-6 text-center"
            style={{ borderColor: "rgba(20,33,197,0.3)", background: "var(--hs-accent-soft)" }}
          >
            <span className="hs-eyebrow" style={{ color: "var(--hs-accent)" }}>
              Platzhalter für echten Proof
            </span>
            <p className="mx-auto mt-3 max-w-[520px] text-[14.5px] leading-[1.6]" style={{ color: "var(--hs-ink)" }}>
              [Platzhalter: Bestehensquote und O-Ton der Schulleitung nach dem
              ersten Pilotdurchlauf.]
            </p>
            <p className="mx-auto mt-2 max-w-[520px] text-[12.5px] leading-[1.55]" style={{ color: "var(--hs-mute)" }}>
              Wir zeigen hier erst echte Ergebnisse, keine erfundenen Zahlen.
              Sie können die erste Schule sein, deren Ergebnis hier steht.
            </p>
          </div>

          {/* Early-partner advantages. */}
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
          </div>

          <CtaRow text="Kickoff in einer Woche möglich. 15 Minuten reichen für den Start." />
        </section>

        {/* ===== Privacy spec sheet ===== */}
        <section id="datenschutz" className="hs-soft-bg scroll-mt-20 border-y px-6 py-16 md:py-24" style={{ borderColor: "var(--hs-line)" }}>
          <HsSectionHeading
            eyebrow="Datenschutz & Urheberrecht"
            title="Ihr Material bleibt Ihres. Sauber geregelt."
            sub="Die Antworten, die Sie brauchen, bevor Kursmaterial hochgeladen wird. Details klären wir vor dem Piloten gemeinsam."
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
              style={{ borderTop: "1px solid var(--hs-line)", background: "#fff" }}
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
                Keine Benotung. Keine Prüfungsentscheidungen. Keine Überwachung
                einzelner Anwärter oder Dozenten. Lernly ist ein
                unterstützendes, formatives Übungswerkzeug, ergänzend zu Ihrem
                Kurs.
              </p>
            </div>
          </div>
        </section>

        {/* ===== Founder ===== */}
        <section className="px-6 py-16 md:py-20">
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
                  Lernly ist während einer echten Klausurphase entstanden, aus
                  dem Skriptberg eines einzigen Kurses. Heute wird es zum Lernen
                  genutzt und vom Studio Belerate weiterentwickelt.
                </p>
                <p className="mt-3 text-[15px] leading-[1.75]" style={{ color: "var(--hs-mute)" }}>
                  Im Pilotprojekt sprechen Sie direkt mit dem Gründer: kein
                  Vertrieb, kurze Wege bei Fragen zu Datenschutz oder
                  Prüfungsformat.
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
        <section id="faq" className="hs-soft-bg scroll-mt-20 border-y px-6 py-16 md:py-24" style={{ borderColor: "var(--hs-line)" }}>
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
            <HsSectionHeading eyebrow="FAQ" title="Die Fragen der Schulleitung, offen beantwortet." />
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

        {/* ===== Contact / final CTA ===== */}
        <section id="kontakt" className="scroll-mt-20 px-6 py-16 md:py-24">
          <HsSectionHeading
            eyebrow="Kontakt"
            title="Passt Lernly zu Ihrem nächsten Kurs?"
            sub="Buchen Sie ein unverbindliches 15-Minuten-Gespräch. Wir schauen gemeinsam auf einen konkreten Kurs und den nächsten Prüfungstermin."
          />
          <div className="hs-reveal relative mx-auto mt-10 max-w-[900px]">
            <CalBooking namespace="pv-kontakt" maxHeight={640} lazy />
          </div>
          <p className="hs-reveal mx-auto mt-8 max-w-[560px] text-center text-[14px] leading-[1.6]" style={{ color: "var(--hs-mute)" }}>
            Lieber schreiben? Sie erreichen den Gründer direkt unter{" "}
            <a
              href="mailto:info@lernly-app.de?subject=Lernly%20f%C3%BCr%20unsere%20Heilpraktikerschule"
              className="font-medium underline underline-offset-2"
              style={{ color: "var(--hs-accent)" }}
            >
              info@lernly-app.de
            </a>
            .
          </p>
        </section>
      </main>

      <PvFooter />
    </div>
  );
}
