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
import type {
  ExamType,
  Flashcard,
  SimulatorQuestion,
  StudyPack,
} from "@/lib/schema";
import GenerationProgress from "@/components/GenerationProgress";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import ClaudeLogo from "@/components/ClaudeLogo";

type Language = "en" | "de";

const LANGUAGE_STORAGE = "lernly-language";
const LanguageContext = createContext<Language>("en");

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

const GENERATE_TIMEOUT_MS = 4 * 60 * 1000;

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
  const [language, setLanguage] = useState<Language>("en");
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

  const handleGenerate = async () => {
    if (files.length === 0 || isGenerating) return;
    setIsGenerating(true);
    setError(null);

    const fd = new FormData();
    fd.append("examType", examType);
    if (apiKey) fd.append("userApiKey", apiKey);
    for (const f of files) fd.append("files", f);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });

      let data: { id: string; pack: StudyPack } | { error: string };
      try {
        data = await res.json();
      } catch {
        throw new Error(
          language === "en"
            ? `Server responded with status ${res.status}, but no JSON.`
            : `Server antwortete mit Status ${res.status}, aber kein JSON.`,
        );
      }

      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : `HTTP ${res.status}`);
      }

      setCompleted(true);
      await new Promise((r) => setTimeout(r, 500));
      setPack(data.pack);
      sessionStorage.setItem("lernly-pack", JSON.stringify(data.pack));
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(
          language === "en"
            ? "This took longer than 4 minutes. Try fewer or smaller files."
            : "Das hat länger als 4 Minuten gedauert. Versuch's mit weniger oder kleineren Dateien.",
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
          <SocialProof />
          <ShowcaseSection />
          <ComparisonSection />
          <ResultPreview />
          <BentoFeatures />
          <HowItWorks />
          <PipelineCta onActivateUpload={activateUpload} />
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
          <span className="block sm:inline">{isEn ? "Upload." : "Lade hoch."}</span>{" "}
          <span className="block sm:inline" style={{ color: "rgb(255, 255, 255)" }}>
            {isEn ? "Study smart." : "Lerne smart."}
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
            {isEn ? "Create pack →" : "Paket erstellen →"}
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
            ● {isEn ? "Any subject" : "Jedes Fach"}
          </span>
          <span className="ln-hero-badge" style={{ color: "rgb(159, 212, 184)" }}>
            ● {isEn ? "Free" : "Kostenlos"}
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
            <span>{isEn ? "Generated" : "Generiert"}</span>
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
            {isEn ? "Too much material. Zero plan." : "Zu viel Material. Null Plan."}{" "}
            <span className="lernly-italic" style={{ color: "var(--color-ln-ink-soft)" }}>
              {isEn ? "A pack in 2 minutes." : "Paket in 2 Minuten."}
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
          <span>{isEn ? "Generated" : "Generiert"}</span>
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
            {isEn ? "ChatGPT makes text." : "ChatGPT macht Text."}{" "}
            <span className="lernly-italic" style={{ color: "var(--color-ln-ink-soft)" }}>
              {isEn ? "Lernly makes training." : "Lernly macht Training."}
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
              <ComparisonRow label="Output" value={isEn ? "Wall of text" : "Textwand"} tone="muted" />
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
            {isEn ? "Why Lernly" : "Warum Lernly"}
          </span>
          <h2
            className="mt-4 max-w-2xl font-bold leading-[1.05] tracking-[-1.92px] text-white"
            style={{ fontSize: "clamp(32px, 5.5vw, 64px)" }}
          >
            {isEn
              ? "Stop scrolling and hoping."
              : "Schluss mit Durchscrollen und Hoffen."}
          </h2>
        </div>

        <div className="ln-stagger mt-14 grid grid-cols-1 gap-4 md:grid-cols-6">
          {/* Card 1 — span 3 */}
          <div className="ln-reveal ln-glass-card p-8 md:col-span-3 md:p-9">
            <CardEyebrow>
              {isEn ? "When you have to start now" : "Wenn du jetzt anfangen musst"}
            </CardEyebrow>
            <CardTitle>
              {isEn ? "No setup. No login. No excuses." : "Kein Setup. Kein Login. Keine Ausreden."}
            </CardTitle>
            <CardDesc>
              {isEn
                ? "Open Lernly, drop in your PDFs, and 2 minutes later you have a pack. Exactly when you would normally drift into something else."
                : "Öffne Lernly, wirf deine PDFs rein, in 2 Minuten hast du ein Paket. Genau in dem Moment, wo du sonst wieder was anderes machen würdest."}
            </CardDesc>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="ln-mono-tag ln-mono-tag-pill ln-mono-tag-accent">
                {isEn ? "No login" : "Ohne Login"}
              </span>
              <span className="ln-mono-tag ln-mono-tag-pill">
                {isEn ? "No credit card" : "Ohne Kreditkarte"}
              </span>
              <span className="ln-mono-tag ln-mono-tag-pill">
                {isEn ? "No app install" : "Ohne App-Install"}
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
              {isEn ? "Studies where you study." : "Lernt wo du lernst."}
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
              <PrivacyRow label={isEn ? "Your material" : "Dein Skript"} value="400 slides" />
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
          title: "Build",
          desc: "No ChatGPT-style wall of text. No extra PDF. A finished study system: flashcards, quiz, essay blueprint — all interactive.",
        },
        {
          label: "Step 3",
          title: "Pass",
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
          title: "Bauen",
          desc: "Keine Textwand wie bei ChatGPT. Kein weiteres PDF. Ein fertiges Lernsystem: Karteikarten, Quiz, Essay-Blueprint — alles interaktiv.",
        },
        {
          label: "Schritt 3",
          title: "Bestehen",
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
            {isEn ? "From chaos to a plan." : "Vom Chaos zum Plan."}{" "}
            <span className="lernly-italic" style={{ color: "var(--color-ln-ink-soft)" }}>
              {isEn ? "In three steps." : "In drei Schritten."}
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
            ? "From your material, for your exam. Ready in 2 minutes — built with the "
            : "Aus deinem Material, für deine Prüfung. In 2 Minuten fertig — gebaut mit der "}
          <a
            href="https://www.anthropic.com/claude"
            target="_blank"
            rel="noopener noreferrer"
            className="ln-accent-link"
          >
            {isEn
              ? "AI that actually understands your material"
              : "KI, die dein Material wirklich versteht"}
          </a>
          .
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
            {tab === "flashcards" && <FlashcardDeck cards={pack.flashcards} />}
            {tab === "overview" && <OverviewView overview={pack.overview} />}
            {tab === "blueprint" && <EssayBlueprintView blueprint={pack.essayBlueprint} />}
            {tab === "simulator" && <ExamSimulator questions={pack.simulator.questions} />}
          </div>
        </div>

        <EmailCapture pack={pack} />
      </div>
    </div>
  );
}

/* ========== FLASHCARD DECK ========== */

type CardStatus = "new" | "again" | "almost" | "known";

function FlashcardDeck({ cards }: { cards: Flashcard[] }) {
  const isEn = useLanguage() === "en";
  const [statuses, setStatuses] = useState<Record<string, CardStatus>>(() => {
    const init: Record<string, CardStatus> = {};
    for (const c of cards) init[c.id] = "new";
    return init;
  });
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<"all" | "wrong">("all");

  const queue = useMemo(() => {
    if (mode === "wrong") {
      return cards.filter(
        (c) => statuses[c.id] === "again" || statuses[c.id] === "almost",
      );
    }
    return cards;
  }, [cards, statuses, mode]);

  const done = index >= queue.length;
  const card = queue[index];
  const knownCount = Object.values(statuses).filter((s) => s === "known").length;

  const rate = (status: CardStatus) => {
    if (!card) return;
    setStatuses((prev) => ({ ...prev, [card.id]: status }));
    setFlipped(false);
    setIndex((i) => i + 1);
  };

  const restart = (m: "all" | "wrong") => {
    setMode(m);
    setIndex(0);
    setFlipped(false);
  };

  if (done) {
    const wrong = Object.values(statuses).filter(
      (s) => s === "again" || s === "almost",
    ).length;
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        <div className="text-[44px]">🎉</div>
        <h3 className="text-[24px] font-semibold tracking-[-0.4px] text-white">
          {isEn ? "Done!" : "Durch!"}
        </h3>
        <p className="text-[14px]" style={{ color: "var(--color-ln-mute)" }}>
          {isEn
            ? `${knownCount} of ${cards.length} cards are solid.`
            : `${knownCount} von ${cards.length} Karten sitzen.`}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {wrong > 0 && (
            <button
              onClick={() => restart("wrong")}
              className="rounded-lg bg-white px-4 py-2 text-[13px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
            >
              {isEn ? `Review missed only (${wrong})` : `Nur falsche wiederholen (${wrong})`}
            </button>
          )}
          <button
            onClick={() => restart("all")}
            className="rounded-lg border border-white/20 bg-transparent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-white/5"
          >
            {isEn ? "All again" : "Alle nochmal"}
          </button>
        </div>
      </div>
    );
  }

  if (!card) return null;
  const progress = (knownCount / cards.length) * 100;

  return (
    <div>
      <div className="flex items-center justify-between text-[12px]" style={{ color: "var(--color-ln-mute)" }}>
        <span>
          {index + 1} / {queue.length}
        </span>
        <span className="uppercase tracking-[1.5px]">{card.category}</span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full transition-all"
          style={{
            width: `${progress}%`,
            background: "var(--color-ln-cyan)",
          }}
        />
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="mt-5 flex min-h-[220px] w-full flex-col justify-between rounded-2xl border border-white/15 bg-black/20 p-7 text-left transition hover:border-white/30"
      >
        <div>
          <div
            className="text-[11px] font-medium uppercase tracking-[2px]"
            style={{ color: "var(--color-ln-mute)" }}
          >
            {flipped ? (isEn ? "Answer" : "Antwort") : isEn ? "Question" : "Frage"}
          </div>
          {flipped ? (
            <div
              className="mt-3 text-[16px] leading-relaxed text-white"
              dangerouslySetInnerHTML={{ __html: card.answer }}
            />
          ) : (
            <div className="mt-3 text-[19px] leading-snug text-white">
              {card.question}
            </div>
          )}
        </div>
        <div className="mt-5 text-[11px]" style={{ color: "var(--color-ln-mute)" }}>
          {isEn ? "Click to flip" : "Klicken zum Umdrehen"}
        </div>
      </button>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <RateButton emoji="😕" label={isEn ? "Again" : "Nochmal"} tone="rose" disabled={!flipped} onClick={() => rate("again")} />
        <RateButton emoji="🤔" label={isEn ? "Almost" : "Fast"} tone="amber" disabled={!flipped} onClick={() => rate("almost")} />
        <RateButton emoji="✅" label={isEn ? "Got it" : "Kann ich"} tone="sage" disabled={!flipped} onClick={() => rate("known")} />
      </div>
    </div>
  );
}

function RateButton({
  emoji,
  label,
  tone,
  disabled,
  onClick,
}: {
  emoji: string;
  label: string;
  tone: "rose" | "amber" | "sage";
  disabled?: boolean;
  onClick: () => void;
}) {
  const hover =
    tone === "rose"
      ? "hover:border-[color:var(--color-ln-rose)]/50 hover:bg-[color:var(--color-ln-rose)]/10"
      : tone === "amber"
        ? "hover:border-[color:var(--color-ln-amber)]/50 hover:bg-[color:var(--color-ln-amber)]/10"
        : "hover:border-[color:var(--color-ln-sage)]/50 hover:bg-[color:var(--color-ln-sage)]/10";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        "flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-[13px] font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-30 " +
        hover
      }
    >
      <span className="text-[18px]">{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

/* ========== ESSAY BLUEPRINT ========== */

function EssayBlueprintView({ blueprint }: { blueprint: StudyPack["essayBlueprint"] }) {
  const isEn = useLanguage() === "en";
  const [openPart, setOpenPart] = useState(0);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <span className="ln-mono-tag">
          {blueprint.totalWords} {isEn ? "words" : "Wörter"}
        </span>
        <span className="ln-mono-tag">{blueprint.timeMinutes} min</span>
      </div>

      <div className="mt-5 space-y-2">
        {blueprint.parts.map((part, i) => {
          const open = i === openPart;
          return (
            <div
              key={part.title}
              className="overflow-hidden rounded-xl border border-white/10 bg-black/20"
            >
              <button
                onClick={() => setOpenPart(open ? -1 : i)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left"
              >
                <div>
                  <div className="text-[14px] font-medium text-white">
                    {part.title}
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--color-ln-mute)" }}>
                    ~{part.words} {isEn ? "words" : "Wörter"} · {part.minutes} min
                  </div>
                </div>
                <span style={{ color: "var(--color-ln-mute)" }}>{open ? "–" : "+"}</span>
              </button>

              {open && (
                <div className="space-y-3 border-t border-white/10 px-4 py-4">
                  {part.paragraphs.map((p) => (
                    <div
                      key={p.label}
                      className="rounded-lg border border-white/10 bg-black/25 p-4"
                    >
                      <div
                        className="text-[10px] font-medium uppercase tracking-[2px]"
                        style={{ color: "var(--color-ln-mute)" }}
                      >
                        {p.label}
                      </div>
                      <div className="mt-1 text-[13px] text-white">
                        {p.instruction}
                      </div>
                      <div
                        className="mt-3 rounded-md border border-white/10 bg-black/30 p-3 text-[13px] italic"
                        style={{ color: "var(--color-ln-ink-soft)" }}
                      >
                        &ldquo;{p.template}&rdquo;
                      </div>
                      {p.references.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {p.references.map((r) => (
                            <span key={r} className="ln-mono-tag">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {blueprint.checklist.length > 0 && (
        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-5">
          <div className="text-[13px] font-medium text-white">
            {isEn ? "Checklist" : "Checkliste"}
          </div>
          <ul className="mt-3 space-y-1.5">
            {blueprint.checklist.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-[13px]"
                style={{ color: "var(--color-ln-ink-soft)" }}
              >
                <span style={{ color: "var(--color-ln-cyan)" }} className="mt-0.5">□</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ========== OVERVIEW ========== */

function OverviewView({ overview }: { overview: StudyPack["overview"] }) {
  const isEn = useLanguage() === "en";
  if (overview.topics.length === 0) {
    return (
      <p className="text-[14px]" style={{ color: "var(--color-ln-mute)" }}>
        {isEn ? "No overview available." : "Keine Übersicht verfügbar."}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {overview.topics.map((topic) => (
        <div key={topic.name}>
          <h3 className="text-[16px] font-semibold tracking-[-0.2px] text-white">
            {topic.name}
          </h3>
          <div className="mt-3 space-y-2">
            {topic.concepts.map((c) => {
              const borderColor =
                c.importance === "high"
                  ? "var(--color-ln-cyan)"
                  : c.importance === "medium"
                    ? "rgba(255,255,255,0.25)"
                    : "rgba(255,255,255,0.08)";
              return (
                <div
                  key={c.term}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                  style={{ borderLeft: `3px solid ${borderColor}` }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="text-[15px] font-semibold text-white">
                      {c.term}
                    </div>
                    {c.author && (
                      <div
                        className="text-[12px]"
                        style={{ color: "var(--color-ln-mute)" }}
                      >
                        {c.author}
                      </div>
                    )}
                  </div>
                  <div
                    className="mt-2 text-[13.5px] leading-relaxed"
                    style={{ color: "var(--color-ln-ink-soft)" }}
                  >
                    {c.definition}
                  </div>
                  {c.examRelevance && (
                    <div className="mt-3 flex items-start gap-2">
                      <span
                        className="mt-[2px] text-[11px]"
                        style={{ color: "var(--color-ln-cyan)" }}
                        aria-hidden
                      >
                        ✦
                      </span>
                      <p
                        className="text-[12.5px] italic leading-relaxed"
                        style={{ color: "var(--color-ln-ink-soft)" }}
                      >
                        {c.examRelevance}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ========== SIMULATOR ========== */

function ExamSimulator({ questions }: { questions: SimulatorQuestion[] }) {
  const isEn = useLanguage() === "en";
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    new Array(questions.length).fill(null),
  );
  const [revealed, setRevealed] = useState(false);

  const q = questions[index];
  const answer = answers[index];
  const done = index >= questions.length;

  if (done || !q) {
    const correct = answers.filter((a, i) => a === questions[i]?.correctIndex).length;
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        <div className="text-[44px]">🏁</div>
        <h3 className="text-[24px] font-semibold tracking-[-0.4px] text-white">
          {isEn ? "Finished" : "Fertig"}
        </h3>
        <p className="text-[14px]" style={{ color: "var(--color-ln-mute)" }}>
          {isEn
            ? `${correct} of ${questions.length} correct.`
            : `${correct} von ${questions.length} richtig.`}
        </p>
        <button
          onClick={() => {
            setIndex(0);
            setAnswers(new Array(questions.length).fill(null));
            setRevealed(false);
          }}
          className="rounded-lg bg-white px-4 py-2 text-[13px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
        >
          {isEn ? "Start again" : "Nochmal starten"}
        </button>
      </div>
    );
  }

  const pick = (i: number) => {
    if (revealed) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = i;
      return next;
    });
    setRevealed(true);
  };

  return (
    <div>
      <div className="text-[12px]" style={{ color: "var(--color-ln-mute)" }}>
        {isEn ? "Question" : "Frage"} {index + 1} / {questions.length}
      </div>

      {q.scenario && (
        <div
          className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4 text-[13px] leading-relaxed"
          style={{ color: "var(--color-ln-ink-soft)" }}
        >
          {q.scenario}
        </div>
      )}

      <h3 className="mt-4 text-[19px] font-semibold leading-snug text-white">
        {q.question}
      </h3>

      <div className="mt-5 space-y-2">
        {q.options.map((opt, i) => {
          const isPicked = answer === i;
          const isCorrect = revealed && i === q.correctIndex;
          const isWrong = revealed && isPicked && i !== q.correctIndex;
          const tone = isCorrect
            ? "border-[color:var(--color-ln-sage)]/60 bg-[color:var(--color-ln-sage)]/10"
            : isWrong
              ? "border-[color:var(--color-ln-rose)]/60 bg-[color:var(--color-ln-rose)]/10"
              : isPicked
                ? "border-[color:var(--color-ln-cyan)] bg-[color:var(--color-ln-cyan)]/10"
                : "border-white/10 bg-black/20 hover:border-white/25";
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={revealed}
              className={
                "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-[14px] text-white transition " +
                tone +
                (revealed ? " cursor-not-allowed" : "")
              }
            >
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/30 text-[11px] font-medium">
                {String.fromCharCode(65 + i)}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div
          className="mt-5 rounded-xl border p-5"
          style={{
            borderColor: "rgba(91,184,216,0.3)",
            background: "rgba(91,184,216,0.08)",
          }}
        >
          <div
            className="text-[11px] font-medium uppercase tracking-[2px]"
            style={{ color: "var(--color-ln-cyan)" }}
          >
            {isEn ? "Explanation" : "Erklärung"}
          </div>
          <p
            className="mt-2 text-[14px] leading-relaxed"
            style={{ color: "var(--color-ln-ink-soft)" }}
          >
            {q.explanation}
          </p>
          <button
            onClick={() => {
              setRevealed(false);
              setIndex((i) => i + 1);
            }}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-[13px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
          >
            {isEn ? "Next →" : "Weiter →"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ========== EMAIL CAPTURE + DOWNLOAD ========== */

function EmailCapture({ pack }: { pack: StudyPack }) {
  const language = useLanguage();
  const isEn = language === "en";
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    localStorage.setItem("lernly-email", email);
    setSaved(true);
  };

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

  return (
    <div className="ln-glass-card mt-6 p-7 md:p-9">
      <div className="flex items-center gap-3">
        <span className="text-[24px]">🎉</span>
        <h3 className="text-[22px] font-semibold tracking-[-0.3px] text-white">
          {isEn ? "Your study pack is ready" : "Dein Lernpaket ist fertig"}
        </h3>
      </div>
      <p
        className="mt-2 text-[14px]"
        style={{ color: "var(--color-ln-mute)" }}
      >
        {isEn
          ? "Download it for offline use — printable, yours forever. Or leave your email; we will tell you when save-by-link is live."
          : "Lade es offline runter — druckbar, für immer dein. Oder trag deine E-Mail ein; wir sagen dir Bescheid, sobald Speichern per Link live ist."}
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSave} className="flex flex-1 gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isEn ? "you@mail.com" : "deine@mail.de"}
            className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:border-[color:var(--color-ln-cyan)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={saved}
            className="rounded-lg border border-white/20 bg-transparent px-4 py-2.5 text-[13.5px] font-medium text-white transition hover:bg-white/5 disabled:opacity-50"
          >
            {saved ? (isEn ? "✓ Saved" : "✓ Gemerkt") : isEn ? "Save" : "Merken"}
          </button>
        </form>
        <button
          onClick={handleDownload}
          className="rounded-lg bg-white px-5 py-2.5 text-[13.5px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
        >
          {isEn ? "Save offline" : "Offline speichern"}
        </button>
      </div>
    </div>
  );
}

/* ========== PRICING ========== */

type PricingTier = {
  name: string;
  tagline: string;
  price: string;
  priceSize: string;
  subtitle: string;
  badge?: string;
  features: string[];
  ctaLabel: string;
  ctaFilled: boolean;
  highlighted?: boolean;
};

const PRICING_TIERS_DE: PricingTier[] = [
  {
    name: "Gratis",
    tagline: "Zum Ausprobieren",
    price: "0€",
    priceSize: "40px",
    subtitle: "für immer",
    features: [
      "3 Klausuren komplett vorbereiten",
      "15 Karten pro Klausur (die Basics)",
      "8-Fragen-Prüfungssimulator",
      "Alle Konzepte nach Wichtigkeit sortiert",
    ],
    ctaLabel: "Erstes Paket erstellen",
    ctaFilled: false,
  },
  {
    name: "Pro",
    tagline: "Wenn mehrere Klausuren anstehen",
    price: "6.99€",
    priceSize: "48px",
    subtitle: "/ Monat",
    badge: "BELIEBT",
    features: [
      "20 Klausuren im Monat",
      "30+ Karten, nach Themen sortiert",
      "Essay-Blueprint mit fertigen Formulierungen",
      "12+ Simulator-Fragen pro Klausur",
      "Offline speichern + Quizlet-Export",
      "Extra-Pakete für 0,49€ falls's mehr wird",
    ],
    ctaLabel: "Pro holen",
    ctaFilled: true,
    highlighted: true,
  },
  {
    name: "Team",
    tagline: "Fürs ganze Studienjahr",
    price: "14.99€",
    priceSize: "40px",
    subtitle: "/ Monat",
    features: [
      "50 Klausuren im Monat (mehr als genug)",
      "Alles aus Pro",
      "Ohne Warten — deine Pakete zuerst",
      "PDF-Spickzettel fürs Handy",
      "Automatischer Lernplan bis zur Prüfung",
    ],
    ctaLabel: "Team holen",
    ctaFilled: false,
  },
];

const PRICING_TIERS_EN: PricingTier[] = [
  {
    name: "Free",
    tagline: "To try it out",
    price: "0€",
    priceSize: "40px",
    subtitle: "forever",
    features: [
      "Prepare 3 exams completely",
      "15 cards per exam (the basics)",
      "8-question exam simulator",
      "All concepts sorted by importance",
    ],
    ctaLabel: "Create first pack",
    ctaFilled: false,
  },
  {
    name: "Pro",
    tagline: "When several exams are coming up",
    price: "6.99€",
    priceSize: "48px",
    subtitle: "/ month",
    badge: "POPULAR",
    features: [
      "20 exams per month",
      "30+ cards, sorted by topic",
      "Essay blueprint with ready-to-use phrasing",
      "12+ simulator questions per exam",
      "Offline save + Quizlet export",
      "Extra packs for 0.49€ if you need more",
    ],
    ctaLabel: "Get Pro",
    ctaFilled: true,
    highlighted: true,
  },
  {
    name: "Team",
    tagline: "For the whole study year",
    price: "14.99€",
    priceSize: "40px",
    subtitle: "/ month",
    features: [
      "50 exams per month (more than enough)",
      "Everything in Pro",
      "No waiting — your packs first",
      "PDF cheat sheet for your phone",
      "Automatic study plan until the exam",
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

        <div className="ln-stagger mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {tiers.map((tier) => (
            <PricingCard
              key={tier.name}
              tier={tier}
              onCta={onActivateUpload}
            />
          ))}
        </div>

        <AdvancedKeyDisclosure onOpenConnect={onOpenConnect} />

        <p
          className="ln-reveal mt-6 text-center text-[12px]"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          {isEn
            ? "All prices include VAT. Cancel anytime."
            : "Alle Preise inkl. MwSt. Jederzeit kündbar."}
        </p>
      </div>
    </section>
  );
}

/* ========== BYOK BANNER (under the pricing cards) ========== */

function BYOKBanner({ onOpenConnect }: { onOpenConnect: () => void }) {
  const isEn = useLanguage() === "en";
  return (
    <div id="connect" className="byok-banner scroll-mt-24">
      <div className="byok-left">
        <div className="byok-icon">
          <ClaudeLogo size={22} />
        </div>
        <div>
          <h4>
            {isEn ? "Have your own Anthropic API key?" : "Du hast einen Anthropic API Key?"}
          </h4>
          <p>
            {isEn
              ? "Connect it to your plan — 30% cheaper and unlimited packs."
              : "Verbinde ihn mit deinem Plan — 30% günstiger und unbegrenzte Pakete."}
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
        <button type="button" onClick={onOpenConnect} className="byok-btn">
          {isEn ? "Connect key →" : "Key verbinden →"}
        </button>
      </div>
    </div>
  );
}

function AdvancedKeyDisclosure({ onOpenConnect }: { onOpenConnect: () => void }) {
  const isEn = useLanguage() === "en";
  return (
    <details className="ln-reveal byok-disclosure">
      <summary>
        <span>
          {isEn
            ? "Advanced: connect your own Claude API key"
            : "Für Power-User: eigenen Claude API Key verbinden"}
        </span>
        <span className="byok-disclosure-hint">
          {isEn ? "30% cheaper" : "30% günstiger"}
        </span>
      </summary>
      <BYOKBanner onOpenConnect={onOpenConnect} />
    </details>
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
  const { name, tagline, price, priceSize, subtitle, badge, features, ctaLabel, ctaFilled, highlighted } =
    tier;
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
        className="mt-2 text-[13px] leading-[1.35]"
        style={{ color: "rgba(255,255,255,0.7)" }}
      >
        {tagline}
      </div>

      <div className="mt-4 flex items-baseline gap-2">
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

      <ul className="mt-6 flex-1">
        {features.map((f, i) => (
          <li
            key={f}
            className="flex items-start gap-3 text-[14px]"
            style={{
              color: "rgba(255,255,255,0.6)",
              padding: "6px 0",
              borderBottom:
                i === features.length - 1
                  ? "none"
                  : "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <span
              className="mt-[2px]"
              style={{ color: "var(--color-ln-cyan)" }}
              aria-hidden
            >
              ✓
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

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
          {isEn ? "The exam is not waiting." : "Die Prüfung wartet nicht."}{" "}
          <span className="lernly-italic text-white">
            {isEn ? "Neither is your study pack." : "Dein Lernpaket auch nicht."}
          </span>
        </h2>
        <a
          href="#upload"
          className="mt-10 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-[15px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
        >
          {isEn ? "Start now" : "Jetzt anfangen"}
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
          ? "Already tested at Uppsala University · 120+ study packs created"
          : "Bereits an der Uppsala Universität getestet · 120+ Lernpakete erstellt"}
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
              {isEn ? "A study mode." : "Ein Lernmodus."}
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
          {isEn ? "Generated page" : "Generierte Seite"}
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
        {isEn ? "Test it with your material →" : "Jetzt mit deinem Material testen →"}
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
    a: "PDF, TXT und MD. PowerPoint-Support kommt bald.",
  },
  {
    q: "Wie gut sind die Karteikarten?",
    a: "Besser als die meisten selbstgeschriebenen. Die KI extrahiert nicht nur Definitionen — sie versteht Zusammenhänge, markiert Prüfungsrelevanz und gibt dir Template-Sätze zum direkt Verwenden.",
  },
  {
    q: "Was ist der Unterschied zu ChatGPT?",
    a: "ChatGPT gibt dir eine Textwand. Lernly gibt dir ein Lernsystem — interaktive Karteikarten zum Flippen, einen Prüfungssimulator mit Feedback, und einen Essay-Blueprint mit fertigen Formulierungen.",
  },
  {
    q: "Kann ich mein Lernpaket bearbeiten?",
    a: "Du kannst es als HTML runterladen und offline nutzen. Bearbeitung innerhalb der App kommt bald.",
  },
];

const FAQ_ITEMS_EN: { q: string; a: string }[] = [
  {
    q: "What happens to my files?",
    a: "Nothing permanent. Your PDFs are processed only to generate the pack and are deleted afterwards. Nothing is stored long term.",
  },
  {
    q: "Which file formats work?",
    a: "PDF, TXT, and MD. PowerPoint support is coming soon.",
  },
  {
    q: "How good are the flashcards?",
    a: "Better than most hand-written ones. The AI does not just extract definitions — it understands relationships, marks exam relevance, and gives you ready-to-use template sentences.",
  },
  {
    q: "How is this different from ChatGPT?",
    a: "ChatGPT gives you a wall of text. Lernly gives you a study system — interactive flashcards to flip, an exam simulator with feedback, and an essay blueprint with ready phrasing.",
  },
  {
    q: "Can I edit my study pack?",
    a: "You can download it as HTML and use it offline. In-app editing is coming soon.",
  },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);
  const isEn = useLanguage() === "en";
  const items = isEn ? FAQ_ITEMS_EN : FAQ_ITEMS_DE;
  return (
    <section id="faq" className="scroll-mt-24 px-6 py-24 md:py-32">
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
