"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { icon: "📄", text: "Dateien werden gelesen...", duration: 3000 },
  { icon: "🔍", text: "Schlüsselkonzepte werden extrahiert...", duration: 5000 },
  { icon: "🎴", text: "Karteikarten werden erstellt...", duration: 8000 },
  { icon: "📐", text: "Essay-Blueprint wird gebaut...", duration: 6000 },
  { icon: "🎮", text: "Prüfungssimulator wird konfiguriert...", duration: 5000 },
  { icon: "✨", text: "Lernpaket wird fertiggestellt...", duration: 10000 },
];

export default function GenerationProgress({ completed = false }: { completed?: boolean }) {
  const [internalStep, setInternalStep] = useState(0);
  const [internalProgress, setInternalProgress] = useState(0);

  useEffect(() => {
    const stepTimers: ReturnType<typeof setTimeout>[] = [];
    let accumulated = 0;

    STEPS.forEach((step, i) => {
      stepTimers.push(setTimeout(() => setInternalStep(i), accumulated));
      accumulated += step.duration;
    });

    const totalDuration = STEPS.reduce((sum, s) => sum + s.duration, 0);
    const progressInterval = setInterval(() => {
      setInternalProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + 90 / (totalDuration / 100);
      });
    }, 100);

    return () => {
      stepTimers.forEach(clearTimeout);
      clearInterval(progressInterval);
    };
  }, []);

  const currentStep = completed ? STEPS.length : internalStep;
  const progress = completed ? 100 : internalProgress;

  return (
    <div style={{ padding: "32px 0", textAlign: "center" }}>
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

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {STEPS.map((step, i) => {
          const isDone = i < currentStep;
          const isActive = i === currentStep;
          return (
            <div
              key={i}
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

      <p
        style={{
          fontSize: "13px",
          color: "rgba(255,255,255,0.3)",
          marginTop: "20px",
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        Durchschnittliche Wartezeit: ~30–60 Sekunden
      </p>

      <style>{`
        @keyframes ln-progress-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
