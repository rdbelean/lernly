"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import type { Flashcard } from "@/lib/schema";
import { track } from "@/lib/analytics";
import { toSafeInlineHtml } from "@/lib/richText";

type Language = "en" | "de";
type CardStatus = "new" | "again" | "almost" | "known";
type Tone = "rose" | "amber" | "sage";

const TONE_GLOW: Record<Tone, string> = {
  rose: "0 0 0 3px rgba(244,114,98,0.55), 0 20px 60px -10px rgba(244,114,98,0.5)",
  amber: "0 0 0 3px rgba(251,191,36,0.55), 0 20px 60px -10px rgba(251,191,36,0.5)",
  sage: "0 0 0 3px rgba(74,222,128,0.55), 0 20px 60px -10px rgba(74,222,128,0.5)",
};

const TONE_EXIT: Record<Tone, { x: number; y: number; rotate: number }> = {
  rose: { x: -360, y: 40, rotate: -18 },
  amber: { x: 0, y: -360, rotate: 0 },
  sage: { x: 360, y: 40, rotate: 18 },
};

const CONFETTI_COLORS = ["#22d3ee", "#a78bfa", "#fbbf24", "#4ade80", "#f87171"];

function burstConfetti(big = false) {
  if (typeof window === "undefined") return;
  confetti({
    particleCount: big ? 220 : 90,
    spread: big ? 120 : 80,
    origin: { y: 0.55 },
    colors: CONFETTI_COLORS,
    scalar: big ? 1.2 : 1,
  });
}

export default function FlashcardDeck({
  cards,
  language = "de",
}: {
  cards: Flashcard[];
  language?: Language;
}) {
  const isEn = language === "en";
  const [statuses, setStatuses] = useState<Record<string, CardStatus>>(() => {
    const init: Record<string, CardStatus> = {};
    for (const c of cards) init[c.id] = "new";
    return init;
  });
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<"all" | "wrong">("all");
  const [streak, setStreak] = useState(0);
  const [exitTone, setExitTone] = useState<Tone | null>(null);

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
  const progress = (knownCount / cards.length) * 100;
  const isAnimating = exitTone !== null;

  const firstRateFired = useRef(false);
  const completionFired = useRef(false);

  useEffect(() => {
    if (!done) return;
    if (completionFired.current) return;
    completionFired.current = true;
    track("flashcard_session_completed", {
      known: knownCount,
      total: cards.length,
      mastery_percent: Math.round((knownCount / cards.length) * 100),
    });
    if (knownCount === cards.length) {
      burstConfetti(true);
    }
  }, [done, knownCount, cards.length]);

  const rate = (status: CardStatus, tone: Tone) => {
    if (!card || isAnimating) return;
    if (!firstRateFired.current) {
      firstRateFired.current = true;
      track("flashcard_rated", { rating: status, total_cards: cards.length });
    }
    setExitTone(tone);
    setStatuses((prev) => ({ ...prev, [card.id]: status }));

    const newStreak = status === "known" ? streak + 1 : 0;
    setStreak(newStreak);
    if (newStreak > 0 && newStreak % 5 === 0) {
      burstConfetti();
      track("flashcard_streak_achieved", { streak: newStreak });
    }

    window.setTimeout(() => {
      setFlipped(false);
      setIndex((i) => i + 1);
      setExitTone(null);
    }, 320);
  };

  const restart = (m: "all" | "wrong") => {
    setMode(m);
    setIndex(0);
    setFlipped(false);
    setStreak(0);
    completionFired.current = false;
  };

  if (done) {
    const wrong = Object.values(statuses).filter(
      (s) => s === "again" || s === "almost",
    ).length;
    const mastery = Math.round((knownCount / cards.length) * 100);
    return (
      <div className="flex flex-col items-center gap-5 py-12 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 14 }}
          className="text-[64px]"
        >
          {mastery === 100 ? "🏆" : mastery >= 70 ? "🎉" : "💪"}
        </motion.div>
        <div>
          <h3 className="text-[28px] font-bold tracking-[-0.6px] text-white">
            {isEn ? "Done!" : "Durch!"}
          </h3>
          <p className="mt-2 text-[14px]" style={{ color: "var(--color-ln-mute)" }}>
            {isEn
              ? `${knownCount} of ${cards.length} cards — ${mastery}% mastery`
              : `${knownCount} von ${cards.length} Karten — ${mastery}% Mastery`}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {wrong > 0 && (
            <button
              onClick={() => restart("wrong")}
              className="rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-[#0F1535] transition hover:bg-white/90"
            >
              {isEn ? `Review missed (${wrong})` : `Nur falsche wiederholen (${wrong})`}
            </button>
          )}
          <button
            onClick={() => restart("all")}
            className="rounded-full border border-white/20 bg-transparent px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-white/5"
          >
            {isEn ? "All again" : "Alle nochmal"}
          </button>
        </div>
      </div>
    );
  }

  if (!card) return null;

  const ghosts = queue.slice(index + 1, index + 3);

  return (
    <div>
      {/* Header: progress + streak + category */}
      <div className="flex items-center justify-between gap-3 text-[12px]" style={{ color: "var(--color-ln-mute)" }}>
        <span className="tabular-nums">
          {index + 1} / {queue.length}
        </span>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {streak >= 2 && (
              <motion.span
                key={`streak-${streak}`}
                initial={{ scale: 1.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 18 }}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold"
                style={{
                  background: "rgba(251,191,36,0.18)",
                  color: "rgb(252,211,77)",
                  border: "1px solid rgba(251,191,36,0.35)",
                }}
              >
                🔥 {streak}
              </motion.span>
            )}
          </AnimatePresence>
          <span className="uppercase tracking-[1.5px]">{card.category}</span>
        </div>
      </div>

      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 180, damping: 25 }}
          style={{
            background:
              "linear-gradient(90deg, rgba(74,222,128,0.95), rgba(34,211,238,0.95))",
          }}
        />
      </div>

      {/* Card stack */}
      <div
        className="relative mt-6"
        style={{ perspective: "1400px", minHeight: "280px" }}
      >
        {/* Ghost cards behind (rendered deepest first so DOM order = back-to-front) */}
        {ghosts
          .slice()
          .reverse()
          .map((g, i) => {
            const depth = ghosts.length - i; // 1 or 2
            return (
              <div
                key={`ghost-${g.id}`}
                aria-hidden
                className="absolute inset-0 rounded-2xl border border-white/10 bg-black/15"
                style={{
                  transform: `translateY(${depth * 10}px) scale(${1 - depth * 0.045})`,
                  opacity: 0.55 - (depth - 1) * 0.22,
                  pointerEvents: "none",
                }}
              />
            );
          })}

        {/* Active card with flip + exit animation */}
        <AnimatePresence mode="popLayout">
          <motion.button
            key={card.id}
            type="button"
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              boxShadow: exitTone
                ? TONE_GLOW[exitTone]
                : "0 4px 24px rgba(0,0,0,0.18)",
            }}
            exit={
              exitTone
                ? {
                    ...TONE_EXIT[exitTone],
                    opacity: 0,
                    transition: { duration: 0.32, ease: [0.4, 0, 0.6, 1] },
                  }
                : { opacity: 0, y: -20, scale: 0.95 }
            }
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            onClick={() => !isAnimating && setFlipped((f) => !f)}
            className="absolute inset-0 cursor-pointer rounded-2xl text-left"
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
              className="relative h-full w-full"
              style={{ transformStyle: "preserve-3d", minHeight: "260px" }}
            >
              {/* Question face */}
              <div
                className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-white/15 p-7"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  background: "rgba(20, 22, 28, 0.92)",
                }}
              >
                <div>
                  <div
                    className="text-[11px] font-medium uppercase tracking-[2px]"
                    style={{ color: "var(--color-ln-mute)" }}
                  >
                    {isEn ? "Question" : "Frage"}
                  </div>
                  <div className="mt-3 text-[19px] leading-snug text-white">
                    {card.question}
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-ln-mute)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                    <polyline points="21 3 21 8 16 8" />
                  </svg>
                  <span>{isEn ? "Click to flip" : "Klicken zum Umdrehen"}</span>
                </div>
              </div>

              {/* Answer face (rotated 180deg) */}
              <div
                className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-white/15 p-7"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  background: "rgba(20, 22, 28, 0.92)",
                }}
              >
                <div>
                  <div
                    className="text-[11px] font-medium uppercase tracking-[2px]"
                    style={{ color: "var(--color-ln-mute)" }}
                  >
                    {isEn ? "Answer" : "Antwort"}
                  </div>
                  <div
                    className="mt-3 text-[16px] leading-relaxed text-white"
                    dangerouslySetInnerHTML={{
                      __html: toSafeInlineHtml(card.answer),
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </motion.button>
        </AnimatePresence>
      </div>

      {/* Rate buttons */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <RateButton
          emoji="😕"
          label={isEn ? "Again" : "Nochmal"}
          tone="rose"
          disabled={!flipped || isAnimating}
          onClick={() => rate("again", "rose")}
        />
        <RateButton
          emoji="🤔"
          label={isEn ? "Almost" : "Fast"}
          tone="amber"
          disabled={!flipped || isAnimating}
          onClick={() => rate("almost", "amber")}
        />
        <RateButton
          emoji="✅"
          label={isEn ? "Got it" : "Kann ich"}
          tone="sage"
          disabled={!flipped || isAnimating}
          onClick={() => rate("known", "sage")}
        />
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
  tone: Tone;
  disabled?: boolean;
  onClick: () => void;
}) {
  const hoverBorder =
    tone === "rose"
      ? "rgba(244,114,98,0.55)"
      : tone === "amber"
        ? "rgba(251,191,36,0.55)"
        : "rgba(74,222,128,0.55)";
  const hoverBg =
    tone === "rose"
      ? "rgba(244,114,98,0.08)"
      : tone === "amber"
        ? "rgba(251,191,36,0.08)"
        : "rgba(74,222,128,0.08)";

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      transition={{ type: "spring", stiffness: 380, damping: 20 }}
      className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-black/20 px-3 py-3.5 text-[13px] font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-30"
      style={
        disabled
          ? undefined
          : ({
              "--hover-border": hoverBorder,
              "--hover-bg": hoverBg,
            } as React.CSSProperties)
      }
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.borderColor = hoverBorder;
        e.currentTarget.style.background = hoverBg;
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.borderColor = "";
        e.currentTarget.style.background = "";
      }}
    >
      <span className="text-[20px]">{emoji}</span>
      <span>{label}</span>
    </motion.button>
  );
}
