"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import { InlineRichText } from "@/components/trainer/BlockRenderer";
import {
  type CourseCardEntry,
  getCardStatus,
  type TopicStatusKey,
} from "@/components/trainer/trainerHelpers";
import { formatTrainerRichHtml } from "@/lib/trainer/importer";
import { rateTrainerCard } from "@/lib/trainer/store";
import type {
  McpCourseTopic,
  TrainerProgressState,
  TrainerRating,
} from "@/lib/trainer/types";

const CARD_RATINGS: {
  rating: TrainerRating;
  keyLabel: string;
  label: string;
  style: string;
}[] = [
  {
    rating: 0,
    keyLabel: "1",
    label: "Nochmal",
    style: "border-err-ink text-err-ink hover:bg-err-bg",
  },
  {
    rating: 1,
    keyLabel: "2",
    label: "Schwer",
    style: "border-urgent-ink text-urgent-ink hover:bg-urgent-bg",
  },
  {
    rating: 2,
    keyLabel: "3",
    label: "Gut",
    style: "border-ok-ink text-ok-ink hover:bg-ok-bg",
  },
  {
    rating: 3,
    keyLabel: "4",
    label: "Leicht",
    style: "border-primary text-primary hover:bg-work-bg",
  },
];

function FlashcardRunner({
  entries,
  filterMode,
  cardMap,
  progress,
  onRestartAll,
}: {
  entries: readonly CourseCardEntry[];
  filterMode: "open" | "all";
  cardMap: Map<string, CourseCardEntry>;
  progress: TrainerProgressState;
  onRestartAll: () => void;
}) {
  const [queue, setQueue] = useState<string[]>(() => {
    const open = entries.filter(
      (c) => getCardStatus(progress, c.card.id) !== "ok",
    );
    const active = filterMode === "open" && open.length > 0 ? open : entries;
    return active.map((c) => c.card.id);
  });
  const [deckIds] = useState<string[]>(() => queue);
  const [cursor, setCursor] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const safeIdx = Math.min(cursor, Math.max(0, queue.length - 1));
  const currentId = queue[safeIdx];
  const currentEntry = currentId ? cardMap.get(currentId) : undefined;

  const knownCount = useMemo(
    () =>
      deckIds.filter((id) => getCardStatus(progress, id) === "ok").length,
    [deckIds, progress],
  );
  const pctDone =
    deckIds.length > 0
      ? Math.round((knownCount / deckIds.length) * 100)
      : 0;

  const handleRate = useCallback(
    (rating: TrainerRating) => {
      if (!currentId) return;
      rateTrainerCard(currentId, rating);

      if (rating < 2) {
        setQueue((prev) => {
          const remaining = prev.filter((id) => id !== currentId);
          const nextQ = [...remaining];
          nextQ.splice(Math.min(nextQ.length, rating === 0 ? 2 : 4), 0, currentId);
          return nextQ;
        });
        setCursor((c) => Math.min(c, Math.max(0, queue.length - 1)));
      } else {
        setCursor((c) => (c + 1 < queue.length ? c + 1 : 0));
      }
      setFlipped(false);
    },
    [currentId, queue.length],
  );

  const goPrev = useCallback(() => {
    setCursor((c) => (c > 0 ? c - 1 : Math.max(0, queue.length - 1)));
    setFlipped(false);
  }, [queue.length]);

  const goNext = useCallback(() => {
    setCursor((c) => (c + 1 < queue.length ? c + 1 : 0));
    setFlipped(false);
  }, [queue.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!currentEntry || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === " ") {
        e.preventDefault();
        setFlipped((v) => !v);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (flipped && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        handleRate((Number(e.key) - 1) as TrainerRating);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentEntry, flipped, goPrev, goNext, handleRate]);

  if (!currentEntry) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok-bg text-ok-ink">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 font-display text-[22px] font-bold text-text">
          Alle gewählten Karten sitzen!
        </h2>
        <button
          type="button"
          onClick={onRestartAll}
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-[14.5px] font-semibold text-on-primary transition hover:bg-primary-press"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          <span>Alle Karten nochmal durchgehen</span>
        </button>
      </div>
    );
  }

  const { card } = currentEntry;
  const status: TopicStatusKey = getCardStatus(progress, card.id);
  const statusLabel =
    status === "ok"
      ? "Beherrscht"
      : status === "learn"
        ? "In Arbeit"
        : status === "red"
          ? "Nochmal"
          : "Neu";
  const statusClass =
    status === "ok"
      ? "bg-ok-bg text-ok-ink"
      : status === "learn"
        ? "bg-urgent-bg text-urgent-ink"
        : status === "red"
          ? "bg-err-bg text-err-ink"
          : "bg-surface-2 text-text-dim";

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div className="rounded-2xl border border-line bg-surface px-5 py-3.5">
        <div className="flex items-center justify-between text-[13px] font-medium text-text-dim tabular-nums">
          <span>
            Karte {safeIdx + 1} von {queue.length} · {currentEntry.topicTitle}
          </span>
          <span>
            {knownCount} / {deckIds.length} sicher ({pctDone} %)
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-ok-ink transition-all"
            style={{ width: `${pctDone}%` }}
          />
        </div>
      </div>

      {/* Main Flashcard */}
      <article className="flex min-h-[340px] flex-col justify-between rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-dim">
              {flipped ? "Antwort" : "Frage"}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${statusClass}`}
            >
              {statusLabel}
            </span>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => setFlipped((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setFlipped((v) => !v);
            }}
            className="mt-5 cursor-pointer rounded-xl bg-bg/60 p-5 text-left transition hover:bg-bg"
          >
            <div className="font-display text-[20px] font-bold leading-snug text-text sm:text-[22px]">
              <InlineRichText md={card.front} />
            </div>

            {!flipped ? (
              <p className="mt-4 text-[13.5px] font-medium text-primary">
                Klicken oder Leertaste drücken zum Aufdecken
              </p>
            ) : null}
          </div>

          {card.hint && !flipped ? (
            <details className="mt-4 rounded-xl border border-primary/40 bg-work-bg/40 px-4 py-2.5 text-[14px]">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-work-ink">
                <Lightbulb className="h-4 w-4" aria-hidden="true" />
                <span>Hinweis</span>
              </summary>
              <p className="mt-1.5 text-text">
                <InlineRichText md={card.hint} />
              </p>
            </details>
          ) : null}

          {flipped ? (
            <div className="mt-5 space-y-4 border-t border-line pt-5">
              {card.isHtml ? (
                <div
                  className="trainer-rich-html"
                  dangerouslySetInnerHTML={{
                    __html: formatTrainerRichHtml(card.back),
                  }}
                />
              ) : (
                <div className="text-[16px] leading-relaxed text-text">
                  <InlineRichText md={card.back} />
                </div>
              )}

              {card.merke ? (
                <div className="rounded-r-xl border-l-4 border-ok-ink bg-ok-bg px-4 py-3 text-[14.5px] text-text">
                  <p className="mb-1 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-ok-ink">
                    <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Merke</span>
                  </p>
                  <InlineRichText md={card.merke} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Footer Actions: Prev / Rating 1-4 / Next */}
        <div className="mt-6 border-t border-line pt-5">
          {flipped ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {CARD_RATINGS.map((btn) => (
                  <button
                    key={btn.rating}
                    type="button"
                    onClick={() => handleRate(btn.rating)}
                    className={`rounded-xl border-2 bg-surface px-3 py-2 text-center transition ${btn.style}`}
                  >
                    <span className="font-display text-[14.5px] font-bold">
                      {btn.keyLabel} · {btn.label}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-center text-[12px] text-text-faint">
                Shortcuts: Leertaste = Umdrehen · 1–4 = Bewerten · Pfeiltasten = Blättern
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goPrev}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-4 text-[13.5px] font-semibold text-text transition hover:opacity-85"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Vorherige</span>
              </button>

              <button
                type="button"
                onClick={() => setFlipped(true)}
                className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-[14px] font-semibold text-on-primary transition hover:bg-primary-press"
              >
                Umdrehen (Leertaste)
              </button>

              <button
                type="button"
                onClick={goNext}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-4 text-[13.5px] font-semibold text-text transition hover:opacity-85"
              >
                <span>Nächste</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

export function TrainerFlashcardsTab({
  sortedTopics,
  allCards,
  selectedTopicId,
  progress,
  onSelectTopic,
}: {
  sortedTopics: readonly McpCourseTopic[];
  allCards: readonly CourseCardEntry[];
  selectedTopicId: string;
  progress: TrainerProgressState;
  onSelectTopic: (topicId: string) => void;
}) {
  const [scope, setScope] = useState<"all" | "topic">(
    allCards.some((c) => c.topicId === selectedTopicId) ? "topic" : "all",
  );
  const [filterMode, setFilterMode] = useState<"open" | "all">("all");
  const [generation, setGeneration] = useState(0);

  const scopedCards = useMemo(
    () =>
      scope === "all"
        ? allCards
        : allCards.filter((c) => c.topicId === selectedTopicId),
    [allCards, scope, selectedTopicId],
  );

  const openCards = useMemo(
    () =>
      scopedCards.filter((c) => getCardStatus(progress, c.card.id) !== "ok"),
    [scopedCards, progress],
  );

  const cardMap = useMemo(
    () => new Map(allCards.map((entry) => [entry.card.id, entry])),
    [allCards],
  );

  if (allCards.length === 0) {
    return (
      <div className="mx-auto max-w-[780px] rounded-2xl border border-line bg-surface p-8 text-[15px] text-text-dim">
        Für diesen Kurs sind noch keine Karteikarten hinterlegt.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[780px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
        <select
          aria-label="Karten nach Thema filtern"
          value={scope === "all" ? "__ALL__" : selectedTopicId}
          onChange={(e) => {
            if (e.target.value === "__ALL__") {
              setScope("all");
            } else {
              setScope("topic");
              onSelectTopic(e.target.value);
            }
            setGeneration((g) => g + 1);
          }}
          className="h-10 min-w-[200px] max-w-full flex-1 rounded-xl border border-line bg-bg px-3 text-[14px] font-semibold text-text outline-none focus:border-primary"
        >
          <option value="__ALL__">Alle Karten ({allCards.length})</option>
          {sortedTopics.map((t) => {
            const count = allCards.filter((c) => c.topicId === t.id).length;
            if (count === 0) return null;
            return (
              <option key={t.id} value={t.id}>
                {t.title} ({count})
              </option>
            );
          })}
        </select>

        <div className="flex items-center gap-1.5 rounded-xl border border-line bg-bg p-1">
          <button
            type="button"
            onClick={() => {
              setFilterMode("open");
              setGeneration((g) => g + 1);
            }}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
              filterMode === "open"
                ? "bg-primary text-on-primary"
                : "text-text-dim hover:text-text"
            }`}
          >
            Offen ({openCards.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterMode("all");
              setGeneration((g) => g + 1);
            }}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
              filterMode === "all"
                ? "bg-primary text-on-primary"
                : "text-text-dim hover:text-text"
            }`}
          >
            Alle ({scopedCards.length})
          </button>
        </div>
      </div>

      <FlashcardRunner
        key={`${scope}-${selectedTopicId}-${filterMode}-${generation}`}
        entries={scopedCards}
        filterMode={filterMode}
        cardMap={cardMap}
        progress={progress}
        onRestartAll={() => {
          setFilterMode("all");
          setGeneration((g) => g + 1);
        }}
      />
    </div>
  );
}
