"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
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
import { formatInterval, isCardDue, previewIntervals } from "@/lib/trainer/sm2";
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

type FilterMode = "due" | "all";

function FlashcardRunner({
  entries,
  filterMode,
  cardMap,
  progress,
  onRestartAll,
}: {
  entries: readonly CourseCardEntry[];
  filterMode: FilterMode;
  cardMap: Map<string, CourseCardEntry>;
  progress: TrainerProgressState;
  onRestartAll: () => void;
}) {
  const [now] = useState(() => new Date());
  // Session queue: due cards first (oldest due first), new cards are due now.
  const [queue, setQueue] = useState<string[]>(() => {
    const dueAt = (id: string) => {
      const s = progress.cardSchedule[id];
      return s ? Date.parse(s.due) : now.getTime();
    };
    const pool =
      filterMode === "due"
        ? entries.filter((c) => isCardDue(progress.cardSchedule[c.card.id], now))
        : entries;
    return [...pool].sort((x, y) => dueAt(x.card.id) - dueAt(y.card.id)).map((c) => c.card.id);
  });
  const [sessionSize] = useState(() => queue.length);
  const [reviewed, setReviewed] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [savedTick, setSavedTick] = useState(0);

  const safeIdx = Math.min(cursor, Math.max(0, queue.length - 1));
  const currentId = queue[safeIdx];
  const currentEntry = currentId ? cardMap.get(currentId) : undefined;
  const pctDone = sessionSize > 0 ? Math.round((reviewed / sessionSize) * 100) : 0;
  const intervals = previewIntervals(currentId ? progress.cardSchedule[currentId] : undefined);

  useEffect(() => {
    if (savedTick === 0) return;
    const t = setTimeout(() => setSavedTick(0), 1600);
    return () => clearTimeout(t);
  }, [savedTick]);

  const handleRate = useCallback(
    (rating: TrainerRating) => {
      if (!currentId) return;
      rateTrainerCard(currentId, rating);
      setSavedTick((n) => n + 1);
      setQueue((prev) => {
        const idx = prev.indexOf(currentId);
        const rest = prev.filter((id) => id !== currentId);
        // "Nochmal" comes back two cards later in this session (Anki relearn).
        if (rating === 0) rest.splice(Math.min(rest.length, idx + 2), 0, currentId);
        return rest;
      });
      if (rating > 0) setReviewed((n) => n + 1);
      setCursor((c) => c);
      setFlipped(false);
    },
    [currentId],
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
    const nextDue = entries
      .map((c) => progress.cardSchedule[c.card.id])
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .map((x) => Date.parse(x.due))
      .sort((x, y) => x - y)[0];
    const days = nextDue ? Math.max(0, Math.ceil((nextDue - now.getTime()) / 86_400_000)) : null;
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok-bg text-ok-ink">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 font-display text-[22px] font-semibold text-text">
          Für heute ist alles wiederholt
        </h2>
        {days !== null ? (
          <p className="mt-2 text-[14.5px] text-text-dim">
            Nächste fällige Karte: {days <= 0 ? "heute" : `in ${formatInterval(days)}`}.
          </p>
        ) : null}
        <button
          type="button"
          onClick={onRestartAll}
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-[14.5px] font-semibold text-on-primary transition hover:bg-primary-press"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          <span>Alle Karten trotzdem üben</span>
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
      {/* Session progress */}
      <div className="rounded-2xl border border-line bg-surface px-5 py-3.5">
        <div className="flex items-center justify-between gap-3 text-[13px] font-medium text-text-dim tabular-nums">
          <span className="min-w-0 truncate">
            {reviewed} von {sessionSize} wiederholt · {currentEntry.topicTitle}
          </span>
          {savedTick > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-ok-ink" role="status">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Gespeichert
            </span>
          ) : (
            <span className="shrink-0">{queue.length} offen</span>
          )}
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-ok-ink transition-[width] duration-300 ease-out"
            style={{ width: `${pctDone}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <article className="flex min-h-[380px] flex-col justify-between rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-text-dim">
              {flipped ? "Antwort" : "Frage"}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${statusClass}`}>
              {statusLabel}
            </span>
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label={flipped ? "Frage anzeigen" : "Antwort aufdecken"}
            onClick={() => setFlipped((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setFlipped((v) => !v);
            }}
            className="mt-5 flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-xl bg-bg/60 p-6 text-center transition hover:bg-bg"
          >
            <div className="max-w-[560px] font-display text-[20px] font-semibold leading-snug text-text sm:text-[24px]">
              <InlineRichText md={card.front} />
            </div>
            {!flipped ? (
              <p className="mt-4 text-[13.5px] font-medium text-primary">
                Klicken oder Leertaste zum Umdrehen
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
            <div className="mx-auto mt-5 max-w-[620px] space-y-4 border-t border-line pt-5 text-center">
              {card.isHtml ? (
                <div
                  className="trainer-rich-html"
                  dangerouslySetInnerHTML={{
                    __html: formatTrainerRichHtml(card.back),
                  }}
                />
              ) : (
                <div className="text-[16.5px] leading-relaxed text-text">
                  <InlineRichText md={card.back} />
                </div>
              )}

              {card.merke ? (
                <div className="rounded-xl bg-ok-bg px-4 py-3 text-left text-[14.5px] text-text">
                  <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-ok-ink">
                    <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Merke</span>
                  </p>
                  <InlineRichText md={card.merke} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Footer: SM-2 rating (flipped) or navigation */}
        <div className="mt-6 border-t border-line pt-5">
          {flipped ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {CARD_RATINGS.map((btn) => (
                  <button
                    key={btn.rating}
                    type="button"
                    onClick={() => handleRate(btn.rating)}
                    className={`flex flex-col items-center rounded-xl border-2 bg-surface px-3 py-2 text-center transition active:scale-[0.97] ${btn.style}`}
                  >
                    <span className="font-display text-[14.5px] font-semibold">{btn.label}</span>
                    <span className="text-[12px] font-medium tabular-nums opacity-90">
                      {intervals[btn.rating]}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-center text-[12px] text-text-faint">
                Tasten: Leertaste = Umdrehen · 1–4 = Bewerten · Pfeile = Blättern
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Vorherige Karte"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-4 text-[13.5px] font-semibold text-text transition hover:opacity-85"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Vorherige</span>
              </button>

              <button
                type="button"
                onClick={() => setFlipped(true)}
                className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-[14px] font-semibold text-on-primary transition hover:bg-primary-press active:scale-[0.97]"
              >
                Umdrehen
              </button>

              <button
                type="button"
                onClick={goNext}
                aria-label="Nächste Karte"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-4 text-[13.5px] font-semibold text-text transition hover:opacity-85"
              >
                <span className="hidden sm:inline">Nächste</span>
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
  const [now] = useState(() => new Date());
  const [filterMode, setFilterMode] = useState<FilterMode>(() =>
    allCards.some((c) => isCardDue(progress.cardSchedule[c.card.id], now)) ? "due" : "all",
  );
  const [generation, setGeneration] = useState(0);

  const scopedCards = useMemo(
    () =>
      scope === "all"
        ? allCards
        : allCards.filter((c) => c.topicId === selectedTopicId),
    [allCards, scope, selectedTopicId],
  );

  const dueCards = useMemo(
    () => scopedCards.filter((c) => isCardDue(progress.cardSchedule[c.card.id], now)),
    [scopedCards, progress, now],
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
              setFilterMode("due");
              setGeneration((g) => g + 1);
            }}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
              filterMode === "due"
                ? "bg-primary text-on-primary"
                : "text-text-dim hover:text-text"
            }`}
          >
            Fällig ({dueCards.length})
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
