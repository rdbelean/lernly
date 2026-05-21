"use client";

import { useMemo, useState } from "react";
import type { Flashcard } from "@/lib/schema";

type Language = "en" | "de";
type CardStatus = "new" | "again" | "almost" | "known";

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
