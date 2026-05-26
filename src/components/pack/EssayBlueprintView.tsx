"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { StudyPack } from "@/lib/schema";
import { renderRichText } from "@/lib/richText";

type Language = "en" | "de";

function hashChecklistKey(items: string[]): string {
  // Stable per-pack-shape key so checklists don't bleed across packs.
  let h = 0;
  const s = items.join("|");
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return `lernly-checklist-${h}`;
}

export default function EssayBlueprintView({
  blueprint,
  language = "de",
}: {
  blueprint: NonNullable<StudyPack["essayBlueprint"]>;
  language?: Language;
}) {
  const isEn = language === "en";
  const [openPart, setOpenPart] = useState(0);

  const storageKey = useMemo(
    () => hashChecklistKey(blueprint.checklist),
    [blueprint.checklist],
  );
  const [checked, setChecked] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecked(new Set(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const toggleChecked = (item: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const checklistProgress =
    blueprint.checklist.length > 0
      ? (checked.size / blueprint.checklist.length) * 100
      : 0;

  return (
    <div>
      {/* Meta header */}
      <div className="flex flex-wrap gap-2 text-[12px]">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium tabular-nums"
          style={{
            background: "rgba(255,255,255,0.06)",
            borderColor: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.78)",
          }}
        >
          ✍ {blueprint.totalWords} {isEn ? "words" : "Wörter"}
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium tabular-nums"
          style={{
            background: "rgba(255,255,255,0.06)",
            borderColor: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.78)",
          }}
        >
          ⏱ {blueprint.timeMinutes} min
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium tabular-nums"
          style={{
            background: "rgba(255,255,255,0.06)",
            borderColor: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.78)",
          }}
        >
          📑 {blueprint.parts.length} {isEn ? "parts" : "Teile"}
        </span>
      </div>

      {/* Parts accordion */}
      <div className="mt-6 space-y-2.5">
        {blueprint.parts.map((part, i) => {
          const open = i === openPart;
          return (
            <motion.div
              key={part.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className="overflow-hidden rounded-2xl border"
              style={{
                background: "rgba(20, 22, 28, 0.55)",
                borderColor: open
                  ? "rgba(255,255,255,0.22)"
                  : "rgba(255,255,255,0.1)",
              }}
            >
              <button
                onClick={() => setOpenPart(open ? -1 : i)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-4">
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums"
                    style={{
                      background: open
                        ? "rgba(34,211,238,0.18)"
                        : "rgba(255,255,255,0.06)",
                      border: `1px solid ${open ? "rgba(34,211,238,0.45)" : "rgba(255,255,255,0.12)"}`,
                      color: open ? "rgb(165,243,252)" : "rgba(255,255,255,0.65)",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div className="text-[15px] font-semibold text-white">
                      {part.title}
                    </div>
                    <div
                      className="text-[12px]"
                      style={{ color: "var(--color-ln-mute)" }}
                    >
                      ~{part.words} {isEn ? "words" : "Wörter"} · {part.minutes} min
                      <span className="mx-1.5 opacity-50">·</span>
                      {part.paragraphs.length}{" "}
                      {isEn ? "paragraphs" : "Absätze"}
                    </div>
                  </div>
                </div>
                <motion.span
                  animate={{ rotate: open ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <div className="space-y-3 border-t border-white/10 px-5 py-5">
                      {part.paragraphs.map((p, pi) => (
                        <motion.div
                          key={p.label}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: pi * 0.04, duration: 0.25 }}
                          className="rounded-xl border border-white/10 bg-black/25 p-4"
                        >
                          <div
                            className="text-[10px] font-semibold uppercase tracking-[2px]"
                            style={{ color: "var(--color-ln-mute)" }}
                          >
                            {p.label}
                          </div>
                          <div
                            className="mt-1.5 text-[13.5px] text-white"
                            dangerouslySetInnerHTML={{
                              __html: renderRichText(p.instruction),
                            }}
                          />
                          <div
                            className="mt-3 rounded-lg border p-3 text-[13px] italic leading-relaxed"
                            style={{
                              background: "rgba(34,211,238,0.04)",
                              borderColor: "rgba(34,211,238,0.18)",
                              color: "rgba(255,255,255,0.78)",
                            }}
                          >
                            &ldquo;
                            <span
                              dangerouslySetInnerHTML={{
                                __html: renderRichText(p.template),
                              }}
                            />
                            &rdquo;
                          </div>
                          {p.references.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {p.references.map((r) => (
                                <span
                                  key={r}
                                  className="rounded-md border px-2 py-0.5 text-[11px] font-medium"
                                  style={{
                                    background: "rgba(255,255,255,0.04)",
                                    borderColor: "rgba(255,255,255,0.1)",
                                    color: "rgba(255,255,255,0.7)",
                                  }}
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Interactive checklist */}
      {blueprint.checklist.length > 0 && (
        <div
          className="mt-7 rounded-2xl border p-5"
          style={{
            background: "rgba(20, 22, 28, 0.55)",
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-[14px] font-semibold text-white">
              {isEn ? "Checklist" : "Checkliste"}
            </div>
            <div className="flex items-center gap-2 text-[11px] tabular-nums" style={{ color: "var(--color-ln-mute)" }}>
              <span>
                {checked.size} / {blueprint.checklist.length}
              </span>
              <div className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full"
                  initial={false}
                  animate={{ width: `${checklistProgress}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 24 }}
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(74,222,128,0.95), rgba(34,211,238,0.95))",
                  }}
                />
              </div>
            </div>
          </div>
          <ul className="space-y-1.5">
            {blueprint.checklist.map((item) => {
              const isDone = checked.has(item);
              return (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => toggleChecked(item)}
                    className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left text-[13px] transition hover:bg-white/[0.04]"
                  >
                    <span
                      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition"
                      style={{
                        background: isDone
                          ? "rgba(74,222,128,0.25)"
                          : "transparent",
                        borderColor: isDone
                          ? "rgba(74,222,128,0.65)"
                          : "rgba(255,255,255,0.25)",
                      }}
                    >
                      {isDone && (
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 380, damping: 22 }}
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="rgb(134,239,172)"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </motion.svg>
                      )}
                    </span>
                    <span
                      style={{
                        color: isDone
                          ? "rgba(255,255,255,0.4)"
                          : "rgba(255,255,255,0.85)",
                        textDecoration: isDone ? "line-through" : "none",
                      }}
                    >
                      {item}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
