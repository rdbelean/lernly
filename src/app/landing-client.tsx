"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import type { ExamType, StudyPack } from "@/lib/schema";
import GenerationProgress from "@/components/GenerationProgress";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import ClaudeLogo from "@/components/ClaudeLogo";
import FlashcardDeck from "@/components/pack/FlashcardDeck";
import EssayBlueprintView from "@/components/pack/EssayBlueprintView";
import OverviewView from "@/components/pack/OverviewView";
import ExamSimulator from "@/components/pack/ExamSimulator";
import DemoPacksSection from "@/components/landing/DemoPacksSection";
import SectionHeading from "@/components/landing/SectionHeading";
import TurnstileWidget from "@/components/TurnstileWidget";
import { track } from "@/lib/analytics";

type Language = "en" | "de";

const LANGUAGE_STORAGE = "lernly-language";
const LanguageContext = createContext<Language>("de");

function useLanguage() {
  return useContext(LanguageContext);
}

type ExamIcon = (props: { className?: string }) => React.JSX.Element;

const EssayIcon: ExamIcon = ({ className }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);

const MultipleChoiceIcon: ExamIcon = ({ className }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const OralIcon: ExamIcon = ({ className }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const OpenBookIcon: ExamIcon = ({ className }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3H8a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 4.5A1.5 1.5 0 0 0 20.5 3H16a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const EXAM_OPTIONS: { value: ExamType; label: string; Icon: ExamIcon }[] = [
  { value: "essay", label: "Essay", Icon: EssayIcon },
  { value: "multiple_choice", label: "Multiple Choice", Icon: MultipleChoiceIcon },
  { value: "oral", label: "Oral", Icon: OralIcon },
  { value: "open_book", label: "Open Book", Icon: OpenBookIcon },
];

const MAX_FILES = 3;
const MAX_SIZE = 10 * 1024 * 1024;

// Founder pricing — cohort-based: as long as Lernly has fewer than
// FOUNDER_PRICING_LIMIT paying Pro subscribers, the price stays at €6.99.
// Once we cross the limit, raise the
// listed Pro/Team prices to the anchorPrice. Honesty is the whole point.
const FOUNDER_PRICING_LIMIT = 1000;

function useScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            obs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px 0px 0px" },
    );

    const tracked = new WeakSet<Element>();
    const trackElement = (el: Element) => {
      if (tracked.has(el)) return;
      tracked.add(el);
      obs.observe(el);
      // Per-element safety net: force visible after 1.5s if observer never fires.
      // Covers conditionally rendered sections (e.g. ResultSection after pack
      // generation), which previously stayed at opacity:0 forever.
      window.setTimeout(() => {
        if (!el.classList.contains("is-visible")) {
          el.classList.add("is-visible");
          obs.unobserve(el);
        }
      }, 1500);
    };

    const scan = () => {
      document.querySelectorAll(".ln-reveal").forEach(trackElement);
    };
    scan();

    const mut = new MutationObserver(scan);
    mut.observe(document.body, { childList: true, subtree: true });

    return () => {
      obs.disconnect();
      mut.disconnect();
    };
  }, []);
}

const GENERATE_TIMEOUT_MS = 5 * 60 * 1000;

const API_KEY_STORAGE = "lernly-claude-api-key";

// Landing variant — "anonymous" (default) lets visitors generate without
// signing up; "signup_wall" routes every upload CTA to /login first. Switched
// at build time via Vercel env var; later wired to PostHog feature flag for
// per-user A/B testing.
const LANDING_VARIANT =
  (process.env.NEXT_PUBLIC_LANDING_VARIANT as "anonymous" | "signup_wall") ??
  "anonymous";
const IS_SIGNUP_WALL = LANDING_VARIANT === "signup_wall";
const SIGNUP_HREF = "/login?next=/dashboard/new";

export default function Home() {
  const [mode, setMode] = useState<"demo" | "upload">("demo");
  const [files, setFiles] = useState<File[]>([]);
  const [examType, setExamType] = useState<ExamType>("essay");
  const [isGenerating, setIsGenerating] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [pack, setPack] = useState<StudyPack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isConnectOpen, setConnectOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("de");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const openConnect = useCallback(() => setConnectOpen(true), []);
  const closeConnect = useCallback(() => setConnectOpen(false), []);

  const activateUpload = () => {
    if (IS_SIGNUP_WALL) {
      track("signup_started", { source: "landing_wall" });
      window.location.href = SIGNUP_HREF;
      return;
    }
    setMode("upload");
    requestAnimationFrame(() => {
      document
        .getElementById("upload")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  useScrollReveal();

  useEffect(() => {
    track("landing_variant_seen", { variant: LANDING_VARIANT });
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("lernly-pack");
    if (raw) {
      try {
        setPack(JSON.parse(raw) as StudyPack);
        setMode("upload");
      } catch {
        /* ignore */
      }
    }
    const savedKey = localStorage.getItem(API_KEY_STORAGE);
    if (savedKey) setApiKey(savedKey);
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE);
    if (savedLanguage === "en" || savedLanguage === "de") {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem(LANGUAGE_STORAGE, language);
  }, [language]);

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    setError(null);
    if (rejected.length > 0) {
      setError(
        rejected[0].errors[0]?.message ??
          (language === "en" ? "File rejected" : "Datei abgelehnt"),
      );
    }
    setFiles((prev) => [...prev, ...accepted].slice(0, MAX_FILES));
  }, [language]);

  const removeFile = (i: number) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  // Tick the elapsed counter while a generation is in flight.
  useEffect(() => {
    if (!isGenerating) return;
    setElapsedSec(0);
    const started = Date.now();
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [isGenerating]);

  // Scroll to the result the moment a fresh pack is rendered. Fires after React
  // commits the DOM, so resultRef.current is guaranteed to be populated.
  useEffect(() => {
    if (!pack) return;
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pack]);

  const handleGenerate = async () => {
    if (files.length === 0 || isGenerating) return;

    // Login-gate: every generation goes through an account so we can save the
    // pack + count it against the user's quota (Free/Pro/Team). Anonymous
    // generation on landing is deprecated — the demo packs section + the
    // existing live demo modal cover the 'try-before-signup' need.
    setIsGenerating(true);
    setError(null);
    try {
      const { createClient } = await import("@/lib/supabase/browser");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        track("signup_started", { source: "landing_generate_click" });
        // Persist the user's intent so /dashboard/new can prefill the
        // exam-type after signup (files have to be re-picked because Blob
        // doesn't survive a navigation).
        try {
          sessionStorage.setItem(
            "lernly-pending-generation",
            JSON.stringify({ examType }),
          );
        } catch {
          /* ignore quota errors */
        }
        window.location.href = "/login?next=/dashboard/new";
        return;
      }
      // Authed user somehow landing on the marketing page — bounce to the
      // dashboard flow. The root page already redirects authed users; this
      // is a defensive fallback.
      window.location.href = "/dashboard/new";
    } catch (e) {
      console.error("[landing] auth check failed", e);
      window.location.href = "/login?next=/dashboard/new";
    }
  };

  const clearPack = () => {
    setPack(null);
    sessionStorage.removeItem("lernly-pack");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <LanguageContext.Provider value={language}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Lernly",
            applicationCategory: "EducationalApplication",
            operatingSystem: "Web",
            url: "https://lernly-app.de",
            description:
              "Lade Vorlesungs-PDFs hoch und bekomme in 2 Minuten interaktive Karteikarten, einen Klausur-Simulator und einen Essay-Blueprint.",
            offers: [
              { "@type": "Offer", name: "Gratis", price: "0", priceCurrency: "EUR", description: "3 Pakete pro Monat" },
              { "@type": "Offer", name: "Pro", price: "6.99", priceCurrency: "EUR", description: "20 Pakete pro Monat" },
              { "@type": "Offer", name: "Team", price: "14.99", priceCurrency: "EUR", description: "50 Pakete pro Monat" },
            ],
            featureList: [
              "Karteikarten aus PDF generieren",
              "Klausur-Simulator mit MC-Fragen",
              "Essay-Blueprint mit Template-Sätzen",
              "Themen-Übersicht mit Prüfungsrelevanz",
            ],
            inLanguage: ["de", "en"],
          }),
        }}
      />
      <div className="flex flex-1 flex-col">
        <SiteNav
          onActivateUpload={activateUpload}
          language={language}
          onLanguageChange={setLanguage}
        />
        <main className="flex flex-1 flex-col">
          <Hero
            mode={mode}
            onActivateUpload={activateUpload}
            files={files}
            examType={examType}
            setExamType={setExamType}
            removeFile={removeFile}
            onDrop={onDrop}
            isGenerating={isGenerating}
            completed={completed}
            elapsedSec={elapsedSec}
            error={error}
            onGenerate={handleGenerate}
            onTurnstileVerify={setTurnstileToken}
            onTurnstileError={() => setTurnstileToken(null)}
          />
          <DemoPacksSection language={language} onTryYourOwn={activateUpload} />
          <HowItWorks />
          <ShowcaseSection />
          <BentoFeatures />
          <ComparisonSection />
          {pack && (
            <section ref={resultRef} id="result" className="scroll-mt-24">
              <ResultSection pack={pack} onReset={clearPack} />
            </section>
          )}
          <PricingSection
            onActivateUpload={activateUpload}
            onOpenConnect={openConnect}
          />
          <FAQSection />
          <BottomCta />
        </main>
        <SiteFooter language={language} />
        {isConnectOpen && (
          <ConnectModal
            apiKey={apiKey}
            setApiKey={setApiKey}
            onClose={closeConnect}
          />
        )}
      </div>
    </LanguageContext.Provider>
  );
}

/* ========== HERO ========== */

type HeroProps = {
  mode: "demo" | "upload";
  onActivateUpload: () => void;
  files: File[];
  examType: ExamType;
  setExamType: Dispatch<SetStateAction<ExamType>>;
  removeFile: (i: number) => void;
  onDrop: (accepted: File[], rejected: FileRejection[]) => void;
  isGenerating: boolean;
  completed: boolean;
  elapsedSec: number;
  error: string | null;
  onGenerate: () => void;
  onTurnstileVerify: (token: string) => void;
  onTurnstileError: () => void;
};

function formatElapsed(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Hero(props: HeroProps) {
  const { mode, onActivateUpload } = props;
  const language = useLanguage();
  const isEn = language === "en";
  return (
    <section className="relative overflow-hidden px-6 pt-24 pb-28 md:pt-32 md:pb-36">
      <div
        aria-hidden
        className="ln-glow pointer-events-none absolute left-1/2 top-[42%] h-[560px] w-[680px] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(91,184,216,0.22), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-[1080px]">
        <h1
          className="ln-reveal text-center font-bold leading-[1.05] tracking-[-2.88px]"
          style={{
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "clamp(48px, 8vw, 96px)",
          }}
        >
          <span className="block sm:inline">
            {isEn ? "From 8 PDFs" : "Aus 8 PDFs"}
          </span>{" "}
          <span className="block sm:inline" style={{ color: "rgb(255, 255, 255)" }}>
            {isEn ? "comes a plan." : "wird ein Plan."}
          </span>
        </h1>

        <p
          className="ln-reveal mx-auto mt-8 max-w-[680px] text-center leading-[1.4] text-white"
          style={{ fontSize: "clamp(18px, 2.2vw, 22px)" }}
        >
          {isEn
            ? "3 days to the exam. No plan. No stress."
            : "3 Tage bis zur Klausur. Kein Plan. Kein Stress."}
        </p>

        <div className="ln-hero-actions ln-reveal mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onActivateUpload}
            className="rounded-full px-7 py-[14px] text-[16px] font-semibold transition hover:bg-white/90"
            style={{ background: "#ffffff", color: "#1a2647" }}
          >
            {isEn ? "Drop in slides →" : "Folien reinwerfen →"}
          </button>
          <a
            href="#how"
            className="rounded-full border px-7 py-[14px] text-[16px] font-medium text-white transition hover:bg-white/[0.14]"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              borderColor: "rgba(255, 255, 255, 0.12)",
            }}
          >
            {isEn ? "How it works" : "So geht's"}
          </a>
        </div>

        <div
          id="upload"
          className={
            "mx-auto mt-10 scroll-mt-24 " +
            (mode === "demo" ? "max-w-[1120px]" : "max-w-[881px]")
          }
        >
          {mode === "demo" ? (
            <StudyPackCockpitMockup onActivate={onActivateUpload} />
          ) : (
            <UploadDemo {...props} />
          )}
        </div>

        <div className="ln-reveal mt-8 flex flex-wrap items-center justify-center gap-[14px]">
          <span className="ln-hero-badge" style={{ color: "rgb(111, 199, 227)" }}>
            ● {isEn ? "2 min" : "2 Min"}
          </span>
          <span className="ln-hero-badge" style={{ color: "rgb(127, 169, 245)" }}>
            ● {isEn ? "Demo without login" : "Demo ohne Login"}
          </span>
          <span className="ln-hero-badge" style={{ color: "rgb(143, 139, 229)" }}>
            ● {isEn ? "2 free packs/month" : "2 Pakete gratis / Monat"}
          </span>
          <span className="ln-hero-badge" style={{ color: "rgb(178, 156, 240)" }}>
            ● {isEn ? "DE/EN" : "DE/EN"}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ========== HERO STUDY PACK COCKPIT ========== */

function StudyPackCockpitMockup({ onActivate }: { onActivate: () => void }) {
  const isEn = useLanguage() === "en";
  return (
    <div className="ln-hero-card ln-cockpit">
      <div className="ln-cockpit-top">
        <div>
          <div className="ln-card-top-status">
            <span className="ln-pulse-dot-green" aria-hidden />
            <span>{isEn ? "Ready" : "Fertig"}</span>
          </div>
          <div className="ln-cockpit-title">
            {isEn
              ? "Strategic Management · Essay exam"
              : "Strategic Management · Essay-Klausur"}
          </div>
        </div>
        <div className="ln-cockpit-pack-tags">
          <span>{isEn ? "35 cards" : "35 Karten"}</span>
          <span>{isEn ? "12 quiz qs" : "12 Quiz-Fragen"}</span>
          <span>Blueprint</span>
        </div>
      </div>

      <div className="ln-cockpit-body">
        <aside
          className="ln-cockpit-rail"
          aria-label={isEn ? "Study pack modules" : "Lernpaket Module"}
        >
          <div className="ln-cockpit-rail-item is-active">
            <span>01</span>
            <strong>Blueprint</strong>
          </div>
          <div className="ln-cockpit-rail-item">
            <span>02</span>
            <strong>{isEn ? "Flashcards" : "Karteikarten"}</strong>
          </div>
          <div className="ln-cockpit-rail-item">
            <span>03</span>
            <strong>{isEn ? "Quiz" : "Übungsklausur"}</strong>
          </div>
        </aside>

        <section
          className="ln-cockpit-main"
          aria-label={isEn ? "Essay blueprint preview" : "Essay Blueprint Vorschau"}
        >
          <div className="ln-cockpit-panel-head">
            <span className="ln-section-label">Essay Blueprint</span>
            <span className="ln-cockpit-mini-pill">
              {isEn ? "~1500 words · 3h" : "~1500 Wörter · 3h"}
            </span>
          </div>

          <div className="ln-timebar" aria-hidden>
            <div className="ln-timebar-segment is-scenario" style={{ flex: 3.5 }}>
              <strong>{isEn ? "Scenario" : "Szenario"}</strong>
              <span>~350 W.</span>
            </div>
            <div className="ln-timebar-segment is-theory" style={{ flex: 3.5 }}>
              <strong>{isEn ? "Theory" : "Theorie"}</strong>
              <span>~350 W.</span>
            </div>
            <div className="ln-timebar-segment is-analysis" style={{ flex: 6 }}>
              <strong>{isEn ? "Analysis" : "Analyse"}</strong>
              <span>~650 W.</span>
            </div>
            <div className="ln-timebar-segment is-polish" style={{ flex: 1.8 }}>
              <strong>Polish</strong>
              <span>30 min</span>
            </div>
          </div>

          <div className="ln-blueprint-stack">
            <div className="ln-blueprint-row is-scenario">
              <span>1</span>
              <div>
                <strong>{isEn ? "Scenario" : "Szenario"}</strong>
                <p>
                  {isEn
                    ? "Describe the industry context. No theory, no references."
                    : "Branche beschreiben. Keine Theorie, keine Quellen."}
                </p>
              </div>
              <em>40 min</em>
            </div>
            <div className="ln-blueprint-row is-theory">
              <span>2</span>
              <div>
                <strong>{isEn ? "Theory" : "Theorie"}</strong>
                <p>Porter, Barney, Anderson & Tushman.</p>
              </div>
              <em>40 min</em>
            </div>
            <div className="ln-blueprint-row is-analysis">
              <span>3</span>
              <div>
                <strong>
                  {isEn ? "Analysis + conclusion" : "Analyse + Schluss"}
                </strong>
                <p>
                  {isEn
                    ? "Defend or challenge. Take a position, not a summary."
                    : "Stützen oder angreifen. Position beziehen, keine Zusammenfassung."}
                </p>
              </div>
              <em>80 min</em>
            </div>
          </div>
        </section>

        <aside
          className="ln-cockpit-drill"
          aria-label={isEn ? "Flashcards preview" : "Karteikarten Vorschau"}
        >
          <div className="ln-cockpit-panel-head">
            <span className="ln-section-label">
              {isEn ? "Flashcards" : "Karteikarten"}
            </span>
            <span className="ln-cockpit-mini-pill">12 / 35</span>
          </div>
          <div className="ln-drill-progress">
            <span style={{ width: "34%" }} />
          </div>
          <div className="ln-drill-card">
            <div className="ln-drill-card-top">
              <span>Porter</span>
              <em>Five Forces</em>
            </div>
            <strong>
              {isEn
                ? "Which 5 forces shape industry structure?"
                : "Welche 5 Kräfte bestimmen die Branchenstruktur?"}
            </strong>
            <p>
              {isEn
                ? "Supplier power, buyer power, rivalry, new entrants, substitutes. Streaming = intense rivalry (Netflix/Disney+/Amazon)."
                : "Lieferantenmacht, Käufermacht, Rivalität, neue Anbieter, Substitute. Streaming = hohe Rivalität (Netflix/Disney+/Amazon)."}
            </p>
          </div>
          <div className="ln-drill-actions" aria-hidden>
            <span className="is-again">{isEn ? "Again" : "Nochmal"}</span>
            <span className="is-kinda">{isEn ? "Almost" : "Fast"}</span>
            <span className="is-got">{isEn ? "Got it" : "Kann ich"}</span>
          </div>
        </aside>
      </div>

      <div className="ln-cockpit-bottom">
        <div className="ln-example-chip">
          <span>{isEn ? "Vertical Integration" : "Vertikale Integration"}</span>
          <strong>Make-or-Buy</strong>
        </div>
        <div className="ln-example-chip">
          <span>{isEn ? "Global Strategy" : "Globale Strategie"}</span>
          <strong>CAGE · I-R Framework</strong>
        </div>
        <div className="ln-example-chip">
          <span>{isEn ? "Diversification" : "Diversifikation"}</span>
          <strong>Porter's 3 Tests</strong>
        </div>
        <button type="button" onClick={onActivate} className="ln-cockpit-cta">
          <span>✦</span>
          <span>
            {isEn
              ? "Try it with my slides"
              : "Jetzt mit meinen Folien testen"}
          </span>
        </button>
      </div>
    </div>
  );
}

/* ========== UPLOAD DEMO (hero) ========== */

function UploadDemo({
  files,
  examType,
  setExamType,
  removeFile,
  onDrop,
  isGenerating,
  completed,
  elapsedSec,
  error,
  onGenerate,
  onTurnstileVerify,
  onTurnstileError,
}: HeroProps) {
  const language = useLanguage();
  const isEn = language === "en";
  const examOptions = EXAM_OPTIONS.map((option) => ({
    ...option,
    label:
      option.value === "essay"
        ? "Essay"
        : option.value === "multiple_choice"
          ? isEn
            ? "Multiple choice"
            : "Multiple Choice"
          : option.value === "oral"
            ? isEn
              ? "Oral"
              : "Mündlich"
            : isEn
              ? "Open book"
              : "Open Book",
  }));
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: MAX_FILES,
    maxSize: MAX_SIZE,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/markdown": [".md", ".markdown"],
    },
  });

  if (isGenerating) {
    return (
      <div className="ln-hero-card py-[30px] px-[34px]">
        <GenerationProgress completed={completed} language={language} />
        {elapsedSec > 90 && (
          <p
            className="mt-2 text-center text-[12px]"
            style={{ color: "var(--color-ln-mute)" }}
          >
            {isEn
              ? `With many pages this can take 2-3 minutes. Keep this tab open. (Running for ${formatElapsed(elapsedSec)})`
              : `Bei vielen Seiten kann das 2-3 Minuten dauern. Lass den Tab offen. (Läuft seit ${formatElapsed(elapsedSec)})`}
          </p>
        )}
      </div>
    );
  }

  if (IS_SIGNUP_WALL) {
    return (
      <div className="ln-hero-card py-[30px] px-[34px]">
        <div className="rounded-2xl border-2 border-dashed border-white/15 bg-black/20 px-6 py-10 text-center">
          <div className="mx-auto flex max-w-[420px] flex-col items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                background: "rgba(91,184,216,0.14)",
                color: "var(--color-ln-cyan)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </div>
            <div className="text-[16px] font-semibold text-white">
              {isEn
                ? "Sign up to upload your PDF"
                : "Erstelle einen Account, um dein PDF hochzuladen"}
            </div>
            <div
              className="text-[13px]"
              style={{ color: "var(--color-ln-mute)" }}
            >
              {isEn
                ? "30 seconds with Google. 3 free packs per month. No credit card."
                : "30 Sekunden mit Google. 3 Pakete pro Monat gratis. Keine Kreditkarte."}
            </div>
            <a
              href={SIGNUP_HREF}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-[#0F1535] hover:bg-white/90"
            >
              {isEn ? "Sign in to start →" : "Anmelden & loslegen →"}
            </a>
            <p
              className="mt-2 text-[12px]"
              style={{ color: "var(--color-ln-mute)" }}
            >
              {isEn
                ? "Want to see what it looks like first? Scroll down to the demo."
                : "Erst mal anschauen? Scroll runter zur Demo."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ln-hero-card py-[30px] px-[34px]">
      <div
        {...getRootProps()}
        className={
          "cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center transition " +
          (isDragActive
            ? "border-[color:var(--color-ln-cyan)] bg-[color:var(--color-ln-cyan)]/10"
            : "border-white/15 bg-black/20 hover:border-white/30")
        }
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{
              background: "rgba(91,184,216,0.14)",
              color: "var(--color-ln-cyan)",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15V3" />
              <path d="M7 8l5-5 5 5" />
              <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
            </svg>
          </div>
          <div className="text-[15px] font-medium text-white">
            {isDragActive
              ? isEn
                ? "Drop them!"
                : "Loslassen!"
              : isEn
                ? "Drop slides here (or click)"
                : "Folien hier reinwerfen (oder klicken)"}
          </div>
          <div className="text-[12px]" style={{ color: "var(--color-ln-mute)" }}>
            {isEn
              ? `PDF · TXT · MD · up to ${MAX_FILES} files`
              : `PDF · TXT · MD · bis zu ${MAX_FILES} Dateien`}
          </div>
        </div>
      </div>

      <TurnstileWidget
        onVerify={onTurnstileVerify}
        onError={onTurnstileError}
      />

      {files.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[13px] text-white"
            >
              <span>📄</span>
              <span className="max-w-[180px] truncate">{f.name}</span>
              <span style={{ color: "var(--color-ln-sage)" }}>✓</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="ml-1 text-white/50 transition hover:text-white"
                aria-label={isEn ? "Remove" : "Entfernen"}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-black/20 p-1.5">
        {examOptions.map((opt) => {
          const active = examType === opt.value;
          const IconComp = opt.Icon;
          return (
            <button
              key={opt.value}
              onClick={() => setExamType(opt.value)}
              className={
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition " +
                (active
                  ? "bg-white/10 text-white ring-1 ring-white/15"
                  : "text-white/60 hover:text-white")
              }
            >
              <IconComp />
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div
          style={{
            background: "rgba(255, 100, 100, 0.08)",
            border: "1px solid rgba(255, 100, 100, 0.2)",
            borderRadius: "14px",
            padding: "16px 20px",
            marginTop: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "14px", color: "rgba(255, 130, 130, 0.9)" }}>
            ⚠️ {error}
          </span>
          <button
            onClick={onGenerate}
            disabled={files.length === 0}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "transparent",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              cursor: files.length === 0 ? "not-allowed" : "pointer",
              opacity: files.length === 0 ? 0.4 : 1,
            }}
          >
            ↻ {isEn ? "Try again" : "Erneut versuchen"}
          </button>
        </div>
      )}

      <button
        onClick={onGenerate}
        disabled={files.length === 0}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-[15px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40"
      >
        <span>✦</span>
        <span>
          {isEn ? "Create pack (about 2 min)" : "Paket erstellen (ca. 2 Min)"}
        </span>
      </button>

      <p
        className="mt-3 text-center text-[12px]"
        style={{ color: "var(--color-ln-mute)" }}
      >
        {isEn
          ? "Free · 2 packs per month · Sign up to start"
          : "Kostenlos · 2 Pakete pro Monat · Anmelden zum Starten"}
      </p>
    </div>
  );
}

/* ========== SHOWCASE: input stack → output pack ========== */
// Replaces the previous "BWL / MED / JURA" mock-demo cards. The page already
// has DemoPacksSection showing real (BWL) packs; what was missing was an
// answer to "passt das zu meinem konkreten Stapel?". This section makes that
// promise visually: drop in your collected mess (PDFs, slides, notes) →
// out comes a structured study pack.

type IoTile = {
  label: string;
  sub: string;
  icon: React.ReactNode;
};

function FileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  );
}

function SlidesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <line x1="8" y1="20" x2="16" y2="20" />
      <line x1="12" y1="17" x2="12" y2="20" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M3 12h18M3 18h12" />
    </svg>
  );
}

function CardsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="14" height="14" rx="2" />
      <path d="M7 9h10" />
      <path d="M21 19V7a2 2 0 0 0-2-2" />
    </svg>
  );
}

function QuizIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function BlueprintIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function VisualMapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ShowcaseSection() {
  const isEn = useLanguage() === "en";

  const inputs: IoTile[] = [
    {
      label: isEn ? "Lecture PDF" : "Vorlesungs-PDF",
      sub: isEn ? "200+ slides, all in" : "200+ Slides, alles rein",
      icon: <FileIcon />,
    },
    {
      label: isEn ? "Slides" : "Folien",
      sub: isEn ? "Exported PowerPoint" : "PowerPoint als PDF",
      icon: <SlidesIcon />,
    },
    {
      label: isEn ? "Notes" : "Notizen",
      sub: ".txt · .md",
      icon: <NotesIcon />,
    },
  ];

  const outputs: IoTile[] = [
    {
      label: isEn ? "Flashcards" : "Karteikarten",
      sub: isEn ? "Mnemonics included" : "Mit Eselsbrücken",
      icon: <CardsIcon />,
    },
    {
      label: isEn ? "Exam trainer" : "Übungsklausur",
      sub: isEn ? "Real-firm scenarios" : "Szenarien mit echten Firmen",
      icon: <QuizIcon />,
    },
    {
      label: "Blueprint",
      sub: isEn ? "Template sentences" : "Template-Sätze",
      icon: <BlueprintIcon />,
    },
    {
      label: "Visual Map",
      sub: isEn ? "2×2 matrices, flows" : "2×2-Matrizen, Flows",
      icon: <VisualMapIcon />,
    },
  ];

  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <SectionHeading
          eyebrow={isEn ? "Drop it all in" : "Wirf alles rein"}
          boldPart={
            isEn ? "Drop in your whole stack." : "Wirf deinen Stapel rein."
          }
          italicPart={
            isEn ? "Lernly does the rest." : "Lernly macht den Rest."
          }
          sub={
            isEn
              ? "Whatever piled up this semester — slides, notes, scripts. Up to 8 files, in one shot."
              : "Egal was sich angesammelt hat — Folien, Notizen, Skripte. Bis zu 8 Dateien auf einmal."
          }
        />

        <div className="ln-reveal mt-14 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1fr_auto_1.2fr] lg:gap-8">
          <IoColumn
            kind="input"
            heading={isEn ? "Stack in" : "Stapel rein"}
            footerNote={
              isEn
                ? "PDF · TXT · MD · up to 8 files"
                : "PDF · TXT · MD · bis zu 8 Dateien"
            }
            tiles={inputs}
          />
          <FlowConnector />
          <IoColumn
            kind="output"
            heading={isEn ? "Study pack out" : "Lernpaket raus"}
            footerNote={isEn ? "Ready in ~2 minutes" : "In ~2 Minuten fertig"}
            tiles={outputs}
          />
        </div>
      </div>
    </section>
  );
}

function IoColumn({
  kind,
  heading,
  footerNote,
  tiles,
}: {
  kind: "input" | "output";
  heading: string;
  footerNote: string;
  tiles: IoTile[];
}) {
  const isInput = kind === "input";
  return (
    <div
      className="ln-glass-card flex h-full flex-col p-6 md:p-7"
      style={{
        background: isInput
          ? "linear-gradient(160deg, rgba(20,22,28,0.7), rgba(251,113,133,0.04))"
          : "linear-gradient(160deg, rgba(20,22,28,0.7), rgba(124,196,160,0.06))",
        borderColor: isInput
          ? "rgba(251,113,133,0.18)"
          : "rgba(124,196,160,0.2)",
      }}
    >
      <div
        className="mb-5 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{
          color: isInput ? "rgb(252,165,165)" : "rgb(134,239,172)",
        }}
      >
        <span className="flex items-center gap-2">
          <span className="ln-pulse-dot-green" aria-hidden />
          {heading}
        </span>
        <span style={{ color: "rgba(255,255,255,0.4)" }}>
          {tiles.length}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {tiles.map((t, i) => (
          <IoTileCard
            key={t.label}
            tile={t}
            tone={kind}
            rotate={isInput ? (i % 2 === 0 ? -0.6 : 0.8) : 0}
          />
        ))}
      </div>

      <div
        className="mt-auto pt-5 font-mono text-[11px]"
        style={{ color: "rgba(255,255,255,0.45)" }}
      >
        {footerNote}
      </div>
    </div>
  );
}

function IoTileCard({
  tile,
  tone,
  rotate,
}: {
  tile: IoTile;
  tone: "input" | "output";
  rotate: number;
}) {
  const isInput = tone === "input";
  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-4 py-3 transition"
      style={{
        background: "rgba(20, 22, 28, 0.55)",
        borderColor: "rgba(255,255,255,0.1)",
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
      }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: isInput
            ? "rgba(251,113,133,0.1)"
            : "rgba(124,196,160,0.12)",
          color: isInput ? "rgb(252,165,165)" : "rgb(134,239,172)",
        }}
      >
        {tile.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-white">{tile.label}</div>
        <div
          className="mt-0.5 text-[12px]"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          {tile.sub}
        </div>
      </div>
    </div>
  );
}

function FlowConnector() {
  return (
    <div
      className="flex items-center justify-center lg:px-2"
      aria-hidden
    >
      {/* Horizontal arrow on lg+, vertical on mobile/tablet */}
      <svg
        className="hidden lg:block"
        width="64"
        height="40"
        viewBox="0 0 64 40"
        fill="none"
      >
        <line
          x1="4"
          y1="20"
          x2="56"
          y2="20"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.6"
          strokeDasharray="3 4"
        />
        <polyline
          points="48 12 60 20 48 28"
          fill="none"
          stroke="rgba(124,196,160,0.85)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg
        className="lg:hidden"
        width="40"
        height="48"
        viewBox="0 0 40 48"
        fill="none"
      >
        <line
          x1="20"
          y1="4"
          x2="20"
          y2="40"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.6"
          strokeDasharray="3 4"
        />
        <polyline
          points="12 32 20 44 28 32"
          fill="none"
          stroke="rgba(124,196,160,0.85)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/* ========== COMPARISON ========== */

function ComparisonSection() {
  const isEn = useLanguage() === "en";
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <SectionHeading
          eyebrow={
            isEn ? "You've already tried it" : "Du hast es schon probiert"
          }
          boldPart={
            isEn
              ? "ChatGPT, Notion, 8 Tabs."
              : "ChatGPT, Notion, 8 Tabs."
          }
          italicPart={
            isEn ? "Still alone." : "Trotzdem allein."
          }
        />

        {/* "Zwei Mittwoche": same Tuesday night, two outcomes. Split-path
            cards + a self-drawing retention curve as the proof element.
            Argument is method-based ('reading decays, recall holds'), not a
            tool attack. */}
        <div className="ln-reveal mx-auto mt-12 max-w-[860px]">
          {/* Shared time anchor */}
          <div className="flex justify-center">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[12px] font-semibold tracking-[0.1em]"
              style={{
                background: "rgba(255,255,255,0.05)",
                borderColor: "rgba(255,255,255,0.14)",
                color: "rgba(255,255,255,0.75)",
              }}
            >
              <span className="ln-pulse-dot" aria-hidden />
              {isEn ? "WED 09:00 · EXAM" : "MITTWOCH 09:00 · KLAUSUR"}
            </span>
          </div>

          {/* Two paths */}
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* ChatGPT path (rose) */}
            <div
              className="ln-glass-card flex flex-col p-6"
              style={{
                background:
                  "linear-gradient(160deg, rgba(20,22,28,0.7), rgba(251,113,133,0.04))",
                borderColor: "rgba(251,113,133,0.18)",
              }}
            >
              <div
                className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: "rgb(252,165,165)" }}
              >
                {isEn ? "Tue 23:47 → ChatGPT" : "Di 23:47 → ChatGPT"}
              </div>
              <p
                className="text-[15px] leading-relaxed"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                {isEn
                  ? "Slides in. Summary out. Read it. Tab closed."
                  : "Folien rein. Zusammenfassung raus. Gelesen. Tab zu."}
              </p>
              <div
                className="mt-auto pt-5 text-[15px] font-semibold"
                style={{ color: "rgb(252,165,165)" }}
              >
                {isEn ? "Wednesday: blank." : "Mittwoch: leerer Kopf."}
              </div>
            </div>

            {/* Lernly path (cyan/sage) */}
            <div
              className="ln-glass-card flex flex-col p-6"
              style={{
                background:
                  "linear-gradient(160deg, rgba(20,22,28,0.7), rgba(124,196,160,0.06))",
                borderColor: "rgba(124,196,160,0.22)",
              }}
            >
              <div
                className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: "rgb(134,239,172)" }}
              >
                <span className="ln-pulse-dot-green" aria-hidden />
                {isEn ? "Tue 23:47 → Lernly" : "Di 23:47 → Lernly"}
              </div>
              <p
                className="text-[15px] leading-relaxed"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                {isEn
                  ? "It quizzes you back. Again. Until it sticks."
                  : "Es fragt dich zurück. Wieder. Bis es sitzt."}
              </p>
              <div
                className="mt-auto pt-5 text-[15px] font-semibold"
                style={{ color: "rgb(134,239,172)" }}
              >
                {isEn ? "Wednesday: it sticks." : "Mittwoch: sitzt."}
              </div>
            </div>
          </div>

          {/* Retention curve — the proof. Proper aspect ratio (no stretch),
              smooth bezier curves, area gradient fills, circular markers. */}
          <div
            className="ln-glass-card mt-4 px-6 py-7 md:px-8"
            style={{
              background: "rgba(20, 22, 28, 0.5)",
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
              <span style={{ color: "rgba(255,255,255,0.4)" }}>Di 23:47</span>
              <span style={{ color: "rgba(255,255,255,0.55)" }}>
                {isEn ? "What sticks" : "Was hängenbleibt"}
              </span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>Mi 09:00</span>
            </div>

            <svg
              className="w-full"
              viewBox="0 0 800 260"
              fill="none"
              role="img"
              aria-label={
                isEn
                  ? "Retention over time: reading decays, active recall stays high"
                  : "Erinnerung über Zeit: Lesen verfällt, aktives Abfragen bleibt hoch"
              }
              style={{ height: "auto" }}
            >
              <defs>
                <linearGradient id="ln-rose-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(251,113,133,0.22)" />
                  <stop offset="100%" stopColor="rgba(251,113,133,0)" />
                </linearGradient>
                <linearGradient id="ln-cyan-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(91,184,216,0.28)" />
                  <stop offset="100%" stopColor="rgba(91,184,216,0)" />
                </linearGradient>
                <filter id="ln-dot-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* subtle horizontal gridlines */}
              {[60, 130, 200].map((y) => (
                <line
                  key={y}
                  x1="40"
                  y1={y}
                  x2="760"
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
              ))}

              {/* ChatGPT decay — area + line */}
              <path
                d="M 40 58 C 240 90 380 200 760 224 L 760 232 L 40 232 Z"
                fill="url(#ln-rose-fill)"
              />
              <path
                className="ln-curve-line ln-curve-rose"
                d="M 40 58 C 240 90 380 200 760 224"
                stroke="var(--color-ln-rose)"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Lernly recall — area + smooth wavy line that stays high */}
              <path
                d="M 40 58 C 150 96 210 96 280 60 C 380 92 440 92 520 54 C 620 86 660 86 760 46 L 760 232 L 40 232 Z"
                fill="url(#ln-cyan-fill)"
              />
              <path
                className="ln-curve-line ln-curve-sage"
                d="M 40 58 C 150 96 210 96 280 60 C 380 92 440 92 520 54 C 620 86 660 86 760 46"
                stroke="var(--color-ln-cyan)"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* recall markers sitting on the cyan line */}
              <circle className="ln-curve-dot" cx="280" cy="60" r="5" fill="var(--color-ln-cyan)" filter="url(#ln-dot-glow)" />
              <circle className="ln-curve-dot" cx="520" cy="54" r="5" fill="var(--color-ln-cyan)" filter="url(#ln-dot-glow)" />
              <circle className="ln-curve-dot" cx="760" cy="46" r="5.5" fill="var(--color-ln-cyan)" filter="url(#ln-dot-glow)" />
              {/* end marker on the rose line */}
              <circle className="ln-curve-dot" cx="760" cy="224" r="5" fill="var(--color-ln-rose)" filter="url(#ln-dot-glow)" />
            </svg>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px]">
              <span className="inline-flex items-center gap-1.5" style={{ color: "rgb(252,165,165)" }}>
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-ln-rose)" }} />
                {isEn ? "Read a summary" : "Zusammenfassung gelesen"}
              </span>
              <span className="inline-flex items-center gap-1.5" style={{ color: "rgb(134,239,172)" }}>
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-ln-cyan)" }} />
                {isEn ? "Actively quizzed" : "Aktiv abgefragt"}
              </span>
            </div>

            <p
              className="mt-4 text-center text-[13.5px] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.62)" }}
            >
              {isEn ? (
                <>
                  Reading{" "}
                  <em className="lernly-italic" style={{ color: "white" }}>
                    decays
                  </em>
                  . Recall{" "}
                  <em className="lernly-italic" style={{ color: "white" }}>
                    holds
                  </em>
                  . It's not a ChatGPT problem — it's a method problem.
                </>
              ) : (
                <>
                  Lesen{" "}
                  <em className="lernly-italic" style={{ color: "white" }}>
                    verfällt
                  </em>
                  . Abfragen{" "}
                  <em className="lernly-italic" style={{ color: "white" }}>
                    hält
                  </em>
                  . Kein ChatGPT-Problem — ein Methoden-Problem.
                </>
              )}
            </p>
          </div>

          {/* CTA */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <a
              href="#demo"
              className="rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-[#0F1535] transition hover:bg-white/90"
            >
              {isEn ? "See a real pack →" : "Echtes Paket ansehen →"}
            </a>
            <span
              className="text-[12px]"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              {isEn ? "60 seconds, no signup" : "60 Sekunden, kein Login"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Waveform({ seed }: { seed: number }) {
  // Deterministic, integer-percentage heights — safe for SSR.
  // Shift the heights per card so each waveform looks distinct.
  const base = [40, 70, 100, 50, 80, 30, 60, 45, 90, 55];
  const rotated = [...base.slice(seed * 2), ...base.slice(0, seed * 2)];
  return (
    <div
      className="mt-6 flex h-6 items-end gap-[3px]"
      style={{ paddingTop: 2 }}
      aria-hidden
    >
      {rotated.map((pct, i) => (
        <span
          key={i}
          className="ln-wave-bar"
          style={{
            height: `${pct}%`,
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ========== BENTO FEATURES ========== */

function BentoFeatures() {
  const isEn = useLanguage() === "en";
  return (
    <section id="features" className="scroll-mt-24 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <SectionHeading
          eyebrow={
            isEn ? "What makes Lernly different" : "Was Lernly anders macht"
          }
          boldPart={
            isEn ? "Exam in 7 days?" : "Klausur in 7 Tagen?"
          }
          italicPart={
            isEn ? "Enough time." : "Reicht."
          }
        />

        <div className="ln-stagger mt-14 grid grid-cols-1 gap-4 md:grid-cols-6">
          {/* Card 1 — span 3 */}
          <div className="ln-reveal ln-glass-card p-8 md:col-span-3 md:p-9">
            <CardEyebrow>
              {isEn ? "Reading ≠ Learning" : "Lesen ≠ Lernen"}
            </CardEyebrow>
            <CardTitle>
              {isEn
                ? "Actively quizzed, not passively skimmed."
                : "Du wirst abgefragt. Nicht berieselt."}
            </CardTitle>
            <CardDesc>
              {isEn
                ? "Every card tests you. Every quiz explains why each option is right or wrong. So the stuff actually sticks."
                : "Jede Karte testet dich. Jedes Quiz erklärt, warum jede Option richtig oder falsch ist. Damit's wirklich hängen bleibt."}
            </CardDesc>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="ln-mono-tag ln-mono-tag-pill ln-mono-tag-accent">
                {isEn ? "Active recall" : "Active Recall"}
              </span>
              <span className="ln-mono-tag ln-mono-tag-pill">
                {isEn ? "Feedback per answer" : "Feedback pro Antwort"}
              </span>
              <span className="ln-mono-tag ln-mono-tag-pill">
                {isEn ? "Repeat only what slipped" : "Nur falsche wiederholen"}
              </span>
            </div>
          </div>

          {/* Card 2 — span 3 (big stat) */}
          <div className="ln-reveal ln-glass-card relative overflow-hidden p-8 md:col-span-3 md:p-9">
            <CardEyebrow>
              {isEn ? "Stop writing cards by hand" : "Schluss mit Karten schreiben"}
            </CardEyebrow>
            <div className="mt-8 flex items-end gap-3">
              <div
                className="ln-stat-gradient-blue font-bold leading-none"
                style={{
                  fontSize: "clamp(56px, 8vw, 72px)",
                  letterSpacing: "-2.56px",
                }}
              >
                ~120
              </div>
              <div
                className="pb-2 text-[14px]"
                style={{ color: "var(--color-ln-mute)" }}
              >
                {isEn ? "sec / subject" : "Sek / Fach"}
              </div>
            </div>
            <CardTitle className="mt-6">
              {isEn
                ? "30 cards in the time it takes to make coffee."
                : "30 Karten in der Zeit eines Kaffees."}
            </CardTitle>
            <CardDesc>
              {isEn
                ? "What usually costs you an evening, Lernly does before your coffee gets cold. Flashcards, blueprint, quiz — done."
                : "Was dich sonst einen Abend kostet, macht Lernly bevor dein Kaffee kalt ist. Karteikarten, Blueprint, Quiz — fertig."}
            </CardDesc>
            <WaveBars className="mt-6" />
          </div>

          {/* Card 3 — span 2 */}
          <div className="ln-reveal ln-glass-card p-8 md:col-span-2">
            <div
              className="flex h-12 w-12 items-center justify-center"
              style={{ color: "rgba(255,255,255,0.5)" }}
              aria-hidden
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 1l22 22" />
                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <path d="M12 20h.01" />
              </svg>
            </div>
            <CardEyebrow>
              {isEn ? "Even when Wi-Fi gives up" : "Auch wenn's WLAN streikt"}
            </CardEyebrow>
            <CardTitle className="mt-3">
              {isEn ? "Runs without WiFi." : "Läuft auch ohne WLAN."}
            </CardTitle>
            <CardDesc>
              {isEn
                ? "Download as HTML. Runs on the train, in the library, wherever you end up studying — even without Wi-Fi."
                : "Download als HTML. Läuft im Zug, in der Bib, auf dem Klo — selbst wenn das WLAN streikt."}
            </CardDesc>
          </div>

          {/* Card 4 — span 2 (mono stats) */}
          <div className="ln-reveal ln-glass-card p-8 md:col-span-2">
            <CardEyebrow>
              {isEn ? "Not everything, just what matters" : "Nicht alles, nur das Richtige"}
            </CardEyebrow>
            <CardTitle className="mt-3">
              {isEn ? "What actually gets tested." : "Was wirklich geprüft wird."}
            </CardTitle>
            <div className="mt-5">
              <PrivacyRow label={isEn ? "Your material" : "Dein Skript"} value={isEn ? "400 slides" : "400 Folien"} />
              <PrivacyRow label={isEn ? "Exam-relevant" : "Prüfungsrelevant"} value="~40" />
              <PrivacyRow label={isEn ? "Lernly shows" : "Lernly zeigt"} value={isEn ? "which" : "welche"} />
              <PrivacyRow label={isEn ? "Time saved" : "Zeit gespart"} value={isEn ? "hours" : "Stunden"} />
            </div>
          </div>

          {/* Card 5 — span 2 (preview) */}
          <div className="ln-reveal ln-glass-card p-8 md:col-span-2">
            <CardEyebrow>
              {isEn ? "Slides in English? No problem." : "Folien auf Englisch? Egal."}
            </CardEyebrow>
            <CardTitle className="mt-3">
              {isEn ? "Any subject. Any language." : "Jedes Fach. Jede Sprache."}
            </CardTitle>
            <CardDesc>
              {isEn
                ? "Slides in English, notes in German? Doesn't matter. Lernly reads it all and builds your pack — business, medicine, law, whatever you study."
                : "Folien auf Englisch, Mitschrift auf Deutsch? Egal. Lernly liest alles und baut dein Paket — BWL, Medizin, Jura, was auch immer."}
            </CardDesc>
            <div className="mt-5 flex flex-wrap gap-1.5">
              <span className="ln-mono-tag">{isEn ? "Business" : "BWL"}</span>
              <span className="ln-mono-tag">{isEn ? "Medicine" : "Medizin"}</span>
              <span className="ln-mono-tag">{isEn ? "Law" : "Jura"}</span>
              <span className="ln-mono-tag">DE/EN</span>
              <span className="ln-mono-tag">{isEn ? "+all" : "+alle"}</span>
            </div>
          </div>

          {/* Card 6 — span 6 (wide): big "0€" on the left, copy on the right */}
          <div
            className="ln-reveal ln-glass-card md:col-span-6"
            style={{ padding: "44px 40px" }}
          >
            <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-10">
              <div
                className="ln-stat-gradient-violet shrink-0 leading-none"
                style={{
                  fontSize: "clamp(96px, 13vw, 120px)",
                  fontWeight: 800,
                  letterSpacing: "-4.8px",
                }}
              >
                0€
              </div>
              <div>
                <h3
                  className="text-white"
                  style={{
                    fontSize: "clamp(22px, 3.5vw, 32px)",
                    fontWeight: 600,
                    lineHeight: 1.2,
                    margin: 0,
                  }}
                >
                  {isEn
                    ? "2 free packs. Every month."
                    : "2 Pakete gratis. Jeden Monat."}
                </h3>
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: 400,
                    color: "rgb(228, 231, 239)",
                    lineHeight: 1.5,
                    margin: "6px 0 0",
                  }}
                >
                  {isEn
                    ? "Free Lernly resets every month. No credit card, no commitment."
                    : "Free-Tier resettet jeden Monat. Keine Kreditkarte, keine Verpflichtung."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CardEyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="ln-section-label" style={{ fontSize: 11, letterSpacing: "2.2px" }}>
      {children}
    </div>
  );
}

function CardTitle({
  children,
  className = "mt-3",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={
        "text-[22px] font-semibold leading-snug tracking-[-0.3px] text-white " +
        className
      }
    >
      {children}
    </h3>
  );
}

function CardDesc({ children }: { children: ReactNode }) {
  return (
    <p
      className="mt-2 text-[15px] leading-[1.55]"
      style={{ color: "var(--color-ln-mute)" }}
    >
      {children}
    </p>
  );
}

function PrivacyRow({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="ln-privacy-row">
      <span className="ln-privacy-label">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className="ln-privacy-value">{value}</span>
        {note && (
          <span className="text-[10px] ln-privacy-label">{note}</span>
        )}
      </span>
    </div>
  );
}

function WaveBars({ className = "" }: { className?: string }) {
  // Defer to client mount to sidestep SSR/browser float-serialization differences
  // that otherwise trigger a hydration mismatch on the inline style attribute.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={"h-[34px] " + className} aria-hidden />;
  }

  return (
    <div className={"flex items-end gap-1 " + className} aria-hidden>
      {Array.from({ length: 28 }).map((_, i) => {
        const h = 6 + Math.abs(Math.sin(i * 0.5 + i * 0.1)) * 28;
        const alpha = 0.25 + (i % 6) * 0.08;
        return (
          <span
            key={i}
            className="block w-[4px] rounded-full"
            style={{
              height: `${h.toFixed(1)}px`,
              backgroundColor: `rgba(91,184,216,${alpha.toFixed(2)})`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ========== HOW IT WORKS (pipeline) ========== */

function HowItWorks() {
  const isEn = useLanguage() === "en";
  const steps = isEn
    ? [
        {
          label: "Step 1",
          title: "Drop it in",
          desc: "8 PDFs open? Drop them all in — slides, notes, scripts. Lernly reads everything, you do not have to sort it first.",
        },
        {
          label: "Step 2",
          title: "Lernly sorts",
          desc: "Flashcards to flip, quiz with explanations, essay blueprint with templates. All built straight from your own material.",
        },
        {
          label: "Step 3",
          title: "Drill",
          desc: "Flip, test, repeat — until it sticks. Then you walk into the exam knowing you studied the right things.",
        },
      ]
    : [
        {
          label: "Schritt 1",
          title: "Reinwerfen",
          desc: "8 PDFs offen? Wirf sie alle rein — Slides, Mitschriften, Skripte. Lernly liest alles, du musst nichts sortieren.",
        },
        {
          label: "Schritt 2",
          title: "Lernly sortiert",
          desc: "Karteikarten zum Flippen, Quiz mit Erklärung, Essay-Blueprint mit Vorlagen. Alles direkt aus deinem Material.",
        },
        {
          label: "Schritt 3",
          title: "Üben",
          desc: "Flippen, testen, wiederholen — bis es sitzt. Dann gehst du in die Klausur und weißt: du hast das Richtige gelernt.",
        },
      ];

  return (
    <section id="how" className="scroll-mt-24 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <SectionHeading
          eyebrow={isEn ? "From chaos to exam-ready" : "Vom Chaos zur Prüfung"}
          boldPart={
            isEn
              ? "Flashcards in three steps."
              : "Karteikarten in drei Schritten."
          }
          italicPart={
            isEn ? "Doable even at 2 a.m." : "Auch um 2 Uhr nachts."
          }
        />

        <div className="ln-pipeline ln-reveal mt-14">
          {steps.map((s) => (
            <div key={s.label} className="ln-pipe-step">
              <span className="ln-pipe-step-label">{s.label}</span>
              <strong className="ln-pipe-step-title">{s.title}</strong>
              <p className="ln-pipe-step-desc">{s.desc}</p>
            </div>
          ))}
        </div>

        <p className="ln-reveal ln-pipeline-caption">
          {isEn
            ? "From your PDFs, not from Wikipedia. Built exactly for your exam."
            : "Aus deinen PDFs, nicht aus Wikipedia. Genau für deine Klausur."}
        </p>
      </div>
    </section>
  );
}

/* ========== RESULT SECTION ========== */

type ResultTab = "flashcards" | "overview" | "blueprint" | "simulator";
const RESULT_TABS: { id: ResultTab; label: string; emoji: string }[] = [
  { id: "flashcards", label: "Karteikarten", emoji: "🎴" },
  { id: "overview", label: "Übersicht", emoji: "🧠" },
  { id: "blueprint", label: "Blueprint", emoji: "📐" },
  { id: "simulator", label: "Übungsklausur", emoji: "🎯" },
];

function ResultSection({ pack, onReset }: { pack: StudyPack; onReset: () => void }) {
  const [tab, setTab] = useState<ResultTab>("flashcards");
  const isEn = useLanguage() === "en";
  const tabs = RESULT_TABS.map((item) => ({
    ...item,
    label:
      item.id === "flashcards"
        ? isEn
          ? "Flashcards"
          : "Karteikarten"
        : item.id === "overview"
          ? isEn
            ? "Overview"
            : "Übersicht"
          : item.label,
  }));
  return (
    <div className="px-6 py-20 md:py-24">
      <div className="mx-auto max-w-[920px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="ln-section-label" style={{ color: "var(--color-ln-sage)" }}>
              ✓ {isEn ? "Your study pack" : "Dein Lernpaket"}
            </span>
            <h2
              className="mt-3 font-bold leading-[1.05] tracking-[-1.5px] text-white"
              style={{ fontSize: "clamp(28px, 4.5vw, 44px)" }}
            >
              {pack.courseTitle}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="ln-mono-tag">
                {pack.flashcards.length} {isEn ? "cards" : "Karten"}
              </span>
              <span className="ln-mono-tag">
                {pack.overview.topics.reduce((n, t) => n + t.concepts.length, 0)}{" "}
                {isEn ? "concepts" : "Konzepte"}
              </span>
              <span className="ln-mono-tag">{pack.simulator.questions.length} Quiz</span>
              <span className="ln-mono-tag">
                {isEn
                  ? `${pack.essayBlueprint.parts.length}-part blueprint`
                  : `${pack.essayBlueprint.parts.length}-teiliger Blueprint`}
              </span>
            </div>
          </div>
          <button
            onClick={onReset}
            className="text-[13px] text-white/60 transition hover:text-white"
          >
            {isEn ? "Start over" : "Neu starten"}
          </button>
        </div>

        <div className="ln-glass-card mt-10 overflow-hidden">
          <div className="flex border-b border-white/10 px-4 md:px-8">
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={
                    "flex items-center gap-2 border-b-2 px-4 py-4 text-[14px] font-medium transition " +
                    (active
                      ? "border-[color:var(--color-ln-cyan)] text-white"
                      : "border-transparent text-white/50 hover:text-white/80")
                  }
                >
                  <span>{t.emoji}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-6 md:p-9">
            {tab === "flashcards" && (
              <FlashcardDeck cards={pack.flashcards} language={isEn ? "en" : "de"} />
            )}
            {tab === "overview" && (
              <OverviewView overview={pack.overview} language={isEn ? "en" : "de"} />
            )}
            {tab === "blueprint" && (
              <EssayBlueprintView
                blueprint={pack.essayBlueprint}
                language={isEn ? "en" : "de"}
              />
            )}
            {tab === "simulator" && (
              <ExamSimulator
                questions={pack.simulator.questions}
                language={isEn ? "en" : "de"}
              />
            )}
          </div>
        </div>

        <EmailCapture pack={pack} />
      </div>
    </div>
  );
}

/* ========== EMAIL CAPTURE + DOWNLOAD ========== */

function EmailCapture({ pack }: { pack: StudyPack }) {
  const language = useLanguage();
  const isEn = language === "en";
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    import("@/lib/supabase/browser").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (active) setAuthed(Boolean(data.user));
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const handleDownload = () => {
    const html = renderPackAsHtml(pack, language);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lernly-${slug(pack.courseTitle)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartSignup = () => {
    try {
      localStorage.setItem("lernly:pendingPack", JSON.stringify(pack));
    } catch {
      // localStorage might be unavailable; just go on.
    }
    window.location.href = "/login?next=/dashboard/claim";
  };

  if (authed === null) {
    return <div className="ln-glass-card mt-6 p-7 md:p-9 opacity-0" aria-hidden />;
  }

  if (!authed) {
    return (
      <div className="ln-glass-card mt-6 p-7 md:p-9">
        <div className="flex items-center gap-3">
          <span className="text-[24px]">🔒</span>
          <h3 className="text-[22px] font-semibold tracking-[-0.3px] text-white">
            {isEn
              ? "Save this pack — free account in 10 seconds"
              : "Paket speichern — kostenloser Account in 10 Sekunden"}
          </h3>
        </div>
        <p className="mt-2 text-[14px]" style={{ color: "var(--color-ln-mute)" }}>
          {isEn
            ? "Create a free account to download this pack, keep it in your dashboard, and generate more — for free."
            : "Erstelle einen kostenlosen Account, um dieses Paket herunterzuladen, im Dashboard zu behalten und weitere zu erstellen — gratis."}
        </p>
        <ul
          className="mt-4 space-y-1.5 text-[13px]"
          style={{ color: "var(--color-ln-ink-soft)" }}
        >
          <li>✓ {isEn ? "Save & download as HTML" : "Speichern & als HTML herunterladen"}</li>
          <li>✓ {isEn ? "Access from any device" : "Von jedem Gerät zugreifen"}</li>
          <li>✓ {isEn ? "2 packs free / month" : "2 Pakete gratis / Monat"}</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={handleStartSignup}
            className="rounded-lg bg-white px-5 py-2.5 text-[13.5px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
          >
            {isEn ? "Create free account →" : "Kostenlosen Account erstellen →"}
          </button>
          <a
            href="/login?next=/dashboard/claim"
            onClick={() => {
              try {
                localStorage.setItem(
                  "lernly:pendingPack",
                  JSON.stringify(pack),
                );
              } catch {}
            }}
            className="rounded-lg border border-white/20 bg-transparent px-5 py-2.5 text-[13.5px] font-medium text-white transition hover:bg-white/5"
          >
            {isEn ? "I already have an account" : "Ich hab schon einen Account"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="ln-glass-card mt-6 p-7 md:p-9">
      <div className="flex items-center gap-3">
        <span className="text-[24px]">🎉</span>
        <h3 className="text-[22px] font-semibold tracking-[-0.3px] text-white">
          {isEn ? "Saved to your dashboard" : "In deinem Dashboard gespeichert"}
        </h3>
      </div>
      <p className="mt-2 text-[14px]" style={{ color: "var(--color-ln-mute)" }}>
        {isEn
          ? "You can come back to this pack any time. Or download it for offline use right now."
          : "Du kannst jederzeit zu diesem Paket zurück. Oder lade es direkt offline runter."}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          onClick={handleDownload}
          className="rounded-lg bg-white px-5 py-2.5 text-[13.5px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
        >
          {isEn ? "Save offline" : "Offline speichern"}
        </button>
        <a
          href="/dashboard"
          className="rounded-lg border border-white/20 bg-transparent px-5 py-2.5 text-[13.5px] font-medium text-white transition hover:bg-white/5"
        >
          {isEn ? "Open dashboard" : "Dashboard öffnen"}
        </a>
      </div>
    </div>
  );
}

/* ========== PRICING PREVIEW STRIP (mobile-first anchor between viewports 2 and 3) ========== */
// TikTok-driven visitors usually decide whether to keep scrolling in the first
// 2-3 viewports. This 1-line strip surfaces the price anchor early so they
// don't bounce assuming "probably expensive" before they reach the real
// PricingSection further down.

function PricingPreviewStrip({ language }: { language: "en" | "de" }) {
  const isEn = language === "en";
  return (
    <section className="mx-auto w-full max-w-[1080px] px-6 py-6">
      <a
        href="#pricing"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4 transition hover:border-white/30"
        style={{
          background: "rgba(20, 22, 28, 0.55)",
          borderColor: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex flex-wrap items-baseline gap-4 text-[14px]">
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            {isEn ? "Pricing" : "Preise"}
          </span>
          <span className="font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
            <span className="font-bold text-white">0€</span>{" "}
            {isEn ? "Free" : "Gratis"}
          </span>
          <span className="opacity-30">·</span>
          <span className="font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
            <span className="font-bold text-white">4,99€</span>{" "}
            {isEn ? "Sprint" : "Sprint"}
          </span>
          <span className="opacity-30">·</span>
          <span className="font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
            <span className="font-bold text-white">14,99€</span>/{isEn ? "mo" : "mo"}{" "}
            Pro
          </span>
        </div>
        <span
          className="text-[13px] font-semibold transition group-hover:translate-x-0.5"
          style={{ color: "rgb(165,243,252)" }}
        >
          {isEn ? "All plans ↓" : "Alle Pläne ↓"}
        </span>
      </a>
    </section>
  );
}

/* ========== PRICING ========== */

type PricingBullet = {
  text: string;
  value?: string;
  bonus?: boolean;
};

type PricingTier = {
  plan: "free" | "sprint" | "pro" | "team";
  name: string;
  tagline: string;
  outcomeHeadline: string;
  price: string;
  priceSize: string;
  subtitle: string;
  anchorPrice?: string;
  valueStackTotal?: string;
  valueStackLabel?: string;
  badge?: string;
  bullets: PricingBullet[];
  ctaLabel: string;
  ctaFilled: boolean;
  highlighted?: boolean;
  comingSoon?: boolean;
};

const PRICING_TIERS_DE: PricingTier[] = [
  {
    plan: "free",
    name: "Gratis",
    tagline: "Probier ein Lernpaket",
    outcomeHeadline: "Ein Lernpaket testen",
    price: "0€",
    priceSize: "40px",
    subtitle: "für immer",
    bullets: [
      { text: "2 Pakete pro Monat" },
      { text: "Volle Qualität — kein Feature-Lock" },
      { text: "Visual Maps + Übungsklausur inklusive" },
      { text: "Kein Login zum Reinschnuppern" },
    ],
    ctaLabel: "Kostenlos starten",
    ctaFilled: false,
  },
  {
    plan: "sprint",
    name: "Sprint",
    tagline: "Eine Klausur. Eine Woche.",
    outcomeHeadline: "Eine Klausurwoche überleben",
    price: "4.99€",
    priceSize: "44px",
    subtitle: "einmalig",
    badge: "OHNE ABO",
    bullets: [
      { text: "5 Pakete in 7 Tagen" },
      { text: "Perfekt für die EINE Klausur nächste Woche" },
      { text: "Kein Abo, kein Vergessen-zu-Kündigen" },
      { text: "Visual Maps + Mnemonics + Klausur-Trainer" },
    ],
    ctaLabel: "Sprint kaufen",
    ctaFilled: false,
  },
  {
    plan: "pro",
    name: "Pro",
    tagline: "Das ganze Semester durchziehen",
    outcomeHeadline: "Semester durchziehen",
    price: "14.99€",
    priceSize: "48px",
    subtitle: "/ Monat",
    anchorPrice: "19.99€",
    badge: "BELIEBT",
    bullets: [
      { text: "25 Pakete pro Monat" },
      { text: "Visual Maps mit 2×2-Matrizen + Flow-Diagrammen" },
      { text: "Szenario-Klausurfragen mit echten Firmen" },
      { text: "Essay-Blueprint + interaktive Checkliste" },
      { text: "Extra-Pakete für 2,49€ statt 2,99€" },
    ],
    ctaLabel: "Pro holen",
    ctaFilled: true,
    highlighted: true,
  },
  {
    plan: "team",
    name: "Team",
    tagline: "Skripte mit der WG poolen",
    outcomeHeadline: "Lernpakete poolen",
    price: "24.99€",
    priceSize: "44px",
    subtitle: "/ Monat",
    anchorPrice: "34.99€",
    badge: "BALD",
    bullets: [
      { text: "60 Pakete pro Monat — shared zwischen 3 Sitzen" },
      { text: "Günstiger als 3× Pro einzeln" },
      { text: "Alles aus Pro inklusive" },
      { text: "Priorisierter Support" },
    ],
    ctaLabel: "Bald verfügbar",
    ctaFilled: false,
    comingSoon: true,
  },
];

const PRICING_TIERS_EN: PricingTier[] = [
  {
    plan: "free",
    name: "Free",
    tagline: "Try one pack",
    outcomeHeadline: "Test the output",
    price: "0€",
    priceSize: "40px",
    subtitle: "forever",
    bullets: [
      { text: "2 packs per month" },
      { text: "Full quality — no feature lock" },
      { text: "Visual Maps + Exam Trainer included" },
      { text: "No login to try" },
    ],
    ctaLabel: "Start free",
    ctaFilled: false,
  },
  {
    plan: "sprint",
    name: "Sprint",
    tagline: "One exam. One week.",
    outcomeHeadline: "Survive one exam week",
    price: "4.99€",
    priceSize: "44px",
    subtitle: "one-time",
    badge: "NO SUBSCRIPTION",
    bullets: [
      { text: "5 packs in 7 days" },
      { text: "Perfect for the ONE exam next week" },
      { text: "No subscription, no forgot-to-cancel" },
      { text: "Visual Maps + mnemonics + exam trainer" },
    ],
    ctaLabel: "Buy Sprint",
    ctaFilled: false,
  },
  {
    plan: "pro",
    name: "Pro",
    tagline: "For the whole semester",
    outcomeHeadline: "Push through the semester",
    price: "14.99€",
    priceSize: "48px",
    subtitle: "/ month",
    anchorPrice: "19.99€",
    badge: "POPULAR",
    bullets: [
      { text: "25 packs per month" },
      { text: "Visual Maps with 2×2 matrices + flow diagrams" },
      { text: "Scenario exam questions with real companies" },
      { text: "Essay blueprint + interactive checklist" },
      { text: "Extra packs for €2.49 instead of €2.99" },
    ],
    ctaLabel: "Get Pro",
    ctaFilled: true,
    highlighted: true,
  },
  {
    plan: "team",
    name: "Team",
    tagline: "Your study group, one account",
    outcomeHeadline: "Pool packs together",
    price: "24.99€",
    priceSize: "44px",
    subtitle: "/ month",
    anchorPrice: "34.99€",
    badge: "SOON",
    bullets: [
      { text: "60 packs per month — shared across 3 seats" },
      { text: "Cheaper than 3× Pro" },
      { text: "Everything in Pro included" },
      { text: "Priority support" },
    ],
    ctaLabel: "Coming soon",
    ctaFilled: false,
    comingSoon: true,
  },
];

function PricingSection({
  onActivateUpload,
  onOpenConnect,
}: {
  onActivateUpload: () => void;
  onOpenConnect: () => void;
}) {
  const isEn = useLanguage() === "en";
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let active = true;
    import("@/lib/supabase/browser").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (active) setAuthed(Boolean(data.user));
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const paidUpgradeHref = authed
    ? "/dashboard/settings"
    : "/login?next=/dashboard/settings";

  const handleTierCta = (plan: "free" | "sprint" | "pro" | "team") => {
    if (plan === "free") {
      onActivateUpload();
      return;
    }
    if (plan === "sprint") {
      // Sprint is a one-time credit purchase. Unauth → login then jump to
      // checkout, authed → fire checkout directly.
      if (!authed) {
        window.location.href = "/login?next=/dashboard?buy=sprint";
        return;
      }
      track("checkout_started", { plan: "sprint", source: "pricing_section" });
      fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credit: "sprint" }),
      })
        .then((r) => r.json())
        .then((j) => {
          if (j.url) window.location.href = j.url as string;
        })
        .catch(() => {
          window.location.href = paidUpgradeHref;
        });
      return;
    }
    window.location.href = paidUpgradeHref;
  };
  const tiers = isEn ? PRICING_TIERS_EN : PRICING_TIERS_DE;
  return (
    <section id="pricing" className="scroll-mt-24 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <SectionHeading
          eyebrow={isEn ? "What do you need?" : "Was brauchst du?"}
          boldPart={isEn ? "Try it for free." : "Probier's gratis."}
          italicPart={
            isEn
              ? "Upgrade only when it sticks."
              : "Upgrade nur wenn's sitzt."
          }
        />

        <div className="ln-reveal ln-founder-eyebrow mt-8">
          <span className="ln-founder-rocket" aria-hidden>
            🚀
          </span>
          <span className="ln-founder-text">
            <strong>{isEn ? "Founder pricing" : "Gründerpreis"}</strong>
            {" — "}
            {isEn
              ? `Pro stays at €14.99 (instead of €19.99) while we're still under the first ${FOUNDER_PRICING_LIMIT.toLocaleString()} paying students. Lifetime, not just the first month.`
              : `Solange wir unter den ersten ${FOUNDER_PRICING_LIMIT.toLocaleString("de-DE")} zahlenden Studis sind, bleibt Pro bei €14,99 statt €19,99. Lebenslang, nicht nur den ersten Monat.`}
          </span>
        </div>

        <div className="ln-stagger mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => (
            <PricingCard
              key={tier.name}
              tier={tier}
              onCta={() => handleTierCta(tier.plan)}
            />
          ))}
        </div>

        <BYOKBanner onOpenConnect={onOpenConnect} />

        <p
          className="ln-reveal mt-6 text-center text-[12px]"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          {isEn
            ? "Prices are final; no VAT charged (small business rule, § 19 UStG). Cancel anytime."
            : "Endpreise — gemäß § 19 UStG (Kleinunternehmerregelung) wird keine Umsatzsteuer berechnet. Jederzeit kündbar."}
        </p>
      </div>
    </section>
  );
}

/* ========== BYOK BANNER (under the pricing cards) ========== */

function BYOKBanner({ onOpenConnect }: { onOpenConnect: () => void }) {
  const isEn = useLanguage() === "en";
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    import("@/lib/supabase/browser").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (active) setAuthed(Boolean(data.user));
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const handleConnect = () => {
    if (authed === null) {
      onOpenConnect();
      return;
    }
    window.location.href = authed
      ? "/dashboard/settings"
      : "/login?next=/dashboard/settings";
  };

  return (
    <div id="connect" className="ln-reveal byok-banner scroll-mt-24 mt-8">
      <div className="byok-left">
        <div className="byok-icon">
          <ClaudeLogo size={22} />
        </div>
        <div>
          <span className="byok-bonus-eyebrow">
            🔑 {isEn ? "Bonus for power users" : "Bonus für Power-User"}
          </span>
          <h4>
            {isEn
              ? "Got your own Claude API key?"
              : "Du hast einen eigenen Claude API Key?"}
          </h4>
          <p>
            {isEn
              ? "Save €3/month and get unlimited packs."
              : "Spar €3/Monat und kriege unbegrenzte Pakete."}
          </p>
        </div>
      </div>
      <div className="byok-right">
        <div className="byok-prices">
          <span>
            Pro + Key: <strong>11.99€</strong> <s>14.99€</s>
          </span>
        </div>
        <button type="button" onClick={handleConnect} className="byok-btn">
          {isEn ? "Connect key →" : "Key verbinden →"}
        </button>
      </div>
    </div>
  );
}


/* ========== CONNECT MODAL (Claude API key) ========== */

function ConnectModal({
  apiKey,
  setApiKey,
  onClose,
}: {
  apiKey: string | null;
  setApiKey: (k: string | null) => void;
  onClose: () => void;
}) {
  const isEn = useLanguage() === "en";
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const connected = Boolean(apiKey);
  const showForm = !connected || editing;
  const maskedKey = apiKey
    ? `${apiKey.slice(0, 12)}…${apiKey.slice(-4)}`
    : "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed.startsWith("sk-ant-")) {
      setLocalError(
        isEn
          ? "That key does not look right. Anthropic keys start with sk-ant-."
          : "Der Key sieht nicht richtig aus. Anthropic-Keys beginnen mit sk-ant-.",
      );
      return;
    }
    localStorage.setItem(API_KEY_STORAGE, trimmed);
    setApiKey(trimmed);
    setDraft("");
    setEditing(false);
    setLocalError(null);
  };

  const handleDisconnect = () => {
    localStorage.removeItem(API_KEY_STORAGE);
    setApiKey(null);
    setDraft("");
    setEditing(false);
    setLocalError(null);
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={isEn ? "Connect Claude API key" : "Claude API Key verbinden"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <button
          type="button"
          className="modal-close"
          aria-label={isEn ? "Close" : "Schließen"}
          onClick={onClose}
        >
          ✕
        </button>

        <div className="modal-icon">
          <ClaudeLogo size={28} />
        </div>

        <h3>{isEn ? "Connect Claude API key" : "Claude API Key verbinden"}</h3>
        <p>
          {isEn
            ? "Connect your own Anthropic API key. No limits, no monthly cost from us — you only pay Anthropic for what you use."
            : "Verbinde deinen eigenen Anthropic API Key. Keine Limits, keine monatlichen Kosten bei uns — du zahlst nur was du nutzt, direkt an Anthropic."}
        </p>

        {showForm ? (
          <form onSubmit={handleSave}>
            <div className="modal-input-row">
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder="sk-ant-api03-…"
                className="api-key-input"
                value={draft}
                autoFocus
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (localError) setLocalError(null);
                }}
              />
              <button
                type="submit"
                className="save-key-btn"
                disabled={draft.trim().length === 0}
              >
                {isEn ? "Connect" : "Verbinden"}
              </button>
            </div>
            {localError && (
              <p
                className="mt-2 text-[13px]"
                style={{ color: "rgba(255, 140, 140, 0.9)" }}
              >
                {localError}
              </p>
            )}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="key-help-link"
            >
              {isEn
                ? "Create a key on console.anthropic.com →"
                : "Key erstellen auf console.anthropic.com →"}
            </a>
            <p className="small">
              {isEn
                ? "Your key stays local in your browser. Lernly does not store it."
                : "Dein Key bleibt lokal in deinem Browser. Lernly speichert ihn nicht."}
            </p>
            {connected && editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraft("");
                  setLocalError(null);
                }}
                className="text-link mt-3"
              >
                {isEn ? "Cancel" : "Abbrechen"}
              </button>
            )}
          </form>
        ) : (
          <div>
            <div className="connected-row">
              <span>✓ {isEn ? "Connected" : "Verbunden"}</span>
              <code>{maskedKey}</code>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-link"
              >
                {isEn ? "edit" : "ändern"}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-link"
              >
                {isEn ? "disconnect" : "trennen"}
              </button>
            </div>
            <p className="small">
              {isEn
                ? "All generations now run through your own key. Your Lernly quota is not used."
                : "Alle Generierungen laufen jetzt über deinen eigenen Key. Lernly-Kontingent wird nicht verbraucht."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PricingCard({
  tier,
  onCta,
}: {
  tier: PricingTier;
  onCta: () => void;
}) {
  const {
    name,
    tagline,
    outcomeHeadline,
    price,
    priceSize,
    subtitle,
    anchorPrice,
    valueStackTotal,
    valueStackLabel,
    badge,
    bullets,
    ctaLabel,
    ctaFilled,
    highlighted,
    comingSoon,
  } = tier;
  const badgeBg = comingSoon
    ? "rgba(255,255,255,0.85)"
    : "var(--color-ln-cyan)";
  return (
    <div
      className="ln-reveal ln-glass-card relative flex h-full flex-col"
      style={{
        padding: "28px 22px",
        ...(highlighted && {
          borderColor: "rgba(91, 184, 216, 0.35)",
          boxShadow: "0 0 40px rgba(91, 184, 216, 0.08)",
        }),
        ...(comingSoon && { opacity: 0.7 }),
      }}
    >
      {badge && (
        <span
          className="absolute"
          style={{
            top: "-12px",
            left: "50%",
            transform: "translateX(-50%)",
            background: badgeBg,
            color: "#000",
            fontSize: "11px",
            fontWeight: 700,
            borderRadius: "20px",
            padding: "3px 12px",
            letterSpacing: "0.05em",
            whiteSpace: "nowrap",
          }}
        >
          {badge}
        </span>
      )}

      <div
        className="text-[11px] font-semibold uppercase"
        style={{ color: "var(--color-ln-mute)", letterSpacing: "2.2px" }}
      >
        {name}
      </div>

      <div className="mt-3 text-[18px] font-semibold leading-[1.2] text-white">
        {outcomeHeadline}
      </div>

      <div
        className="mt-1 text-[12px] leading-[1.35]"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        {tagline}
      </div>

      <ul className="mt-6 ln-value-stack">
        {bullets.map((b) => (
          <li key={b.text} className="ln-value-stack-row">
            <span
              className="ln-value-stack-icon"
              style={{ color: b.bonus ? "#fbbf24" : "var(--color-ln-cyan)" }}
              aria-hidden
            >
              {b.bonus ? "🎁" : "✓"}
            </span>
            <span className="ln-value-stack-text">{b.text}</span>
            {b.value && <span className="ln-value-stack-value">{b.value}</span>}
          </li>
        ))}
      </ul>

      {valueStackTotal && (
        <div className="ln-value-stack-total">
          <span className="ln-value-stack-total-label">{valueStackLabel}</span>
          <span className="ln-value-stack-total-amount">{valueStackTotal}</span>
        </div>
      )}

      {/* Price block — anchor sits ABOVE the main price so the line never wraps. */}
      <div className="mt-auto pt-5">
        {anchorPrice && (
          <div className="ln-anchor-price-line">
            <span className="ln-anchor-price">{anchorPrice}</span>
            <span
              className="text-[11px] font-medium uppercase tracking-[0.15em]"
              style={{ color: "rgba(251,191,36,0.85)" }}
            >
              {comingSoon ? "Geplant" : "Founder"}
            </span>
          </div>
        )}
        <div className="flex items-baseline gap-1.5">
          <span
            className="ln-stat-gradient-blue font-bold leading-none"
            style={{ fontSize: priceSize, letterSpacing: "-1.6px" }}
          >
            {price}
          </span>
          <span
            className="text-[13px]"
            style={{ color: "var(--color-ln-mute)" }}
          >
            {subtitle}
          </span>
        </div>
      </div>

      <button
        onClick={comingSoon ? undefined : onCta}
        disabled={comingSoon}
        className={
          "mt-5 rounded-xl px-5 py-3 text-[14px] transition disabled:cursor-not-allowed " +
          (ctaFilled
            ? "bg-white font-semibold text-[color:var(--color-ln-bg-bot)] hover:bg-white/90"
            : "border bg-transparent font-medium text-white hover:bg-white/5")
        }
        style={
          ctaFilled
            ? undefined
            : { borderColor: "rgba(255, 255, 255, 0.14)" }
        }
      >
        {comingSoon ? (
          <span className="inline-flex items-center justify-center gap-1.5">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {ctaLabel}
          </span>
        ) : (
          ctaLabel
        )}
      </button>
    </div>
  );
}

/* ========== BOTTOM CTA ========== */

function BottomCta() {
  const isEn = useLanguage() === "en";
  return (
    <section className="relative overflow-hidden px-6 py-24 md:py-32">
      <div
        aria-hidden
        className="ln-glow pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(91,184,216,0.20), transparent 70%)",
        }}
      />
      <div className="relative">
        <SectionHeading
          boldPart={
            isEn ? "The exam is coming anyway." : "Die Klausur kommt egal."
          }
          italicPart={
            isEn ? "Drop in your slides now." : "Wirf jetzt deine Folien rein."
          }
          boldColor="var(--color-ln-ink-soft)"
          italicColor="#ffffff"
        />
        <div className="ln-reveal mt-10 flex flex-col items-center gap-5">
          <a
            href="#upload"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-[15px] font-semibold text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
          >
            {isEn ? "Drop in slides" : "Folien reinwerfen"}
            <span>↓</span>
          </a>
          <p
            className="text-[13px]"
            style={{ color: "var(--color-ln-mute)" }}
          >
            {isEn
              ? "Free · 2 packs per month · No credit card"
              : "Gratis · 2 Pakete pro Monat · Ohne Kreditkarte"}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ========== SOCIAL PROOF STRIP ========== */

function SocialProof() {
  const isEn = useLanguage() === "en";
  return (
    <div
      className="ln-reveal px-6 text-center"
      style={{
        padding: "24px 24px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span
        style={{
          fontSize: "14px",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {isEn
          ? "Born from a real exam at Uppsala University — built by a student for students."
          : "Entstanden während einer Klausur an der Uppsala Universität — von einem Studi für Studis gebaut."}
      </span>
    </div>
  );
}

/* ========== RESULT PREVIEW (3 static mockups) ========== */

function ResultPreview() {
  const isEn = useLanguage() === "en";
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <div className="ln-reveal">
          <span className="ln-section-label">
            {isEn ? "Your result" : "Dein Ergebnis"}
          </span>
          <h2
            className="mt-4 max-w-3xl font-bold leading-[1.05] tracking-[-1.92px] text-white"
            style={{ fontSize: "clamp(32px, 5.5vw, 64px)" }}
          >
            {isEn ? "Not another PDF." : "Nicht noch ein PDF."}{" "}
            <span className="lernly-italic" style={{ color: "var(--color-ln-ink-soft)" }}>
              {isEn ? "Something to click." : "Was zum Klicken."}
            </span>
          </h2>
        </div>

        <div className="ln-stagger mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          <PreviewCard
            title="Essay-Blueprint"
            desc={
              isEn
                ? "Timing, word counts, templates, and references in one structure."
                : "Zeitplan, Wortzahlen, Templates und Referenzen in einer Struktur."
            }
          >
            <BlueprintArtifactMockup />
          </PreviewCard>

          <PreviewCard
            title="Deep Drill"
            desc={
              isEn
                ? "Flashcards with categories, progress, and round-by-round ratings."
                : "Karteikarten mit Kategorien, Fortschritt und Bewertung pro Runde."
            }
          >
            <DeepDrillArtifactMockup />
          </PreviewCard>

          <PreviewCard
            title="Example Essays"
            desc={
              isEn
                ? "Ready scenarios so you see patterns, not just theory."
                : "Fertige Szenarien, damit du Muster statt nur Theorie siehst."
            }
          >
            <ExampleEssaysArtifactMockup />
          </PreviewCard>
        </div>
      </div>
    </section>
  );
}

function PreviewCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: ReactNode;
}) {
  const isEn = useLanguage() === "en";
  return (
    <div className="ln-reveal ln-preview-artifact-card">
      <div>
        <div className="ln-preview-artifact-label">
          {isEn ? "Preview" : "Vorschau"}
        </div>
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
      {children}
    </div>
  );
}

function BlueprintArtifactMockup() {
  const isEn = useLanguage() === "en";
  return (
    <div className="ln-artifact-page">
      <div className="ln-artifact-top">
        <span>Blueprint</span>
        <strong>{isEn ? "Correct Structure" : "Klausur-Struktur"}</strong>
      </div>
      <div className="ln-artifact-timebar">
        <span className="is-scenario" style={{ flex: 3.5 }}>
          {isEn ? "Scenario" : "Szenario"}
        </span>
        <span className="is-theory" style={{ flex: 3.5 }}>
          {isEn ? "Theory" : "Theorie"}
        </span>
        <span className="is-analysis" style={{ flex: 6 }}>
          {isEn ? "Analysis" : "Analyse"}
        </span>
        <span className="is-polish" style={{ flex: 1.8 }}>Polish</span>
      </div>
      <div className="ln-artifact-list">
        <div className="is-scenario">
          <span>1</span>
          <div>
            <strong>{isEn ? "Scenario" : "Szenario"}</strong>
            <p>
              {isEn
                ? "~350 words · industry context"
                : "~350 Wörter · Branchen-Kontext"}
            </p>
          </div>
        </div>
        <div className="is-theory">
          <span>2</span>
          <div>
            <strong>{isEn ? "Theory" : "Theorie"}</strong>
            <p>
              {isEn
                ? "Porter · Barney · A&T"
                : "Porter · Barney · A&T"}
            </p>
          </div>
        </div>
        <div className="is-analysis">
          <span>3</span>
          <div>
            <strong>{isEn ? "Main Event" : "Hauptteil"}</strong>
            <p>
              {isEn
                ? "500-700 words · take a stand"
                : "500-700 Wörter · Position beziehen"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeepDrillArtifactMockup() {
  const isEn = useLanguage() === "en";
  return (
    <div className="ln-artifact-page">
      <div className="ln-artifact-top">
        <span>{isEn ? "Flashcards" : "Karteikarten"}</span>
        <strong>{isEn ? "35 cards" : "35 Karten"}</strong>
      </div>
      <div className="ln-artifact-progress">
        <span style={{ width: "68%" }} />
      </div>
      <div className="ln-artifact-flashcard">
        <div>
          <span>Barney</span>
          <em>18 / 35</em>
        </div>
        <strong>
          {isEn
            ? "What are the 4 VRIO criteria?"
            : "Was sind die 4 VRIO-Kriterien?"}
        </strong>
        <p>
          {isEn
            ? "Valuable · Rare · Inimitable · Organized. Tesla's battery tech ticks all four."
            : "Valuable · Rare · Inimitable · Organized. Teslas Batterie-Tech erfüllt alle vier."}
        </p>
      </div>
      <div className="ln-artifact-actions">
        <span>{isEn ? "Again" : "Nochmal"}</span>
        <span>{isEn ? "Almost" : "Fast"}</span>
        <span>{isEn ? "Got it" : "Kann ich"}</span>
      </div>
    </div>
  );
}

function ExampleEssaysArtifactMockup() {
  const isEn = useLanguage() === "en";
  return (
    <div className="ln-artifact-page">
      <div className="ln-artifact-top">
        <span>{isEn ? "Sample essays" : "Essay-Beispiele"}</span>
        <strong>{isEn ? "3 scenarios" : "3 Szenarien"}</strong>
      </div>
      <div className="ln-artifact-tabs">
        <span className="is-active">
          {isEn ? "Diversification" : "Diversifikation"}
        </span>
        <span>{isEn ? "Going Global" : "Going Global"}</span>
        <span>{isEn ? "Make-or-Buy" : "Make-or-Buy"}</span>
      </div>
      <div className="ln-artifact-essay">
        <span>
          {isEn
            ? "Part 3: Analysis + Conclusion"
            : "Teil 3: Analyse + Schluss"}
        </span>
        <p>
          {isEn
            ? "Porter's 3 Tests show: most M&As fail the Better-Off Test — synergies were promised but never materialized."
            : "Porters 3 Tests zeigen: die meisten M&As scheitern am Better-Off-Test — versprochene Synergien blieben aus."}
        </p>
      </div>
      <div className="ln-artifact-tags">
        <span>{isEn ? "challenge" : "angreifen"}</span>
        <span>{isEn ? "defend" : "stützen"}</span>
      </div>
    </div>
  );
}

/* ========== PIPELINE CTA (after HowItWorks) ========== */

function PipelineCta({ onActivateUpload }: { onActivateUpload: () => void }) {
  const isEn = useLanguage() === "en";
  return (
    <div className="ln-reveal px-6 pb-10 text-center">
      <button
        type="button"
        onClick={onActivateUpload}
        className="rounded-full px-7 py-[14px] text-[16px] font-semibold transition hover:bg-white/90"
        style={{ background: "#ffffff", color: "#1a2647" }}
      >
        {isEn ? "Start with your PDFs →" : "Mit deinen PDFs starten →"}
      </button>
    </div>
  );
}

/* ========== FAQ ========== */

const FAQ_ITEMS_DE: { q: string; a: string }[] = [
  {
    q: "Was passiert mit meinen Dateien?",
    a: "Nichts. Deine PDFs werden nur für die Generierung verarbeitet und danach gelöscht. Nichts wird dauerhaft gespeichert.",
  },
  {
    q: "Welche Dateiformate funktionieren?",
    a: "PDF, TXT und MD. PowerPoint kannst du als PDF exportieren — geht in 10 Sekunden.",
  },
  {
    q: "Wie gut sind die Karteikarten?",
    a: "Konkret: jede Karte mit Quelle und Prüfungsrelevanz. Template-Sätze die du direkt im Essay verwenden kannst. Plus: in 2 Minuten fertig statt 45.",
  },
  {
    q: "Was ist der Unterschied zu ChatGPT?",
    a: "ChatGPT gibt dir Fließtext. Lernly gibt dir ein interaktives Lernsystem — Karteikarten zum Flippen, einen Prüfungssimulator mit Feedback und einen Essay-Blueprint mit fertigen Formulierungen.",
  },
];

const FAQ_ITEMS_EN: { q: string; a: string }[] = [
  {
    q: "What happens to my files?",
    a: "Nothing permanent. Your PDFs are processed only to generate the pack and are deleted afterwards. Nothing is stored long term.",
  },
  {
    q: "Which file formats work?",
    a: "PDF, TXT, and MD. Export your PowerPoint as PDF — takes 10 seconds.",
  },
  {
    q: "How good are the flashcards?",
    a: "Concretely: every card has its source and exam relevance. Template sentences you can drop straight into your essay. Plus: 2 minutes instead of 45.",
  },
  {
    q: "How is this different from ChatGPT?",
    a: "ChatGPT gives you long-form prose. Lernly gives you an interactive study system — flashcards to flip, an exam simulator with feedback, and an essay blueprint with ready phrasing.",
  },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);
  const isEn = useLanguage() === "en";
  const items = isEn ? FAQ_ITEMS_EN : FAQ_ITEMS_DE;
  return (
    <section id="faq" className="scroll-mt-24 px-6 py-20 md:py-28">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          }),
        }}
      />
      <div className="mx-auto max-w-[820px]">
        <SectionHeading
          eyebrow={isEn ? "Questions?" : "Fragen?"}
          boldPart={isEn ? "Short answers." : "Kurz beantwortet."}
        />

        <div className="ln-reveal ln-glass-card mt-10 overflow-hidden">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                style={{
                  borderBottom:
                    i === items.length - 1
                      ? "none"
                      : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left md:px-8"
                  aria-expanded={isOpen}
                >
                  <span className="text-[15px] font-semibold text-white md:text-[16px]">
                    {item.q}
                  </span>
                  <span
                    className="shrink-0 text-[18px] transition"
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                    }}
                    aria-hidden
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div
                    className="px-6 pb-5 text-[14px] leading-[1.6] md:px-8 md:pb-6"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ========== HTML EXPORT ========== */

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderPackAsHtml(pack: StudyPack, language: Language): string {
  const isEn = language === "en";
  const cards = pack.flashcards
    .map(
      (c) =>
        `<div class="card"><div class="q">${esc(c.question)}</div><div class="a">${c.answer}</div></div>`,
    )
    .join("");
  const topics = pack.overview.topics
    .map(
      (t) =>
        `<h3>${esc(t.name)}</h3>` +
        t.concepts
          .map(
            (c) =>
              `<div class="concept"><b>${esc(c.term)}</b> <span class="muted">(${esc(c.author)})</span><br/>${esc(c.definition)}</div>`,
          )
          .join(""),
    )
    .join("");
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><title>Lernly — ${esc(pack.courseTitle)}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#111827;line-height:1.55}
  h1{font-weight:600;letter-spacing:-1px;font-size:32px}
  h2{font-weight:500;margin-top:40px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
  h3{margin-top:24px;color:#374151}
  .card{border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:10px 0}
  .q{font-weight:500}
  .a{margin-top:8px;color:#374151}
  .concept{border-left:2px solid #6366f1;padding:4px 0 4px 12px;margin:8px 0}
  .muted{color:#71717a;font-size:12px}
</style></head><body>
<h1>${esc(pack.courseTitle)}</h1>
<p class="muted">${isEn ? "Study pack generated with Lernly" : "Lernpaket generiert mit Lernly"}</p>
<h2>${isEn ? "Flashcards" : "Karteikarten"}</h2>${cards}
<h2>${isEn ? "Overview" : "Übersicht"}</h2>${topics}
</body></html>`;
}
