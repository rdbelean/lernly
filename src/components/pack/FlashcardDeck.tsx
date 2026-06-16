"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import type { Flashcard } from "@/lib/schema";
import { recordCardReview } from "@/app/dashboard/review/actions";
import { track } from "@/lib/analytics";
import { renderRichText } from "@/lib/richText";
import TutorChat from "./TutorChat";
import type { TutorScope } from "@/lib/tutorPrompt";
import {
  Check,
  Minus,
  RotateCcw,
  Sparkles,
  Trophy,
  CheckCircle2,
  Target,
  AlertCircle,
  Flame,
  type LucideIcon,
} from "lucide-react";
import TopicBreakdown from "./TopicBreakdown";
import { flashcardTopicRows, splitMnemonic } from "@/lib/pack/studyAnalysis";

type Language = "en" | "de";
type CardStatus = "new" | "again" | "almost" | "known";
type Tone = "rose" | "amber" | "sage";

// A card's identity for THIS deck. Card ids are unique only within a pack, so
// the global "Fällig"-Queue (cross-pack review) namespaces by packId to avoid
// collisions; single-pack decks (no packId) fall back to the bare id, so their
// behavior is unchanged.
const deckKey = (c: Flashcard & { packId?: string }) =>
  c.packId ? `${c.packId}:${c.id}` : c.id;

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
  packId,
}: {
  cards: (Flashcard & { packId?: string })[];
  language?: Language;
  packId?: string;
}) {
  const isEn = language === "en";
  const [statuses, setStatuses] = useState<Record<string, CardStatus>>(() => {
    const init: Record<string, CardStatus> = {};
    for (const c of cards) init[deckKey(c)] = "new";
    return init;
  });
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<"all" | "wrong">("all");
  const [streak, setStreak] = useState(0);
  const [exitTone, setExitTone] = useState<Tone | null>(null);
  // Lernly KI-Hilfe — concept-scoped tutor chat invoked from the back of
  // the current card. Closed by default; opens when the user taps the
  // "Erklär's mir" button while the answer is visible.
  const [tutorOpen, setTutorOpen] = useState(false);

  const queue = useMemo(() => {
    if (mode === "wrong") {
      return cards.filter(
        (c) =>
          statuses[deckKey(c)] === "again" || statuses[deckKey(c)] === "almost",
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
  const firstViewFired = useRef(false);
  const firstFlipFired = useRef(false);

  // Funnel: the user turned a card over to see the answer — the active-learning
  // moment. Fires once, the first time a card is flipped to its back.
  const flipCard = () => {
    if (isAnimating) return;
    setFlipped((f) => {
      if (!f && !firstFlipFired.current) {
        firstFlipFired.current = true;
        track("first_card_flipped", { total_cards: cards.length, language });
      }
      return !f;
    });
  };

  // Activation event: a rendered deck means the user reached a flashcard. Fires
  // once on mount, independent of interaction — this is the numerator for
  // "% of users who reached a card" (the Gate-4 activation rate).
  useEffect(() => {
    if (firstViewFired.current) return;
    if (cards.length === 0) return;
    firstViewFired.current = true;
    track("first_flashcard_viewed", {
      total_cards: cards.length,
      language,
    });
  }, [cards.length, language]);

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
    setStatuses((prev) => ({ ...prev, [deckKey(card)]: status }));

    // Persist the rating into the SRS schedule — only for authenticated real
    // packs (anonymous landing/demo decks pass no packId). Fire-and-forget so
    // it never blocks the 320ms advance animation; a failed write can't break
    // the session. Uses the card's real id (not deckKey) as the DB card_id.
    const resolvedPackId = card.packId ?? packId;
    if (resolvedPackId && status !== "new") {
      void recordCardReview(resolvedPackId, card.id, status).catch((e) =>
        console.error("[FlashcardDeck] recordCardReview threw", e),
      );
    }

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
    const tier =
      mastery === 100
        ? { Icon: Trophy, color: "#4FD1A5" }
        : mastery >= 70
          ? { Icon: CheckCircle2, color: "#4FD1A5" }
          : mastery >= 50
            ? { Icon: Target, color: "#F2A33C" }
            : { Icon: AlertCircle, color: "#F2845C" };
    const TierIcon = tier.Icon;
    const topicRows = flashcardTopicRows(
      cards.map((c) => ({ category: c.category, status: statuses[deckKey(c)] })),
    );
    return (
      <div className="flex flex-col items-center gap-5 py-12 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 14 }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: `${tier.color}26` }}
        >
          <TierIcon size={30} strokeWidth={2} color={tier.color} />
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
        <TopicBreakdown rows={topicRows} language={language} />
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

  // Split the answer into its body (direct answer + explanation, kept as
  // separate spaced paragraphs) and the trailing mnemonic, so the card reads
  // with clear separation instead of one cramped block.
  const { body: answerBody, mnemonic: answerMnemonic } = splitMnemonic(
    card.answer,
  );
  const answerBodyParts = answerBody
    .split(/<br\s*\/?>/i)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-[600px]">
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
                <Flame size={12} strokeWidth={2.2} aria-hidden />
                {streak}
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

      {/* Card stack — height is driven by the active (in-flow) card so it grows
          with content; ghosts sit absolutely behind it. The rate buttons live
          AFTER this container in normal flow, so a long answer can never overlap
          them. */}
      <div
        className="relative mt-6"
        style={{ perspective: "1400px" }}
      >
        {/* Ghost cards behind (rendered deepest first so DOM order = back-to-front) */}
        {ghosts
          .slice()
          .reverse()
          .map((g, i) => {
            const depth = ghosts.length - i; // 1 or 2
            return (
              <div
                key={`ghost-${deckKey(g)}`}
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
            key={deckKey(card)}
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
            onClick={flipCard}
            className="relative block w-full cursor-pointer rounded-2xl text-left"
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
              className="grid w-full"
              style={{
                transformStyle: "preserve-3d",
                minHeight: "clamp(320px, 46vh, 460px)",
              }}
            >
              {/* Question face — content centred on both axes so the card reads
                  as one calm focal point, with the flip hint anchored quietly
                  at the bottom. */}
              <div
                className="relative flex flex-col items-center justify-center rounded-2xl border border-white/8 px-6 pt-10 pb-14 text-center sm:px-9"
                style={{
                  gridArea: "1 / 1",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  background: "rgba(20, 22, 28, 0.92)",
                }}
              >
                <div
                  className="text-[11px] font-medium uppercase tracking-[2px]"
                  style={{ color: "var(--color-ln-mute)" }}
                >
                  {isEn ? "Question" : "Frage"}
                </div>
                <div
                  className="mt-4 break-words text-[22px] font-medium leading-snug text-white sm:text-[26px]"
                  dangerouslySetInnerHTML={{ __html: renderRichText(card.question) }}
                />
                <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-1.5 text-[11px]" style={{ color: "var(--color-ln-mute)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                    <polyline points="21 3 21 8 16 8" />
                  </svg>
                  <span>{isEn ? "Click to flip" : "Klicken zum Umdrehen"}</span>
                </div>
              </div>

              {/* Answer face (rotated 180deg) — block vertically centred; text
                  stays left-aligned in a readable column. */}
              <div
                className="flex flex-col justify-center rounded-2xl border border-white/8 px-6 py-8 sm:px-9"
                style={{
                  gridArea: "1 / 1",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  background: "rgba(20, 22, 28, 0.92)",
                }}
              >
                <div className="mx-auto w-full max-w-[460px]">
                  <div
                    className="text-center text-[11px] font-medium uppercase tracking-[2px]"
                    style={{ color: "var(--color-ln-mute)" }}
                  >
                    {isEn ? "Answer" : "Antwort"}
                  </div>
                  <div className="mt-4 space-y-2.5 break-words text-[16px] leading-relaxed text-white sm:text-[17px]">
                    {answerBodyParts.map((p, i) => (
                      <p
                        key={i}
                        dangerouslySetInnerHTML={{ __html: renderRichText(p) }}
                      />
                    ))}
                  </div>
                  {answerMnemonic && (
                    <div
                      className="mt-4 border-t pt-4"
                      style={{ borderColor: "rgba(255,255,255,0.08)" }}
                    >
                      <div
                        className="text-[10.5px] font-semibold uppercase tracking-[0.16em]"
                        style={{ color: "var(--color-cat-teal)" }}
                      >
                        {isEn ? "Memory hook" : "Merkhilfe"}
                      </div>
                      <div
                        className="mt-1.5 break-words text-[14.5px] leading-relaxed"
                        style={{ color: "rgba(255,255,255,0.82)" }}
                        dangerouslySetInnerHTML={{
                          __html: renderRichText(answerMnemonic),
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.button>
        </AnimatePresence>
      </div>

      {/* Lernly KI-Hilfe entry — concept-scoped tutor. Visible only after
          flip so the student saw the model answer first. */}
      {flipped && card && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setTutorOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition"
            style={{
              background: "rgba(91,184,216,0.06)",
              borderColor: "rgba(91,184,216,0.3)",
              color: "var(--color-ln-cyan)",
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={13} strokeWidth={1.9} aria-hidden />
              {isEn ? "Explain it" : "Erklär's mir"}
            </span>
          </button>
        </div>
      )}

      {/* Rate buttons */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <RateButton
          icon={RotateCcw}
          label={isEn ? "Again" : "Nochmal"}
          tone="rose"
          disabled={!flipped || isAnimating}
          onClick={() => rate("again", "rose")}
        />
        <RateButton
          icon={Minus}
          label={isEn ? "Almost" : "Fast"}
          tone="amber"
          disabled={!flipped || isAnimating}
          onClick={() => rate("almost", "amber")}
        />
        <RateButton
          icon={Check}
          label={isEn ? "Got it" : "Kann ich"}
          tone="sage"
          disabled={!flipped || isAnimating}
          onClick={() => rate("known", "sage")}
        />
      </div>

      {card && (
        <TutorChat
          open={tutorOpen}
          onClose={() => setTutorOpen(false)}
          scope={
            {
              kind: "flashcard",
              question: card.question,
              answer: card.answer,
              category: card.category,
            } satisfies TutorScope
          }
          language={language}
        />
      )}
    </div>
  );
}

function RateButton({
  icon: Icon,
  label,
  tone,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  tone: Tone;
  disabled?: boolean;
  onClick: () => void;
}) {
  const iconColor =
    tone === "rose"
      ? "var(--color-cat-coral)"
      : tone === "amber"
        ? "var(--color-amber)"
        : "var(--color-cat-teal)";
  const hoverBorder =
    tone === "rose"
      ? "rgba(242, 132, 92, 0.55)"
      : tone === "amber"
        ? "rgba(242, 163, 60, 0.55)"
        : "rgba(79, 209, 165, 0.55)";
  const hoverBg =
    tone === "rose"
      ? "rgba(242, 132, 92, 0.08)"
      : tone === "amber"
        ? "rgba(242, 163, 60, 0.08)"
        : "rgba(79, 209, 165, 0.08)";

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
      <Icon size={20} strokeWidth={2} color={iconColor} aria-hidden />
      <span>{label}</span>
    </motion.button>
  );
}
