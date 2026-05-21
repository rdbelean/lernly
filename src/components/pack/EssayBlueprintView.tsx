"use client";

import { useState } from "react";
import type { StudyPack } from "@/lib/schema";

type Language = "en" | "de";

export default function EssayBlueprintView({
  blueprint,
  language = "de",
}: {
  blueprint: StudyPack["essayBlueprint"];
  language?: Language;
}) {
  const isEn = language === "en";
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
