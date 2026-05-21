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
import { track } from "@/lib/analytics";

type Language = "en" | "de";

const LANGUAGE_STORAGE = "lernly-language";
const LanguageContext = createContext<Language>("de");

function useLanguage() {
  return useContext(LanguageContext);
}

const EXAM_OPTIONS: { value: ExamType; label: string; emoji: string }[] = [
  { value: "essay", label: "Essay", emoji: "📝" },
  { value: "multiple_choice", label: "Multiple Choice", emoji: "✅" },
  { value: "oral", label: "Oral", emoji: "🗣" },
  { value: "open_book", label: "Open Book", emoji: "📋" },
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
  const resultRef = useRef<HTMLDivElement>(null);

  const openConnect = useCallback(() => setConnectOpen(true), []);
  const closeConnect = useCallback(() => setConnectOpen(false), []);

  const activateUpload = () => {
    setMode("upload");
    requestAnimationFrame(() => {
      document
        .getElementById("upload")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  useScrollReveal();

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
    setIsGenerating(true);
    setError(null);

    track("anon_generate_started", {
      file_count: files.length,
      exam_type: examType,
      total_bytes: files.reduce((sum, f) => sum + f.size, 0),
      uses_byok: Boolean(apiKey),
    });

    const fd = new FormData();
    fd.append("examType", examType);
    if (apiKey) fd.append("userApiKey", apiKey);
    for (const f of files) fd.append("files", f);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);
    const t0 = Date.now();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });

      let data: { id: string; pack: StudyPack } | { error: string; reason?: string };
      try {
        data = await res.json();
      } catch {
        track("anon_generate_failed", {
          status: res.status,
          reason: "no_json",
          duration_ms: Date.now() - t0,
        });
        throw new Error(
          language === "en"
            ? `Server responded with status ${res.status}, but no JSON.`
            : `Server antwortete mit Status ${res.status}, aber kein JSON.`,
        );
      }

      if (!res.ok || "error" in data) {
        track("anon_generate_failed", {
          status: res.status,
          reason: "reason" in data ? data.reason ?? "error" : "error",
          duration_ms: Date.now() - t0,
        });
        throw new Error("error" in data ? data.error : `HTTP ${res.status}`);
      }

      track("anon_generate_completed", {
        duration_ms: Date.now() - t0,
        cards: data.pack.flashcards.length,
        quiz: data.pack.simulator.questions.length,
        exam_type: examType,
      });

      setCompleted(true);
      await new Promise((r) => setTimeout(r, 500));
      setPack(data.pack);
      try {
        sessionStorage.setItem("lernly-pack", JSON.stringify(data.pack));
      } catch (storageErr) {
        // Pack still rendered from in-memory state; storage failure is non-fatal.
        console.warn("[lernly] sessionStorage.setItem failed", storageErr);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(
          language === "en"
            ? "This took longer than 5 minutes. Try fewer or smaller files."
            : "Das hat länger als 5 Minuten gedauert. Versuch's mit weniger oder kleineren Dateien.",
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : language === "en"
              ? "Network error"
              : "Netzwerkfehler",
        );
      }
    } finally {
      clearTimeout(timeoutId);
      setIsGenerating(false);
      setCompleted(false);
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
          />
          <DemoPacksSection language={language} onTryYourOwn={activateUpload} />
          <ResultPreview />
          <HowItWorks />
          <PipelineCta onActivateUpload={activateUpload} />
          <ShowcaseSection />
          <ComparisonSection />
          <BentoFeatures />
          <SocialProof />
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
          <span className="block sm:inline">{isEn ? "Upload it." : "Lade hoch."}</span>{" "}
          <span className="block sm:inline" style={{ color: "rgb(255, 255, 255)" }}>
            {isEn ? "Sorted in 2 min." : "In 2 Min sortiert."}
          </span>
        </h1>

        <p
          className="ln-reveal mx-auto mt-8 max-w-[680px] text-center leading-[1.4] text-white"
          style={{ fontSize: "clamp(18px, 2.2vw, 22px)" }}
        >
          {isEn ? "8 PDFs. 3 days. No plan." : "8 PDFs. 3 Tage. Kein Plan."}
        </p>

        <div className="ln-hero-actions ln-reveal mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onActivateUpload}
            className="rounded-full px-7 py-[14px] text-[16px] font-semibold transition hover:bg-white/90"
            style={{ background: "#ffffff", color: "#1a2647" }}
          >
            {isEn ? "Drop in PDFs →" : "Jetzt PDFs reinwerfen →"}
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
            ● {isEn ? "No login" : "Kein Login"}
          </span>
          <span className="ln-hero-badge" style={{ color: "rgb(143, 139, 229)" }}>
            ● {isEn ? "3 free packs" : "3 Pakete gratis"}
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
              ? "Scandinavian Leadership · Essay exam"
              : "Scandinavian Leadership · Essay-Prüfung"}
          </div>
        </div>
        <div className="ln-cockpit-pack-tags">
          <span>{isEn ? "35 cards" : "35 Karten"}</span>
          <span>{isEn ? "3 essay examples" : "3 Essay-Beispiele"}</span>
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
            <strong>Deep Drill</strong>
          </div>
          <div className="ln-cockpit-rail-item">
            <span>03</span>
            <strong>Example Essays</strong>
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
              <strong>Scenario</strong>
              <span>~350 W.</span>
            </div>
            <div className="ln-timebar-segment is-theory" style={{ flex: 3.5 }}>
              <strong>Theory</strong>
              <span>~350 W.</span>
            </div>
            <div className="ln-timebar-segment is-analysis" style={{ flex: 6 }}>
              <strong>Analysis</strong>
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
                <strong>Scenario</strong>
                <p>Describe future work life. No theory, no references.</p>
              </div>
              <em>40 min</em>
            </div>
            <div className="ln-blueprint-row is-theory">
              <span>2</span>
              <div>
                <strong>Theory</strong>
                <p>Hofstede, Zander & Zander, Holmberg & Åkerblom.</p>
              </div>
              <em>40 min</em>
            </div>
            <div className="ln-blueprint-row is-analysis">
              <span>3</span>
              <div>
                <strong>Analysis + conclusion</strong>
                <p>Challenge vs. strengthen. Take a position, not a summary.</p>
              </div>
              <em>80 min</em>
            </div>
          </div>
        </section>

        <aside
          className="ln-cockpit-drill"
          aria-label={isEn ? "Deep Drill preview" : "Deep Drill Vorschau"}
        >
          <div className="ln-cockpit-panel-head">
            <span className="ln-section-label">Deep Drill</span>
            <span className="ln-cockpit-mini-pill">12 / 35</span>
          </div>
          <div className="ln-drill-progress">
            <span style={{ width: "34%" }} />
          </div>
          <div className="ln-drill-card">
            <div className="ln-drill-card-top">
              <span>Hofstede</span>
              <em>low power distance</em>
            </div>
            <strong>What does it mean for Swedish leadership?</strong>
            <p>
              Equality, flat structures, approachable leaders. Employees can
              question decisions and are expected to participate.
            </p>
          </div>
          <div className="ln-drill-actions" aria-hidden>
            <span className="is-again">Again</span>
            <span className="is-kinda">Kinda</span>
            <span className="is-got">Got it</span>
          </div>
        </aside>
      </div>

      <div className="ln-cockpit-bottom">
        <div className="ln-example-chip">
          <span>AI & automation</span>
          <strong>challenge → strengthen</strong>
        </div>
        <div className="ln-example-chip">
          <span>No travel</span>
          <strong>local hubs · delegation</strong>
        </div>
        <div className="ln-example-chip">
          <span>Climate rules</span>
          <strong>fairness · pragmatism</strong>
        </div>
        <button type="button" onClick={onActivate} className="ln-cockpit-cta">
          <span>✦</span>
          <span>{isEn ? "Try it with my PDFs" : "Jetzt mit meinen PDFs testen"}</span>
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
                ? "Drop PDFs here (or click)"
                : "PDFs hier reinwerfen (oder klicken)"}
          </div>
          <div className="text-[12px]" style={{ color: "var(--color-ln-mute)" }}>
            {isEn
              ? `PDF · TXT · MD · up to ${MAX_FILES} files`
              : `PDF · TXT · MD · bis zu ${MAX_FILES} Dateien`}
          </div>
        </div>
      </div>

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
              <span>{opt.emoji}</span>
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
          ? "Free · No login · Not stored permanently"
          : "Kostenlos · Kein Login · Wird nicht dauerhaft gespeichert"}
      </p>
    </div>
  );
}

/* ========== SHOWCASE ========== */

type ShowcaseItem = {
  badge: string;
  context: string;
  result: string;
  outputs: string[];
};

const SHOWCASE_DE: ShowcaseItem[] = [
  {
    badge: "BWL",
    context: "400 Slides · Strategisches Management",
    result: "Porter, SWOT, BCG priorisiert. Essay-Plan + 38 Karten fertig.",
    outputs: ["38 Karten", "Essay-Plan", "12 Quiz"],
  },
  {
    badge: "MED",
    context: "Anatomie II · Multiple Choice",
    result: "Ursprung, Ansatz, Innervation als Karten. 15 MC-Fragen inklusive.",
    outputs: ["42 Karten", "15 MC-Fragen", "Feedback"],
  },
  {
    badge: "JURA",
    context: "Staatsrecht I · Fallklausur",
    result: "34 Definitionen sortiert. 12 Fälle mit Prüfungsschema zum Üben.",
    outputs: ["34 Definitionen", "12 Fälle", "Schema"],
  },
];

const SHOWCASE_EN: ShowcaseItem[] = [
  {
    badge: "BUS",
    context: "400 slides · Strategic Management",
    result: "Porter, SWOT, BCG prioritized. Essay plan + 38 cards ready.",
    outputs: ["38 cards", "Essay plan", "12 quiz"],
  },
  {
    badge: "MED",
    context: "Anatomy II · Multiple choice",
    result: "Origin, insertion, innervation as cards. 15 MC questions included.",
    outputs: ["42 cards", "15 MC questions", "Feedback"],
  },
  {
    badge: "LAW",
    context: "Constitutional Law I · Case exam",
    result: "34 definitions sorted. 12 cases with exam schema to practice.",
    outputs: ["34 definitions", "12 cases", "Schema"],
  },
];

function ShowcaseSection() {
  const isEn = useLanguage() === "en";
  const showcase = isEn ? SHOWCASE_EN : SHOWCASE_DE;
  return (
    <section className="px-6 py-24 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <div className="ln-reveal">
          <span className="ln-section-label">
            {isEn ? "Before the material mountain" : "Vor deinem Stoffberg"}
          </span>
          <h2
            className="mt-4 max-w-3xl font-bold leading-[1.05] tracking-[-1.92px] text-white"
            style={{ fontSize: "clamp(32px, 5.5vw, 64px)" }}
          >
            {isEn
              ? "Business, Med, Law — whatever you study."
              : "BWL, Medizin, Jura — egal was du studierst."}{" "}
            <span className="lernly-italic" style={{ color: "var(--color-ln-ink-soft)" }}>
              {isEn ? "Lernly reads it." : "Lernly liest's."}
            </span>
          </h2>
        </div>

        <div className="ln-stagger mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {showcase.map((item, idx) => (
            <ShowcaseCard key={item.badge} item={item} waveSeed={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ShowcaseCard({
  item,
  waveSeed,
}: {
  item: ShowcaseItem;
  waveSeed: number;
}) {
  const isEn = useLanguage() === "en";
  return (
    <div
      className="ln-reveal flex min-h-[280px] flex-col justify-between rounded-[22px] border p-7"
      style={{
        background: "var(--color-ln-hero-card-bg)",
        borderColor: "rgba(255, 255, 255, 0.22)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-2 text-[13px]"
          style={{ color: "var(--color-ln-ink-soft)" }}
        >
          <span className="ln-pulse-dot-green" aria-hidden />
          <span>{isEn ? "Ready" : "Fertig"}</span>
        </div>
        <span
          className="rounded-lg border px-2.5 py-1 font-mono text-[12px] font-semibold"
          style={{
            borderColor: "rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.65)",
          }}
        >
          {item.badge}
        </span>
      </div>

      <div className="mt-6">
        <div
          className="text-[13px]"
          style={{ color: "var(--color-ln-mute)" }}
        >
          {item.context}
        </div>
        <div className="mt-2 text-[20px] font-semibold leading-[1.3] text-white md:text-[22px]">
          {item.result}
        </div>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {item.outputs.map((output, index) => (
            <span
              key={output}
              className={
                "ln-mono-tag " + (index === 0 ? "ln-mono-tag-accent" : "")
              }
            >
              {output}
            </span>
          ))}
        </div>
      </div>

      <Waveform seed={waveSeed} />
    </div>
  );
}

/* ========== COMPARISON ========== */

function ComparisonSection() {
  const isEn = useLanguage() === "en";
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <div className="ln-reveal">
          <span className="ln-section-label">
            {isEn ? "Why not just ChatGPT?" : "Warum nicht einfach ChatGPT?"}
          </span>
          <h2
            className="mt-4 max-w-3xl font-bold leading-[1.05] tracking-[-1.92px] text-white"
            style={{ fontSize: "clamp(32px, 5.5vw, 64px)" }}
          >
            {isEn ? "ChatGPT delivers text." : "ChatGPT liefert Text."}{" "}
            <span className="lernly-italic" style={{ color: "var(--color-ln-ink-soft)" }}>
              {isEn ? "Lernly quizzes you." : "Lernly fragt dich ab."}
            </span>
          </h2>
        </div>

        <div className="ln-stagger mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="ln-reveal ln-comparison-card is-muted">
            <div className="ln-section-label" style={{ fontSize: 11, letterSpacing: "2.2px" }}>
              {isEn ? "Another summary" : "Noch eine Zusammenfassung"}
            </div>
            <h3 className="mt-4 text-[26px] font-semibold leading-tight tracking-[-0.4px] text-white">
              {isEn
                ? "2000 more words. And you still have to plan the studying."
                : "2000 Wörter mehr. Und wieder musst du selbst planen."}
            </h3>
            <div className="mt-8 space-y-3">
              <ComparisonRow
                label="Output"
                value={isEn ? "Long-form prose" : "Fließtext (1.500+ Wörter)"}
                tone="muted"
              />
              <ComparisonRow label={isEn ? "Next step" : "Nächster Schritt"} value={isEn ? "Unclear" : "Unklar"} tone="muted" />
              <ComparisonRow label={isEn ? "Studying" : "Lernen"} value={isEn ? "Read and hope" : "Lesen und hoffen"} tone="muted" />
            </div>
          </div>

          <div className="ln-reveal ln-comparison-card is-active">
            <div className="ln-section-label" style={{ fontSize: 11, letterSpacing: "2.2px", color: "var(--color-ln-cyan)" }}>
              {isEn
                ? "Flashcards, simulator, blueprint"
                : "Karteikarten, Simulator, Blueprint"}
            </div>
            <h3 className="mt-4 text-[26px] font-semibold leading-tight tracking-[-0.4px] text-white">
              {isEn
                ? "A pack that starts testing you immediately."
                : "Ein Paket, das dich direkt abfragt."}
            </h3>
            <div className="mt-8 space-y-3">
              <ComparisonRow label="Output" value={isEn ? "Active drills" : "Aktive Übungen"} tone="active" />
              <ComparisonRow label={isEn ? "Next step" : "Nächster Schritt"} value={isEn ? "Flip the first card" : "Erste Karte flippen"} tone="active" />
              <ComparisonRow label={isEn ? "Studying" : "Lernen"} value={isEn ? "Test, remember, repeat" : "Testen, merken, wiederholen"} tone="active" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparisonRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "active" | "muted";
}) {
  return (
    <div className="ln-comparison-row">
      <span>{label}</span>
      <strong className={tone === "active" ? "is-active" : ""}>{value}</strong>
    </div>
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
    <section id="features" className="scroll-mt-24 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-[1200px]">
        <div className="ln-reveal">
          <span className="ln-section-label">
            {isEn ? "What makes Lernly different" : "Was Lernly anders macht"}
          </span>
          <h2
            className="mt-4 max-w-2xl font-bold leading-[1.05] tracking-[-1.92px] text-white"
            style={{ fontSize: "clamp(32px, 5.5vw, 64px)" }}
          >
            {isEn
              ? "Prepare for your exam without scrolling and hoping."
              : "Klausur vorbereiten ohne Durchscrollen und Hoffen."}
          </h2>
        </div>

        <div className="ln-stagger mt-14 grid grid-cols-1 gap-4 md:grid-cols-6">
          {/* Card 1 — span 3 */}
          <div className="ln-reveal ln-glass-card p-8 md:col-span-3 md:p-9">
            <CardEyebrow>
              {isEn ? "Reading ≠ Learning" : "Lesen ≠ Lernen"}
            </CardEyebrow>
            <CardTitle>
              {isEn
                ? "Actively quizzed, not passively skimmed."
                : "Aktiv abgefragt, nicht passiv durchgeblättert."}
            </CardTitle>
            <CardDesc>
              {isEn
                ? "Every card tests you. Every quiz explains why each option is right or wrong. The stuff actually sticks instead of sliding off."
                : "Jede Karte testet dich. Jedes Quiz erklärt, warum jede Option richtig oder falsch ist. Damit es wirklich hängen bleibt — statt nur durchgelesen zu werden."}
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
                ? "What usually costs you an evening, Lernly does before your coffee gets cold. Flashcards, blueprint, simulator — done."
                : "Was dich sonst einen Abend kostet, macht Lernly bevor dein Kaffee kalt ist. Karteikarten, Blueprint, Simulator — fertig."}
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
              {isEn ? "Learns offline with you." : "Lernt offline mit dir."}
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
              {isEn ? "Slides in German? No problem." : "Skript auf Englisch? Egal."}
            </CardEyebrow>
            <CardTitle className="mt-3">
              {isEn ? "Any subject. Any language." : "Jedes Fach. Jede Sprache."}
            </CardTitle>
            <CardDesc>
              {isEn
                ? "German script, English slides? No problem. Lernly reads it all and builds your pack — business, medicine, law, whatever you study."
                : "Skript auf Deutsch, Folien auf Englisch? Egal. Lernly liest alles und baut dein Paket — BWL, Medizin, Jura, was auch immer."}
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
                  {isEn ? "3 study packs free. No subscription." : "3 Lernpakete gratis. Kein Abo."}
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
                    ? "Enough for your next exam week. No credit card, no trial countdown."
                    : "Reicht für deine nächste Klausurenwoche. Keine Kreditkarte, kein Trial-Countdown."}
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
    <section id="how" className="scroll-mt-24 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-[1200px]">
        <div className="ln-reveal">
          <span className="ln-section-label">
            {isEn ? "From chaos to exam-ready" : "Vom Chaos zur Prüfung"}
          </span>
          <h2
            className="mt-4 max-w-2xl font-bold leading-[1.05] tracking-[-1.92px] text-white"
            style={{ fontSize: "clamp(32px, 5.5vw, 64px)" }}
          >
            {isEn
              ? "Build flashcards in three steps."
              : "Karteikarten erstellen in drei Schritten."}{" "}
            <span className="lernly-italic" style={{ color: "var(--color-ln-ink-soft)" }}>
              {isEn ? "Doable even at 2 a.m." : "Auch um 2 Uhr nachts."}
            </span>
          </h2>
        </div>

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
  { id: "simulator", label: "Simulator", emoji: "🎮" },
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
          <li>✓ {isEn ? "3 packs free" : "3 Pakete gratis"}</li>
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

/* ========== PRICING ========== */

type PricingBullet = {
  text: string;
  value?: string;
  bonus?: boolean;
};

type PricingTier = {
  plan: "free" | "pro" | "team";
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
};

const PRICING_TIERS_DE: PricingTier[] = [
  {
    plan: "free",
    name: "Gratis",
    tagline: "Zum Ausprobieren",
    outcomeHeadline: "Erste Klausur testen",
    price: "0€",
    priceSize: "40px",
    subtitle: "für immer",
    bullets: [
      { text: "3 Klausuren komplett vorbereiten" },
      { text: "15 Karten pro Klausur (die Basics)" },
      { text: "8-Fragen-Prüfungssimulator" },
      { text: "Konzepte nach Wichtigkeit sortiert" },
    ],
    ctaLabel: "Erstes Paket erstellen",
    ctaFilled: false,
  },
  {
    plan: "pro",
    name: "Pro",
    tagline: "Wenn mehrere Klausuren anstehen",
    outcomeHeadline: "Klausurenphase durchziehen",
    price: "6.99€",
    priceSize: "48px",
    subtitle: "/ Monat",
    anchorPrice: "9.99€",
    badge: "BELIEBT",
    bullets: [
      { text: "20 Klausuren pro Monat komplett vorbereitet" },
      { text: "600+ Karteikarten, nach Themen kuratiert" },
      { text: "Essay-Blueprint mit fertigen Template-Sätzen" },
      { text: "Prüfungssimulator mit 12+ Fragen pro Paket" },
      { text: "Offline-Modus + Quizlet-Export" },
    ],
    ctaLabel: "Pro holen",
    ctaFilled: true,
    highlighted: true,
  },
  {
    plan: "team",
    name: "Team",
    tagline: "Fürs ganze Studienjahr",
    outcomeHeadline: "Ganzes Semester durchziehen",
    price: "14.99€",
    priceSize: "40px",
    subtitle: "/ Monat",
    anchorPrice: "19.99€",
    bullets: [
      { text: "50 Klausuren pro Monat (2,5× mehr als Pro)" },
      { text: "Alles aus Pro inklusive" },
      { text: "Priorität — deine Pakete werden zuerst gebaut" },
    ],
    ctaLabel: "Team holen",
    ctaFilled: false,
  },
];

const PRICING_TIERS_EN: PricingTier[] = [
  {
    plan: "free",
    name: "Free",
    tagline: "To try it out",
    outcomeHeadline: "Try your first exam",
    price: "0€",
    priceSize: "40px",
    subtitle: "forever",
    bullets: [
      { text: "Prepare 3 exams completely" },
      { text: "15 cards per exam (the basics)" },
      { text: "8-question exam simulator" },
      { text: "Concepts sorted by importance" },
    ],
    ctaLabel: "Create first pack",
    ctaFilled: false,
  },
  {
    plan: "pro",
    name: "Pro",
    tagline: "When several exams are coming up",
    outcomeHeadline: "Push through exam season",
    price: "6.99€",
    priceSize: "48px",
    subtitle: "/ month",
    anchorPrice: "9.99€",
    badge: "POPULAR",
    bullets: [
      { text: "20 exams per month, fully prepared" },
      { text: "600+ flashcards, curated by topic" },
      { text: "Essay blueprint with ready-to-use templates" },
      { text: "Exam simulator with 12+ questions per pack" },
      { text: "Offline mode + Quizlet export" },
    ],
    ctaLabel: "Get Pro",
    ctaFilled: true,
    highlighted: true,
  },
  {
    plan: "team",
    name: "Team",
    tagline: "For the whole study year",
    outcomeHeadline: "Carry the whole semester",
    price: "14.99€",
    priceSize: "40px",
    subtitle: "/ month",
    anchorPrice: "19.99€",
    bullets: [
      { text: "50 exams per month (2.5× more than Pro)" },
      { text: "Everything in Pro included" },
      { text: "Priority — your packs get built first" },
    ],
    ctaLabel: "Get Team",
    ctaFilled: false,
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

  const handleTierCta = (plan: "free" | "pro" | "team") => {
    if (plan === "free") {
      onActivateUpload();
    } else {
      window.location.href = paidUpgradeHref;
    }
  };
  const tiers = isEn ? PRICING_TIERS_EN : PRICING_TIERS_DE;
  return (
    <section id="pricing" className="scroll-mt-24 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-[1200px]">
        <div className="ln-reveal">
          <span className="ln-section-label">
            {isEn ? "What do you need?" : "Was brauchst du?"}
          </span>
          <h2
            className="mt-4 max-w-2xl font-bold leading-[1.05] tracking-[-1.92px] text-white"
            style={{ fontSize: "clamp(32px, 5.5vw, 64px)" }}
          >
            {isEn ? "Try it for free." : "Probier's gratis."}{" "}
            <span
              className="lernly-italic"
              style={{ color: "var(--color-ln-ink-soft)" }}
            >
              {isEn ? "Upgrade only when it sticks." : "Upgrade nur wenn's sitzt."}
            </span>
          </h2>
        </div>

        <div className="ln-reveal ln-founder-eyebrow mt-8">
          <span className="ln-founder-rocket" aria-hidden>
            🚀
          </span>
          <span className="ln-founder-text">
            <strong>{isEn ? "Founder pricing" : "Gründerpreis"}</strong>
            {" — "}
            {isEn
              ? `Pro stays at €6.99 (instead of €9.99) while we're still under ${FOUNDER_PRICING_LIMIT.toLocaleString()} paying students.`
              : `Solange wir unter ${FOUNDER_PRICING_LIMIT.toLocaleString("de-DE")} zahlenden Studis sind, bleibt Pro bei €6,99 statt €9,99.`}
          </span>
        </div>

        <div className="ln-reveal ln-guarantee-badge mt-4">
          <span className="ln-guarantee-icon" aria-hidden>
            🛡️
          </span>
          <div className="ln-guarantee-text">
            <strong>
              {isEn
                ? "30-day money-back. One email is enough."
                : "30 Tage Geld-zurück. Eine Email reicht."}
            </strong>
            <p>
              {isEn
                ? "If your first pack doesn't help — 100% back. No questions, no forms."
                : "Wenn dein erstes Paket dir nicht hilft — 100% zurück. Keine Fragen, keine Formulare."}
            </p>
          </div>
        </div>

        <div className="ln-stagger mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
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
              ? "Save €2/month forever. Packs without a limit."
              : "Spar €2/Monat dauerhaft. Unbegrenzte Pakete."}
          </p>
        </div>
      </div>
      <div className="byok-right">
        <div className="byok-prices">
          <span>
            Pro + Key: <strong>4.99€</strong> <s>6.99€</s>
          </span>
          <span>
            Team + Key: <strong>9.99€</strong> <s>14.99€</s>
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
  } = tier;
  return (
    <div
      className="ln-reveal ln-glass-card relative flex flex-col"
      style={{
        padding: "36px 32px",
        ...(highlighted && {
          borderColor: "rgba(91, 184, 216, 0.35)",
          boxShadow: "0 0 40px rgba(91, 184, 216, 0.08)",
        }),
      }}
    >
      {badge && (
        <span
          className="absolute"
          style={{
            top: "-12px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--color-ln-cyan)",
            color: "#000",
            fontSize: "11px",
            fontWeight: 600,
            borderRadius: "20px",
            padding: "3px 12px",
            letterSpacing: "0.05em",
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

      <div
        className="mt-3 text-[18px] font-semibold leading-[1.2] text-white"
      >
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

      <div className="mt-5 flex items-baseline gap-2">
        {anchorPrice && <span className="ln-anchor-price">{anchorPrice}</span>}
        <span
          className="ln-stat-gradient-blue font-bold leading-none"
          style={{ fontSize: priceSize, letterSpacing: "-1.6px" }}
        >
          {price}
        </span>
        <span
          className="text-[14px]"
          style={{ color: "var(--color-ln-mute)" }}
        >
          {subtitle}
        </span>
      </div>

      <button
        onClick={onCta}
        className={
          "mt-6 rounded-xl px-5 py-3 text-[14px] transition " +
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
        {ctaLabel}
      </button>
    </div>
  );
}

/* ========== BOTTOM CTA ========== */

function BottomCta() {
  const isEn = useLanguage() === "en";
  return (
    <section className="relative overflow-hidden px-6 py-28 md:py-36">
      <div
        aria-hidden
        className="ln-glow pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(91,184,216,0.20), transparent 70%)",
        }}
      />
      <div className="ln-reveal relative mx-auto max-w-[820px] text-center">
        <h2
          className="font-bold leading-[1.05] tracking-[-1.92px]"
          style={{
            color: "var(--color-ln-ink-soft)",
            fontSize: "clamp(34px, 5.5vw, 64px)",
          }}
        >
          {isEn ? "The exam is coming anyway." : "Die Klausur kommt egal."}{" "}
          <span className="lernly-italic text-white">
            {isEn ? "Upload your PDFs now." : "Lade jetzt deine PDFs hoch."}
          </span>
        </h2>
        <a
          href="#upload"
          className="mt-10 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-[15px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
        >
          {isEn ? "Upload your PDFs" : "PDFs hochladen"}
          <span>↓</span>
        </a>
        <p
          className="mt-5 text-[13px]"
          style={{ color: "var(--color-ln-mute)" }}
        >
          {isEn
            ? "Free · No login · No credit card"
            : "Gratis · Ohne Login · Ohne Kreditkarte"}
        </p>
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
    <section className="px-6 py-24 md:py-28">
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
  return (
    <div className="ln-artifact-page">
      <div className="ln-artifact-top">
        <span>Blueprint</span>
        <strong>Correct Structure</strong>
      </div>
      <div className="ln-artifact-timebar">
        <span className="is-scenario" style={{ flex: 3.5 }}>Scenario</span>
        <span className="is-theory" style={{ flex: 3.5 }}>Theory</span>
        <span className="is-analysis" style={{ flex: 6 }}>Analysis</span>
        <span className="is-polish" style={{ flex: 1.8 }}>Polish</span>
      </div>
      <div className="ln-artifact-list">
        <div className="is-scenario">
          <span>1</span>
          <div>
            <strong>Scenario</strong>
            <p>~350 words · no theory</p>
          </div>
        </div>
        <div className="is-theory">
          <span>2</span>
          <div>
            <strong>Theory</strong>
            <p>4 references in one flow</p>
          </div>
        </div>
        <div className="is-analysis">
          <span>3</span>
          <div>
            <strong>Main Event</strong>
            <p>500-700 words · take a stand</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeepDrillArtifactMockup() {
  return (
    <div className="ln-artifact-page">
      <div className="ln-artifact-top">
        <span>Deep Drill</span>
        <strong>35 cards</strong>
      </div>
      <div className="ln-artifact-progress">
        <span style={{ width: "68%" }} />
      </div>
      <div className="ln-artifact-flashcard">
        <div>
          <span>Hofstede</span>
          <em>18 / 35</em>
        </div>
        <strong>What is social individualism?</strong>
        <p>Individual autonomy rooted in collective responsibility.</p>
      </div>
      <div className="ln-artifact-actions">
        <span>Again</span>
        <span>Kinda</span>
        <span>Got it</span>
      </div>
    </div>
  );
}

function ExampleEssaysArtifactMockup() {
  return (
    <div className="ln-artifact-page">
      <div className="ln-artifact-top">
        <span>Example Essays</span>
        <strong>3 scenarios</strong>
      </div>
      <div className="ln-artifact-tabs">
        <span className="is-active">AI</span>
        <span>No travel</span>
        <span>Climate</span>
      </div>
      <div className="ln-artifact-essay">
        <span>Part 3: Analysis + Conclusion</span>
        <p>
          The AI-driven scenario creates a test for Scandinavian leadership:
          expertise is challenged, while collaboration becomes more valuable.
        </p>
      </div>
      <div className="ln-artifact-tags">
        <span>challenge</span>
        <span>strengthen</span>
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
  {
    q: "Was wenn das Paket nichts taugt?",
    a: "30 Tage Geld zurück. Eine Email an info@lernly-app.de reicht — kein Formular, keine Rückfragen.",
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
  {
    q: "What if the pack is bad?",
    a: "30-day money-back. One email to info@lernly-app.de — no form, no questions.",
  },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);
  const isEn = useLanguage() === "en";
  const items = isEn ? FAQ_ITEMS_EN : FAQ_ITEMS_DE;
  return (
    <section id="faq" className="scroll-mt-24 px-6 py-24 md:py-32">
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
        <div className="ln-reveal">
          <span className="ln-section-label">{isEn ? "Questions?" : "Fragen?"}</span>
          <h2
            className="mt-4 font-bold leading-[1.05] tracking-[-1.92px] text-white"
            style={{ fontSize: "clamp(32px, 5.5vw, 64px)" }}
          >
            {isEn ? "Short answers." : "Kurz beantwortet."}
          </h2>
        </div>

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
