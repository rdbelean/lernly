"use client";

import type { StudyPack } from "@/lib/schema";

type Language = "en" | "de";

export default function OverviewView({
  overview,
  language = "de",
}: {
  overview: StudyPack["overview"];
  language?: Language;
}) {
  const isEn = language === "en";
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
