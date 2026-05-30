"use client";

import { useEffect, useMemo, useState } from "react";

type Language = "en" | "de";

// Threshold above which we tell the user "this will take 5-10 min" and slow
// the staged progression down. Matches the experience on a ~35 MB / 300-slide
// upload: extraction is fast, but ~4 task calls to Sonnet on long material
// dominate the wait.
const LARGE_BYTES = 15 * 1024 * 1024;

type StepKey =
  | "extract"
  | "analyze_lens"
  | "overview"
  | "cards"
  | "quiz"
  | "finish";

type Step = { key: StepKey; icon: string; text: string; weight: number };

// Step weights sum to "1 normal-job unit" (~75 s). For large jobs we multiply
// the per-step durations by LARGE_MULTIPLIER so total stretches to ~7.5 min —
// after which the final step keeps spinning until `completed` flips, which
// is honest ("Letzter Schliff…") for the tail of a long generation.
const STEPS_BY_LANG: Record<Language, Step[]> = {
  de: [
    { key: "extract", icon: "📄", text: "Material wird gelesen…", weight: 5 },
    {
      key: "analyze_lens",
      icon: "🎯",
      text: "Altklausur wird einbezogen…",
      weight: 5,
    },
    {
      key: "overview",
      icon: "🗺",
      text: "Konzepte & Übersicht werden erstellt…",
      weight: 25,
    },
    {
      key: "cards",
      icon: "🃏",
      text: "Karteikarten werden gebaut…",
      weight: 25,
    },
    { key: "quiz", icon: "🎯", text: "Quiz wird generiert…", weight: 25 },
    {
      key: "finish",
      icon: "✨",
      text: "Letzter Schliff…",
      weight: 15,
    },
  ],
  en: [
    { key: "extract", icon: "📄", text: "Reading your material…", weight: 5 },
    {
      key: "analyze_lens",
      icon: "🎯",
      text: "Applying past-exam lens…",
      weight: 5,
    },
    {
      key: "overview",
      icon: "🗺",
      text: "Building concepts & overview…",
      weight: 25,
    },
    {
      key: "cards",
      icon: "🃏",
      text: "Building flashcards…",
      weight: 25,
    },
    {
      key: "quiz",
      icon: "🎯",
      text: "Generating the quiz…",
      weight: 25,
    },
    {
      key: "finish",
      icon: "✨",
      text: "Final polish…",
      weight: 15,
    },
  ],
};

const LARGE_MULTIPLIER = 6; // ~75 s × 6 ≈ 7.5 min staged progression

const NORMAL_WAIT_COPY: Record<Language, string> = {
  de: "Durchschnittliche Wartezeit: ~1–3 Minuten",
  en: "Average wait time: ~1–3 minutes",
};

const LARGE_WAIT_COPY: Record<Language, string> = {
  de: "Große Datei — das kann 5–10 Minuten dauern. Die KI liest alles durch und baut dein personalisiertes Paket. Lass den Tab offen.",
  en: "Large file — this can take 5–10 minutes. The model reads through everything and builds your personalized pack. Keep this tab open.",
};

export default function GenerationProgress({
  completed = false,
  language = "en",
  totalBytes,
  hasExam = false,
}: {
  completed?: boolean;
  language?: Language;
  totalBytes?: number;
  hasExam?: boolean;
}) {
  const isLarge =
    typeof totalBytes === "number" && totalBytes > LARGE_BYTES;
  const multiplier = isLarge ? LARGE_MULTIPLIER : 1;

  // Filter out the lens step if no exam is assigned; honest about what the
  // pipeline is actually doing. Scale durations per `multiplier`.
  const steps = useMemo<(Step & { duration: number })[]>(() => {
    return STEPS_BY_LANG[language]
      .filter((s) => s.key !== "analyze_lens" || hasExam)
      .map((s) => ({ ...s, duration: s.weight * 1000 * multiplier }));
  }, [language, hasExam, multiplier]);

  const [internalStep, setInternalStep] = useState(0);
  const [internalProgress, setInternalProgress] = useState(0);

  useEffect(() => {
    setInternalStep(0);
    setInternalProgress(0);
    const stepTimers: ReturnType<typeof setTimeout>[] = [];
    let accumulated = 0;

    steps.forEach((step, i) => {
      stepTimers.push(setTimeout(() => setInternalStep(i), accumulated));
      accumulated += step.duration;
    });

    const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0);
    // Cap at 90%: 10% reserved for the actual completion event so the bar
    // never overpromises. Tick rate scales with totalDuration so very long
    // jobs still get smooth motion.
    const tickMs = Math.max(100, Math.min(500, totalDuration / 600));
    const progressInterval = setInterval(() => {
      setInternalProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + 90 / (totalDuration / tickMs);
      });
    }, tickMs);

    return () => {
      stepTimers.forEach(clearTimeout);
      clearInterval(progressInterval);
    };
  }, [steps]);

  const currentStep = completed ? steps.length : internalStep;
  const progress = completed ? 100 : internalProgress;

  return (
    <div style={{ padding: "32px 0", textAlign: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/lernly-logo.svg"
        alt="Lernly"
        width={64}
        height={64}
        style={{ display: "block", margin: "0 auto 24px" }}
        className="ln-loading-logo"
      />

      <div
        style={{
          width: "100%",
          height: "4px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "2px",
          overflow: "hidden",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background:
              "linear-gradient(90deg, var(--color-ln-cyan), var(--color-ln-sky))",
            borderRadius: "2px",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {isLarge && (
        <p
          style={{
            fontSize: "13px",
            lineHeight: 1.5,
            color: "rgba(255,224,160,0.92)",
            background: "rgba(251,191,36,0.06)",
            border: "1px solid rgba(251,191,36,0.25)",
            borderRadius: "10px",
            padding: "10px 14px",
            margin: "0 auto 18px",
            maxWidth: "440px",
          }}
        >
          {LARGE_WAIT_COPY[language]}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {steps.map((step, i) => {
          const isDone = i < currentStep;
          const isActive = i === currentStep;
          return (
            <div
              key={step.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "8px 16px",
                borderRadius: "10px",
                transition: "all 0.4s ease",
                opacity: isDone ? 0.4 : isActive ? 1 : 0.15,
                transform: isActive ? "scale(1.02)" : "scale(1)",
                background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
              }}
            >
              <span style={{ fontSize: "16px", width: "24px", textAlign: "center" }}>
                {isDone ? "✅" : isActive ? step.icon : "○"}
              </span>

              <span
                style={{
                  fontSize: "14px",
                  fontWeight: isActive ? 500 : 400,
                  color: isActive
                    ? "rgba(255,255,255,0.85)"
                    : isDone
                      ? "rgba(255,255,255,0.35)"
                      : "rgba(255,255,255,0.15)",
                  textAlign: "left",
                }}
              >
                {step.text}
              </span>

              {isActive && (
                <span
                  style={{
                    marginLeft: "auto",
                    width: "16px",
                    height: "16px",
                    border: "2px solid rgba(255,255,255,0.1)",
                    borderTopColor: "var(--color-ln-cyan)",
                    borderRadius: "50%",
                    animation: "ln-progress-spin 0.8s linear infinite",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {!isLarge && (
        <p
          style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.3)",
            marginTop: "20px",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          {NORMAL_WAIT_COPY[language]}
        </p>
      )}

      <style>{`
        @keyframes ln-progress-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes ln-logo-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.05); }
        }
        .ln-loading-logo {
          animation: ln-logo-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
