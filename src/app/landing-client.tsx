"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import PackView from "@/components/pack/PackView";
import DemoPacksSection from "@/components/landing/DemoPacksSection";
import SectionHeading from "@/components/landing/SectionHeading";
import TurnstileWidget from "@/components/TurnstileWidget";
import { track } from "@/lib/analytics";
import { EXAM_FORMATS } from "@/lib/examFormats";
import LernlyLogo from "@/components/LernlyLogo";
import {
  Upload,
  FileText,
  Check,
  X,
  RotateCcw,
  AlertTriangle,
  Sparkles,
  Lock,
  Download,
  Info,
  Layers,
  MessageCircle,
  ListChecks,
  BookOpen,
  Target,
  ChevronDown,
} from "lucide-react";

type Language = "en" | "de";

const LANGUAGE_STORAGE = "lernly-language";
const LanguageContext = createContext<Language>("de");

function useLanguage() {
  return useContext(LanguageContext);
}

// The exam-format picker is now driven by the shared single-source-of-truth
// config (src/lib/examFormats.ts) — same three formats as the in-app
// /dashboard/new picker, with lucide icons. (The old bespoke SVG icons and the
// 5-format local list lived here and caused the landing/app drift.)

const MAX_FILES = 3;
const MAX_SIZE = 10 * 1024 * 1024;

// Founder pricing — cohort-based: as long as Lernly has fewer than
// FOUNDER_PRICING_LIMIT paying students, the listed prices are locked in for
// early adopters and won't creep up later. Honesty is the whole point.
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
  const [examType, setExamType] = useState<ExamType>("multiple_choice");
  const [isGenerating, setIsGenerating] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [pack, setPack] = useState<StudyPack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isConnectOpen, setConnectOpen] = useState(false);
  // EN temporarily disabled — pinned to German. Re-add setLanguage + the
  // SiteNav onLanguageChange wiring below to bring the language toggle back.
  const [language] = useState<Language>("de");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // Funnel: fire upload_started once when the visitor first adds a file. These
  // are anonymous (no account) — the TikTok/landing top-of-funnel.
  const uploadStartedRef = useRef(false);

  // BYOK is paused ("bald verfügbar") — nothing opens the ConnectModal right
  // now. Kept wired (closeConnect + the modal render below) so re-activating is
  // a one-line change: call openConnect from the BYOK banner again.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    // EN temporarily disabled — site is German-only for now.
    // Language is no longer restored from localStorage to avoid flipping to "en".
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
    if (accepted.length > 0 && !uploadStartedRef.current) {
      uploadStartedRef.current = true;
      track("upload_started", { anonymous: true, file_count: accepted.length });
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

  const handleGenerate = async () => {
    if (files.length === 0 || isGenerating) return;

    // Anonymous trial: a logged-out visitor generates a real pack on the
    // landing page BEFORE being asked to sign up — value first, account
    // after. The result (ResultSection below) becomes the signup CTA. The
    // backend handles the anonymous path (Turnstile + 1-pack/day/IP via
    // check_anonymous_quota); we just POST multipart here.
    try {
      const { createClient } = await import("@/lib/supabase/browser");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Authed user somehow on the marketing page — bounce to the real
        // dashboard flow (saves + counts against their quota). The root page
        // already redirects authed users; this is a defensive fallback.
        window.location.href = "/dashboard/new";
        return;
      }
    } catch (e) {
      // Auth probe failed (offline, Supabase hiccup) — treat as anonymous and
      // let the trial flow proceed rather than blocking the user.
      console.error("[landing] auth check failed, continuing as anonymous", e);
    }

    // Without an account only ONE file is allowed (server enforces ANON_MAX_FILES
    // = 1). Validate up-front with a clear hint so the user isn't surprised by a
    // server rejection mid-generation.
    if (files.length > 1) {
      setError(
        "Ohne Account kannst du 1 Datei testen. Logge dich ein, um mehrere Dateien zu kombinieren.",
      );
      return;
    }

    setIsGenerating(true);
    setCompleted(false);
    setError(null);
    const t0 = Date.now();
    track("anon_generate_started", {
      exam_type: examType,
      file_count: files.length,
    });

    try {
      const form = new FormData();
      form.append("examType", examType);
      form.append("files", files[0]);
      if (turnstileToken) form.append("cf-turnstile-response", turnstileToken);

      let res: Response;
      try {
        res = await fetch("/api/generate", { method: "POST", body: form });
      } catch {
        throw new Error(
          "Verbindung zum Generator fehlgeschlagen — bitte erneut versuchen.",
        );
      }

      const json = (await res.json().catch(() => ({}))) as {
        pack?: StudyPack;
        error?: string;
        reason?: string;
      };

      if (!res.ok || !json.pack) {
        track("anon_generate_failed", {
          reason: json.reason ?? `http_${res.status}`,
        });
        throw new Error(
          json.error ??
            "Generierung fehlgeschlagen — bitte erneut versuchen.",
        );
      }

      setPack(json.pack);
      setCompleted(true);
      try {
        sessionStorage.setItem("lernly-pack", JSON.stringify(json.pack));
      } catch {
        /* ignore storage quota */
      }
      track("anon_generate_completed", {
        duration_ms: Date.now() - t0,
        cards: json.pack.flashcards?.length ?? 0,
        exam_type: examType,
      });
      // Unified funnel step (anon + authed share this), so the PostHog funnel
      // has one "Paket fertig" event to break down by $device_type.
      track("pack_generated", {
        anonymous: true,
        cards: json.pack.flashcards?.length ?? 0,
        has_quiz: Boolean(json.pack.simulator?.questions?.length),
        exam_type: examType,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setIsGenerating(false);
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
              "Lade deine Vorlesungsfolien hoch und bekomme in 2 Minuten interaktive Karteikarten, einen Klausur-Simulator und einen Essay-Blueprint.",
            offers: [
              { "@type": "Offer", name: "Gratis", price: "0", priceCurrency: "EUR", description: "2 Pakete pro Monat" },
              { "@type": "Offer", name: "Einzelklausur", price: "4.99", priceCurrency: "EUR", description: "Einmalig — 5 Pakete, 14 Tage Zugang" },
              { "@type": "Offer", name: "Semester", price: "29.99", priceCurrency: "EUR", description: "60 Pakete pro Monat, 6 Monate Zugang" },
              { "@type": "Offer", name: "Monatlich", price: "8.99", priceCurrency: "EUR", description: "50 Pakete pro Monat" },
            ],
            featureList: [
              "Karteikarten aus Vorlesungsfolien generieren",
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
          {pack && <ResultSection pack={pack} onReset={clearPack} />}
          <ToolStackSection />
          <PricingSection onActivateUpload={activateUpload} />
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
        {/* Honest "freshly launched" signal — small, on-brand, links to feedback. */}
        <div className="ln-reveal mb-5 flex justify-center">
          <a
            href="mailto:info@lernly-app.de?subject=Lernly%20Feedback"
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold transition hover:border-white/25"
            style={{
              borderColor: "rgba(43,52,153,0.55)",
              background: "rgba(43,52,153,0.14)",
              color: "rgba(255,255,255,0.78)",
            }}
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--color-ln-sage, #4ade80)" }}
            />
            {isEn ? "Just launched · Beta" : "Frisch gelauncht · Beta"}
          </a>
        </div>

        <p
          className="ln-reveal mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "rgba(255, 255, 255, 0.5)" }}
        >
          {isEn
            ? "Your exam is closer than you think."
            : "Die Klausur ist näher als du denkst."}
        </p>

        <h1
          className="ln-reveal text-center font-bold leading-[1.08] tracking-[-2.4px]"
          style={{
            color: "rgba(255, 255, 255, 0.7)",
            // Each sentence is its own block → exactly TWO lines on every width.
            // sm:whitespace-nowrap forbids a sentence from wrapping on desktop,
            // so the H1 can NEVER become 3 lines (a too-long line would overflow
            // rather than wrap — the 6.2vw term keeps the longest line, "Geh
            // vorbereitet in die Klausur." (31 chars), inside the viewport up to
            // the 80px cap). Mobile keeps wrapping (no nowrap below sm).
            fontSize: "clamp(30px, 6.2vw, 80px)",
          }}
        >
          <span className="block sm:whitespace-nowrap">
            {isEn ? "Drop in your slides." : "Wirf deine Folien rein."}
          </span>
          <span
            className="block sm:whitespace-nowrap"
            style={{ color: "rgb(255, 255, 255)" }}
          >
            {isEn
              ? "Walk into the exam prepared."
              : "Geh vorbereitet in die Klausur."}
          </span>
        </h1>

        <p
          className="ln-reveal mx-auto mt-8 max-w-[840px] text-center leading-[1.4] text-white"
          style={{ fontSize: "clamp(17px, 2vw, 20px)" }}
        >
          {isEn
            ? "Add your past exam — and practice flashcards & quizzes in the style of your real test. Done in 2 minutes, from your own material."
            : "Leg deine Altklausur dazu — und übe Karteikarten & Quiz im Stil deiner echten Prüfung. Fertig in 2 Minuten, aus deinem eigenen Stoff."}
        </p>

        <div className="ln-hero-actions ln-reveal mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onActivateUpload}
            className="rounded-full px-7 py-[14px] text-[16px] font-semibold transition hover:bg-white/90"
            style={{ background: "#ffffff", color: "#1a2647" }}
          >
            {isEn ? "Try it free →" : "Jetzt gratis testen →"}
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
  // Shared format config — identical to the in-app /dashboard/new picker.
  const examOptions = EXAM_FORMATS;
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
                ? "Sign up to upload your slides"
                : "Erstelle einen Account, um deine Folien hochzuladen"}
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
            <Upload size={22} strokeWidth={1.6} aria-hidden />
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
              <FileText size={14} strokeWidth={1.9} aria-hidden className="text-white/70" />
              <span className="max-w-[180px] truncate">{f.name}</span>
              <Check size={14} strokeWidth={2.2} aria-hidden style={{ color: "var(--color-ln-sage)" }} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="ml-1 inline-flex text-white/50 transition hover:text-white"
                aria-label={isEn ? "Remove" : "Entfernen"}
              >
                <X size={14} strokeWidth={2} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-black/20 p-1.5">
        {examOptions.map((opt) => {
          const active = examType === opt.value && !opt.locked;
          const IconComp = opt.locked ? Lock : opt.Icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                if (opt.locked) return;
                setExamType(opt.value);
              }}
              disabled={opt.locked}
              aria-disabled={opt.locked}
              title={opt.locked ? "Bald verfügbar" : undefined}
              className={
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition " +
                (opt.locked
                  ? "cursor-not-allowed text-white/30"
                  : active
                    ? "bg-white/10 text-white ring-1 ring-white/15"
                    : "text-white/60 hover:text-white")
              }
            >
              <IconComp size={15} strokeWidth={1.9} aria-hidden />
              <span className="hidden sm:inline">{opt.shortLabel}</span>
              {opt.locked && (
                <span className="hidden text-[10px] uppercase tracking-wide text-white/30 md:inline">
                  bald
                </span>
              )}
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
          <span
            className="inline-flex items-center gap-2"
            style={{ fontSize: "14px", color: "rgba(255, 130, 130, 0.9)" }}
          >
            <AlertTriangle size={15} strokeWidth={2} aria-hidden />
            {error}
          </span>
          <button
            onClick={onGenerate}
            disabled={files.length === 0}
            className="inline-flex items-center gap-1.5"
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
            <RotateCcw size={14} strokeWidth={2} aria-hidden />
            {isEn ? "Try again" : "Erneut versuchen"}
          </button>
        </div>
      )}

      <button
        onClick={onGenerate}
        disabled={files.length === 0}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: "#2B3499" }}
      >
        <Sparkles size={16} strokeWidth={2} aria-hidden />
        <span>
          {isEn ? "Create pack (about 2 min)" : "Paket erstellen (ca. 2 Min)"}
        </span>
      </button>

      <p
        className="mt-3 text-center text-[12px]"
        style={{ color: "var(--color-ln-mute)" }}
      >
        {isEn
          ? "Free · no account needed · 1 file to try"
          : "Kostenlos · ohne Account · 1 Datei zum Testen"}
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
      label: isEn ? "Lecture slides" : "Vorlesungsfolien",
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

/* ========== ALTKLAUSUR-RELEVANZ (Lernlys biggest differentiator) ========== */
// Replaces the old "active recall / retention curve" comparison. Shows the one
// thing no other tool does: read the user's past exam, rank topics by exam
// probability, and mirror the exam's question style. Example data only —
// framed as illustrative, no guarantee, no named competitor. teal = "kam dran".

function ComparisonSection() {
  const isEn = useLanguage() === "en";
  const teal = "rgb(91, 184, 216)";

  const topics = [
    {
      name: isEn ? "Competitive dynamics (Chen)" : "Wettbewerbsdynamik (Chen)",
      pct: 34,
      hit: true,
    },
    { name: isEn ? "BCG matrix" : "BCG-Matrix", pct: 22, hit: true },
    { name: "Five Forces", pct: 15, hit: false },
    { name: isEn ? "Market dynamics" : "Marktdynamik", pct: 11, hit: false },
  ];

  const options = [
    { key: "A", text: "Five Forces", correct: false },
    { key: "B", text: isEn ? "BCG matrix" : "BCG-Matrix", correct: false },
    {
      key: "C",
      text: isEn ? "Competitive dynamics" : "Wettbewerbsdynamik",
      correct: true,
    },
    {
      key: "D",
      text: isEn ? "Market segmentation" : "Marktsegmentierung",
      correct: false,
    },
  ];

  const cardStyle = {
    background: "#141930",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "16px",
  } as const;

  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <SectionHeading
          eyebrow={isEn ? "No other tool can do this" : "Das kann kein anderes Tool"}
          boldPart={isEn ? "Stop guessing" : "Hör auf zu raten,"}
          boldColor="var(--color-ln-ink-soft)"
          italicPart={isEn ? "what's on the exam." : "was drankommt."}
          italicColor="#ffffff"
        />

        <p
          className="ln-reveal mx-auto mt-6 max-w-[760px] text-center leading-[1.45]"
          style={{
            fontSize: "clamp(16px, 1.9vw, 19px)",
            color: "rgba(255,255,255,0.72)",
          }}
        >
          {isEn
            ? "Add your past exam. Lernly spots which topics actually get tested — and builds cards & quizzes right on those, in the style of your real exam."
            : "Leg deine Altklausur dazu. Lernly erkennt, welche Themen wirklich geprüft werden — und baut Karten & Quiz genau darauf, im Stil deiner echten Prüfung."}
        </p>

        {/* Two-part visual, styled like the real app (solid #141930 surfaces) */}
        <div className="mx-auto mt-12 grid max-w-[1000px] grid-cols-1 gap-4 md:grid-cols-2">
          {/* A) Topic ranking by exam probability */}
          <div className="ln-reveal p-6" style={cardStyle}>
            <div className="mb-5 flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: "rgba(91,184,216,0.12)" }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={teal}
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <line x1="12" y1="20" x2="12" y2="10" />
                  <line x1="18" y1="20" x2="18" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="16" />
                </svg>
              </span>
              <div
                className="text-[14px] font-semibold"
                style={{ color: "#EAEDF7", fontFamily: "var(--font-display)" }}
              >
                {isEn
                  ? "Topics by exam probability"
                  : "Themen nach Klausur-Wahrscheinlichkeit"}
              </div>
            </div>

            <div className="space-y-3.5">
              {topics.map((t) => (
                <div key={t.name}>
                  <div className="mb-1.5 flex items-start gap-2">
                    <span
                      className="min-w-0 text-[13.5px] leading-snug"
                      style={{ color: "rgba(255,255,255,0.88)" }}
                    >
                      {t.name}
                      {t.hit && (
                        <span
                          className="ml-1.5 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 align-middle text-[11px] font-semibold"
                          style={{ background: "rgba(91,184,216,0.12)", color: teal }}
                        >
                          <span aria-hidden>✦</span>
                          {isEn ? "was tested" : "kam dran"}
                        </span>
                      )}
                    </span>
                    <span
                      className="ml-auto shrink-0 pt-0.5 text-[13px] font-semibold tabular-nums"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      {t.pct}%
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((t.pct / 34) * 100)}%`,
                        background: t.hit ? teal : "rgba(255,255,255,0.22)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p
              className="mt-5 text-[11.5px] leading-snug"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {isEn
                ? "Focus from your past exam — example, no guarantee."
                : "Schwerpunkt aus deiner Altklausur — Beispiel, keine Garantie."}
            </p>
          </div>

          {/* B) Example question in the exam's style */}
          <div className="ln-reveal p-6" style={cardStyle}>
            <div
              className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold"
              style={{ color: teal }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={teal}
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="15 10 20 15 15 20" />
                <path d="M4 4v7a4 4 0 0 0 4 4h12" />
              </svg>
              {isEn
                ? "Question in your past-exam style"
                : "Frage im Stil deiner Altklausur"}
            </div>

            <div
              className="rounded-xl p-3.5 text-[13px] leading-relaxed"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {isEn
                ? "Sony launches the PS5; months later Microsoft counters with the Xbox Series X at the same price."
                : "Sony bringt die PS5, Microsoft kontert Monate später mit der Xbox Series X zum gleichen Preis."}
            </div>

            <p
              className="mt-3.5 text-[14px] font-semibold leading-snug"
              style={{ color: "#EAEDF7" }}
            >
              {isEn
                ? "Which concept by Chen (1996) describes this best?"
                : "Welches Konzept von Chen (1996) beschreibt das am besten?"}
            </p>

            <div className="mt-3 space-y-2">
              {options.map((o) => (
                <div
                  key={o.key}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px]"
                  style={
                    o.correct
                      ? {
                          background: "rgba(91,184,216,0.1)",
                          border: "1px solid rgba(91,184,216,0.45)",
                          color: "#EAEDF7",
                        }
                      : {
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.75)",
                        }
                  }
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                    style={
                      o.correct
                        ? { background: teal, color: "#0F1322" }
                        : {
                            background: "rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.6)",
                          }
                    }
                  >
                    {o.correct ? (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0F1322"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      o.key
                    )}
                  </span>
                  <span>{o.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Caption */}
        <p className="ln-reveal mx-auto mt-10 max-w-[720px] text-center text-[17px] font-semibold leading-snug md:text-[19px]">
          <span style={{ color: "rgba(255,255,255,0.55)" }}>
            {isEn
              ? "Other tools give you everything. "
              : "Andere Tools geben dir alles. "}
          </span>
          <span style={{ color: "#ffffff" }}>
            {isEn
              ? "Lernly gives you what's on the exam."
              : "Lernly gibt dir das, was drankommt."}
          </span>
        </p>

        {/* CTA */}
        <div className="ln-reveal mt-7 flex justify-center">
          <a
            href="#upload"
            className="rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-[#0F1535] transition hover:bg-white/90"
          >
            {isEn ? "Try it free →" : "Jetzt gratis testen →"}
          </a>
        </div>
      </div>
    </section>
  );
}

// =========================================================================
// ToolStackSection — value-stack right before pricing. The four real tools a
// student otherwise juggles (by name + function + real cost, muted) collapse
// into one highlighted Lernly card that bundles all of it "ab gratis" + the
// exclusive Altklausur-Relevanz topper. Brand names as plain text only (no
// logos), factual prices, no bashing — DACH-credible, legally conservative.
// =========================================================================
function ToolStackSection() {
  const isEn = useLanguage() === "en";
  const indigo = "var(--color-primary-bright)";
  const teal = "rgb(91, 184, 216)";

  // Brand names are plain text (no logos). Costs are factual — some are time/
  // effort rather than €. No strikethrough, no bashing.
  const tools = [
    {
      icon: Layers,
      name: "Anki",
      fn: isEn
        ? "Flashcards + spaced repetition"
        : "Karteikarten + Spaced Repetition",
      cost: isEn ? "Free — every card by hand" : "Gratis — jede Karte selbst",
    },
    {
      icon: MessageCircle,
      name: "ChatGPT / Claude",
      fn: isEn ? "Explains what you don't get" : "Erklärt, was du nicht verstehst",
      cost: isEn ? "~€20/month" : "~20 €/Monat",
    },
    {
      icon: ListChecks,
      name: "Quizlet",
      fn: isEn ? "Quiz yourself" : "Sich abfragen (Quiz)",
      cost: isEn ? "Paid plan" : "Kostenpflichtiger Plan",
    },
    {
      icon: BookOpen,
      name: "Notion & Co.",
      fn: isEn ? "Summaries · notes" : "Zusammenfassung / Notizen",
      cost: isEn ? "You type it all yourself" : "Du tippst alles selbst",
    },
  ];

  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <SectionHeading
          eyebrow={isEn ? "One tool instead of four" : "Ein Tool statt vier"}
          boldPart={isEn ? "Four tools for one exam." : "Vier Tools für eine Klausur."}
          italicPart={isEn ? "Or one." : "Oder eins."}
        />

        <p
          className="ln-reveal mx-auto mt-6 max-w-[680px] text-center leading-[1.45]"
          style={{
            fontSize: "clamp(16px, 1.9vw, 19px)",
            color: "rgba(255,255,255,0.72)",
          }}
        >
          {isEn
            ? "Four apps, each for one thing. Lernly does it all — from your material."
            : "Vier Apps, jede für eine Sache. Lernly macht alles — aus deinem Material."}
        </p>

        {/* The real stack you'd otherwise juggle — name + function + cost, muted */}
        <div className="ln-reveal mx-auto mt-12 grid max-w-[1000px] grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.name}
                className="flex flex-col p-4 sm:p-5"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "16px",
                  opacity: 0.92,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <Icon size={16} strokeWidth={1.9} color="rgba(255,255,255,0.5)" />
                  </span>
                  <span
                    className="min-w-0 text-[15px] font-semibold leading-tight"
                    style={{
                      color: "rgba(255,255,255,0.92)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {t.name}
                  </span>
                </div>
                <div
                  className="mt-2.5 text-[12.5px] leading-snug"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {t.fn}
                </div>
                <div className="mt-auto pt-3">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    {t.cost}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Everything flows into one */}
        <div className="ln-reveal mt-5 flex justify-center" aria-hidden>
          <ChevronDown size={22} strokeWidth={1.9} color="rgba(255,255,255,0.3)" />
        </div>

        {/* The one that bundles it all — highlighted indigo */}
        <div
          className="ln-reveal mx-auto mt-5 max-w-[1000px] p-6 md:p-8"
          style={{
            background:
              "linear-gradient(135deg, rgba(110,128,242,0.10), transparent 55%), #141930",
            border: "1px solid rgba(110,128,242,0.35)",
            borderRadius: "20px",
            boxShadow: "0 0 40px rgba(110,128,242,0.12)",
          }}
        >
          <div className="flex items-start gap-3.5">
            <LernlyLogo variant="icon" size={44} alt="" className="shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h3
                  className="text-[19px] font-bold leading-tight sm:text-[22px]"
                  style={{ color: "#ffffff", fontFamily: "var(--font-display)" }}
                >
                  {isEn
                    ? "All in one. From your material."
                    : "Alles in einem. Aus deinem Material."}
                </h3>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold"
                  style={{ background: "rgba(110,128,242,0.16)", color: indigo }}
                >
                  {isEn ? "from free" : "ab gratis"}
                </span>
              </div>
              <p
                className="mt-2 text-[14px] leading-relaxed sm:text-[15px]"
                style={{ color: "var(--color-ln-ink-soft)" }}
              >
                {isEn
                  ? "Upload your slides — flashcards, quiz, explanations and overview come back ready, plus what's actually on your exam."
                  : "Du lädst deine Folien hoch — Karteikarten, Quiz, Erklärungen und Überblick kommen fertig zurück, plus das, was in deiner Klausur drankommt."}
              </p>
            </div>
          </div>

          {/* Topper — exclusive Altklausur-Relevanz (teal, ties to the section above) */}
          <div
            className="mt-5 flex items-start gap-3 rounded-2xl p-4"
            style={{
              background: "rgba(91,184,216,0.08)",
              border: "1px solid rgba(91,184,216,0.28)",
            }}
          >
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "rgba(91,184,216,0.14)" }}
            >
              <Target size={18} strokeWidth={1.9} color={teal} />
            </span>
            <div className="min-w-0">
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={{ background: "rgba(91,184,216,0.14)", color: teal }}
              >
                {isEn ? "Only in Lernly" : "Nur in Lernly"}
              </span>
              <p
                className="mt-1.5 text-[13.5px] leading-snug sm:text-[14px]"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                {isEn
                  ? "Learns from your past exam what gets tested — and asks in your real exam's style."
                  : "Lernt aus deiner Altklausur, was drankommt — und fragt im Stil deiner echten Prüfung."}
              </p>
            </div>
          </div>
        </div>

        {/* Honest closing — the stack's real cost vs. all-in-one (punchline prominent) */}
        <div className="ln-reveal mx-auto mt-10 max-w-[760px] text-center">
          <p
            className="leading-relaxed"
            style={{
              fontSize: "clamp(15px, 1.7vw, 16px)",
              color: "rgba(255,255,255,0.62)",
            }}
          >
            {isEn
              ? "An AI subscription ~€20/month, plus quiz and study tools — and you still build the flashcards yourself."
              : "Ein KI-Abo ~20 €/Monat, dazu Quiz- und Lern-Tools — Karteikarten baust du trotzdem selbst."}
          </p>
          <p
            className="mt-2.5 font-semibold leading-snug"
            style={{
              fontSize: "clamp(18px, 2.4vw, 22px)",
              color: "#ffffff",
              fontFamily: "var(--font-display)",
            }}
          >
            {isEn
              ? "With Lernly it's all included — from free."
              : "Bei Lernly ist alles drin — ab gratis."}
          </p>
        </div>

        {/* CTA */}
        <div className="ln-reveal mt-7 flex justify-center">
          <a
            href="#upload"
            className="rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-[#0F1535] transition hover:bg-white/90"
          >
            {isEn ? "Try it free →" : "Jetzt gratis testen →"}
          </a>
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
          desc: "8 lectures open? Drop them all in — slides, scripts, notes. Lernly reads everything, you do not have to sort it first.",
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
          desc: "8 Vorlesungen offen? Wirf sie alle rein — Folien, Skripte, Mitschriften. Lernly liest alles, du musst nichts sortieren.",
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
            <span className="sm:whitespace-nowrap">
              {isEn
                ? "Flashcards in three steps."
                : "Karteikarten in drei Schritten."}
            </span>
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
            ? "From your slides, not from Wikipedia. Built exactly for your exam."
            : "Aus deinen Folien, nicht aus Wikipedia. Genau für deine Klausur."}
        </p>
      </div>
    </section>
  );
}

/* ========== RESULT SECTION ========== */

// Fullscreen result overlay — once an anonymous visitor's pack is generated, a
// clean full-screen surface with its OWN slim app chrome (NOT the marketing
// navbar) slides over the landing, so it feels like "I'm in the product now".
// Renders the REAL PackView; closing returns to the landing. The persistent
// "Speichern (kostenlos)" CTA opens the save modal (value first, then gate).
function ResultSection({ pack, onReset }: { pack: StudyPack; onReset: () => void }) {
  const language = useLanguage();
  const isEn = language === "en";
  const [showSave, setShowSave] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);

  // Lock background scroll while the overlay is open.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Esc closes the save modal first, then the overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setShowSave((open) => {
        if (open) return false;
        onReset();
        return open;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onReset]);

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col"
      style={{ background: "#0F1322" }}
    >
      {/* Slim app chrome — deliberately NOT the marketing SiteNav. */}
      <header
        className="flex items-center gap-3 border-b px-4 py-3 sm:px-6"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0C0F1C" }}
      >
        <LernlyLogo size={24} alt="" className="shrink-0" />
        <span
          className="flex-1 truncate text-[13px] font-semibold tracking-[0.02em]"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          {isEn ? "Your study pack" : "Dein Lernpaket"}
        </span>
        <button
          onClick={() => setShowSave(true)}
          className="hidden shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-90 sm:inline-flex"
          style={{ background: "#2B3499" }}
        >
          <Download size={15} strokeWidth={2} aria-hidden />
          {isEn ? "Save (free)" : "Speichern (kostenlos)"}
        </button>
        <button
          onClick={() => setShowSave(true)}
          aria-label={isEn ? "Save pack" : "Paket speichern"}
          className="inline-flex shrink-0 items-center justify-center rounded-xl p-2 text-white sm:hidden"
          style={{ background: "#2B3499" }}
        >
          <Download size={16} strokeWidth={2} aria-hidden />
        </button>
        <button
          onClick={onReset}
          aria-label={isEn ? "Close" : "Schließen"}
          className="inline-flex shrink-0 items-center justify-center rounded-xl p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
        >
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </header>

      {/* Scrollable product surface — the real PackView. */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-6 sm:py-8">
          {!hintDismissed && (
            <div
              className="mb-5 flex items-start gap-3 rounded-2xl border px-4 py-3"
              style={{
                borderColor: "rgba(43,52,153,0.45)",
                background: "rgba(43,52,153,0.12)",
              }}
            >
              <Info
                size={16}
                strokeWidth={2}
                aria-hidden
                className="mt-0.5 shrink-0"
                style={{ color: "#9aa6ff" }}
              />
              <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-white/80">
                {isEn
                  ? "This is your pack — Hub for the overview, Flashcards to flip, Exam Trainer to test yourself. Tap a mode below to start."
                  : "Das ist dein Paket — Hub für den Überblick, Karteikarten zum Flippen, Übungsklausur zum Selbsttesten. Tipp unten auf einen Modus."}
              </div>
              <button
                onClick={() => setHintDismissed(true)}
                aria-label={isEn ? "Dismiss" : "Ausblenden"}
                className="shrink-0 text-white/40 transition hover:text-white"
              >
                <X size={15} strokeWidth={2} aria-hidden />
              </button>
            </div>
          )}

          <PackView pack={pack} language={isEn ? "en" : "de"} />
        </div>
      </div>

      {showSave && <SaveModal pack={pack} onClose={() => setShowSave(false)} />}
    </div>
  );
}

/* ========== SAVE MODAL (signup-to-save, "sanft") ========== */

// Clean signup modal in the app design system (Indigo CTA, #141930 surface,
// lucide-Lock — no emojis). Opens only on an explicit Save/Download click
// (persistent CTA in the overlay chrome) — value first, then the gate. On
// signup the anonymous pack is carried over to the new account via
// /dashboard/claim (lernly:pendingPack → /api/packs/save).
function SaveModal({ pack, onClose }: { pack: StudyPack; onClose: () => void }) {
  const language = useLanguage();
  const isEn = language === "en";
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    import("@/lib/supabase/browser").then(({ createClient }) => {
      createClient()
        .auth.getUser()
        .then(({ data }) => {
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

  const startSignup = (source: string) => {
    track("signup_started", { source });
    try {
      localStorage.setItem("lernly:pendingPack", JSON.stringify(pack));
    } catch {
      // localStorage might be unavailable; just go on.
    }
    window.location.href = "/login?next=/dashboard/claim";
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[130] flex items-center justify-center px-4 py-6"
    >
      <button
        aria-label={isEn ? "Close" : "Schließen"}
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      />
      <div
        className="relative w-full max-w-[440px] overflow-hidden rounded-3xl border p-7 text-white"
        style={{
          background: "#141930",
          borderColor: "rgba(255,255,255,0.10)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
        }}
      >
        <button
          onClick={onClose}
          aria-label={isEn ? "Close" : "Schließen"}
          className="absolute right-4 top-4 inline-flex text-white/50 transition hover:text-white"
        >
          <X size={18} strokeWidth={2} aria-hidden />
        </button>

        {authed === null ? (
          <div className="py-12 text-center text-[13px] text-white/40">…</div>
        ) : !authed ? (
          <>
            <div
              className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: "rgba(43,52,153,0.20)", color: "#9aa6ff" }}
            >
              <Lock size={20} strokeWidth={2} aria-hidden />
            </div>
            <h3
              className="text-[20px] font-semibold leading-tight"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.4px" }}
            >
              {isEn
                ? "Save your pack — free account in 10 seconds"
                : "Speichere dein Paket — kostenloser Account in 10 Sekunden"}
            </h3>
            <p className="mt-2 text-[14px]" style={{ color: "var(--color-text-dim, #9098B6)" }}>
              {isEn
                ? "Keep this pack in your dashboard, study it from any device, and create more — free."
                : "Behalte dieses Paket im Dashboard, lerne von jedem Gerät und erstelle weitere — gratis."}
            </p>
            <ul className="mt-4 space-y-2 text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>
              {[
                isEn ? "Saved to your dashboard" : "Im Dashboard gespeichert",
                isEn ? "Access from any device" : "Von jedem Gerät zugreifen",
                isEn ? "2 packs free / month" : "2 Pakete gratis / Monat",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check size={15} strokeWidth={2.2} aria-hidden style={{ color: "var(--color-ln-sage)" }} />
                  {t}
                </li>
              ))}
            </ul>
            <button
              onClick={() => startSignup("anon_result_cta")}
              className="mt-5 flex w-full items-center justify-center rounded-xl px-5 py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "#2B3499" }}
            >
              {isEn ? "Create free account" : "Kostenlosen Account erstellen"}
            </button>
            <button
              onClick={() => startSignup("anon_result_cta_existing")}
              className="mt-2 w-full rounded-xl border px-5 py-3 text-[14px] font-medium text-white transition hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.14)" }}
            >
              {isEn ? "I already have an account" : "Ich hab schon einen Account"}
            </button>
            <button
              onClick={handleDownload}
              className="mt-3 flex w-full items-center justify-center gap-1.5 text-[13px] text-white/45 transition hover:text-white/80"
            >
              <Download size={14} strokeWidth={2} aria-hidden />
              {isEn ? "Just download (HTML)" : "Nur herunterladen (HTML)"}
            </button>
          </>
        ) : (
          <>
            <div
              className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: "rgba(74,222,128,0.16)", color: "var(--color-ln-sage)" }}
            >
              <Check size={22} strokeWidth={2.4} aria-hidden />
            </div>
            <h3
              className="text-[20px] font-semibold leading-tight"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.4px" }}
            >
              {isEn ? "Saved to your dashboard" : "In deinem Dashboard gespeichert"}
            </h3>
            <p className="mt-2 text-[14px]" style={{ color: "var(--color-text-dim, #9098B6)" }}>
              {isEn
                ? "Come back any time, or download it for offline use right now."
                : "Komm jederzeit zurück, oder lade es direkt offline herunter."}
            </p>
            <a
              href="/dashboard"
              className="mt-5 flex w-full items-center justify-center rounded-xl px-5 py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "#2B3499" }}
            >
              {isEn ? "Open dashboard" : "Dashboard öffnen"}
            </a>
            <button
              onClick={handleDownload}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border px-5 py-3 text-[14px] font-medium text-white transition hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.14)" }}
            >
              <Download size={14} strokeWidth={2} aria-hidden />
              {isEn ? "Download (HTML)" : "Herunterladen (HTML)"}
            </button>
          </>
        )}
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
            {isEn ? "Single Exam" : "Einzelklausur"}
          </span>
          <span className="opacity-30">·</span>
          <span className="font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
            <span className="font-bold text-white">29,99€</span>{" "}
            {isEn ? "Semester" : "Semester"}
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
  plan: "free" | "einzelklausur" | "semester" | "monthly";
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
    plan: "einzelklausur",
    name: "Einzelklausur",
    tagline: "Eine Klausur. Voller Zugriff.",
    outcomeHeadline: "Eine Klausur durchziehen",
    price: "4,99€",
    priceSize: "44px",
    subtitle: "einmalig",
    badge: "OHNE ABO",
    bullets: [
      { text: "5 Pakete in 14 Tagen" },
      { text: "Alles reinwerfen (Cram) inklusive" },
      { text: "Kein Abo, kein Vergessen-zu-Kündigen" },
      { text: "Voller KI-Tutor + Visual Maps + Klausur-Trainer" },
    ],
    ctaLabel: "Einzelklausur holen",
    ctaFilled: false,
  },
  {
    plan: "semester",
    name: "Semester",
    tagline: "Das ganze Semester durchziehen",
    outcomeHeadline: "Semester durchziehen",
    price: "29,99€",
    priceSize: "48px",
    subtitle: "/ Semester",
    badge: "BESTE WAHL",
    bullets: [
      { text: "60 Pakete pro Monat — quasi unbegrenzt" },
      { text: "6× Einzelklausur = 30 € — Semester = ein Preis, 5 Monate" },
      { text: "Voller KI-Tutor + Visual Maps + Essay-Blueprint" },
      { text: "29,99 € alle 6 Monate — günstigster Weg pro Klausur" },
    ],
    ctaLabel: "Semester holen",
    ctaFilled: true,
    highlighted: true,
  },
  {
    plan: "monthly",
    name: "Monatlich",
    tagline: "Flexibel, monatlich kündbar",
    outcomeHeadline: "Monat für Monat lernen",
    price: "8,99€",
    priceSize: "44px",
    subtitle: "/ Monat",
    bullets: [
      { text: "50 Pakete pro Monat" },
      { text: "Voller KI-Tutor + Visual Maps + Klausur-Trainer" },
      { text: "Monatlich kündbar — keine lange Bindung" },
      { text: "Alles reinwerfen (Cram) inklusive" },
    ],
    ctaLabel: "Monatlich holen",
    ctaFilled: false,
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
    plan: "einzelklausur",
    name: "Single Exam",
    tagline: "One exam. Full access.",
    outcomeHeadline: "Get through one exam",
    price: "4,99€",
    priceSize: "44px",
    subtitle: "one-time",
    badge: "NO SUBSCRIPTION",
    bullets: [
      { text: "5 packs in 14 days" },
      { text: "Bulk upload (Cram) included" },
      { text: "No subscription, no forgot-to-cancel" },
      { text: "Full AI tutor + Visual Maps + exam trainer" },
    ],
    ctaLabel: "Buy Single Exam",
    ctaFilled: false,
  },
  {
    plan: "semester",
    name: "Semester",
    tagline: "For the whole semester",
    outcomeHeadline: "Push through the semester",
    price: "29,99€",
    priceSize: "48px",
    subtitle: "/ semester",
    badge: "BEST VALUE",
    bullets: [
      { text: "60 packs per month — basically unlimited" },
      { text: "6× Single Exam = €30 — Semester = one price, 5 months" },
      { text: "Full AI tutor + Visual Maps + essay blueprint" },
      { text: "€29.99 every 6 months — cheapest per exam" },
    ],
    ctaLabel: "Get Semester",
    ctaFilled: true,
    highlighted: true,
  },
  {
    plan: "monthly",
    name: "Monthly",
    tagline: "Flexible, cancel anytime",
    outcomeHeadline: "Learn month to month",
    price: "8,99€",
    priceSize: "44px",
    subtitle: "/ month",
    bullets: [
      { text: "50 packs per month" },
      { text: "Full AI tutor + Visual Maps + exam trainer" },
      { text: "Cancel monthly — no long commitment" },
      { text: "Bulk upload (Cram) included" },
    ],
    ctaLabel: "Get Monthly",
    ctaFilled: false,
  },
];

function PricingSection({
  onActivateUpload,
}: {
  onActivateUpload: () => void;
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

  const handleTierCta = (
    plan: "free" | "einzelklausur" | "semester" | "monthly",
  ) => {
    if (plan === "free") {
      onActivateUpload();
      return;
    }
    // Paid tiers all go through Stripe checkout. Unauth → login then settings
    // (where they can complete the purchase); authed → fire checkout directly.
    if (!authed) {
      window.location.href = paidUpgradeHref;
      return;
    }
    track("checkout_started", { plan, source: "pricing_section" });
    fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.url) window.location.href = j.url as string;
        else window.location.href = paidUpgradeHref;
      })
      .catch(() => {
        window.location.href = paidUpgradeHref;
      });
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
              ? `Founder prices while we're still under the first ${FOUNDER_PRICING_LIMIT.toLocaleString()} paying students. Lock in your rate — it stays, it won't creep up later.`
              : `Solange wir unter den ersten ${FOUNDER_PRICING_LIMIT.toLocaleString("de-DE")} zahlenden Studis sind, gelten Gründerpreise. Dein Preis bleibt — er steigt später nicht.`}
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

        <BYOKBanner />
      </div>
    </section>
  );
}

/* ========== BYOK BANNER (under the pricing cards) ========== */

// BYOK is intentionally NOT promoted yet — we ship the core experience first.
// Kept visible but clearly marked "coming soon": no active connect flow, no
// price push. (Re-add an onOpenConnect prop here when we re-activate it.)
function BYOKBanner() {
  const isEn = useLanguage() === "en";

  return (
    <div
      id="connect"
      className="ln-reveal byok-banner scroll-mt-24 mt-8"
      style={{ opacity: 0.6 }}
      aria-label={isEn ? "Bring your own key — coming soon" : "Eigener API-Key — bald verfügbar"}
    >
      <div className="byok-left">
        <div className="byok-icon">
          <ClaudeLogo size={22} />
        </div>
        <div>
          <span className="byok-bonus-eyebrow">
            {isEn ? "Planned for power users" : "Geplant für Power-User"}
          </span>
          <h4>
            {isEn
              ? "Bring your own API key"
              : "Bald: eigener API-Key"}
          </h4>
          <p>
            {isEn
              ? "Later you'll be able to connect your own key for unlimited packs. First we make sure the core runs perfectly."
              : "Bald kannst du deinen eigenen Key verbinden — für unbegrenzte Pakete. Erst sorgen wir dafür, dass das Normale perfekt läuft."}
          </p>
        </div>
      </div>
      <div className="byok-right">
        <span
          className="rounded-full px-4 py-2 text-[13px] font-semibold"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          {isEn ? "Coming soon" : "Bald verfügbar"}
        </span>
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
            {isEn ? "Try it free" : "Jetzt gratis testen"}
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
            {isEn ? "Not another summary." : "Nicht noch eine Zusammenfassung."}{" "}
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
        {isEn ? "Start with your slides →" : "Mit deinen Folien starten →"}
      </button>
    </div>
  );
}

/* ========== FAQ ========== */

const FAQ_ITEMS_DE: { q: string; a: string }[] = [
  {
    q: "Was passiert mit meinen Dateien?",
    a: "Nichts. Deine Folien werden nur für die Generierung verarbeitet und danach gelöscht. Nichts wird dauerhaft gespeichert.",
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
    q: "Was ist der Unterschied zu anderen KI-Tools?",
    a: "Die meisten KI-Tools geben dir Fließtext. Lernly gibt dir ein interaktives Lernsystem — Karteikarten zum Flippen, einen Prüfungssimulator mit Feedback und einen Essay-Blueprint mit fertigen Formulierungen.",
  },
];

const FAQ_ITEMS_EN: { q: string; a: string }[] = [
  {
    q: "What happens to my files?",
    a: "Nothing permanent. Your slides are processed only to generate the pack and are deleted afterwards. Nothing is stored long term.",
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
    q: "How is this different from other AI tools?",
    a: "Most AI tools give you long-form prose. Lernly gives you an interactive study system — flashcards to flip, an exam simulator with feedback, and an essay blueprint with ready phrasing.",
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
