"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { FlashcardVisual } from "@/components/study/FlashcardVisual";
import { CORPORATE_FINANCE_FLASHCARDS } from "@/lib/study/seed";
import {
  formatIntervalLabel,
  previewStudyIntervals,
  scheduleStudyCard,
} from "@/lib/study/srs";
import { STATUS_BG_SOFT, STATUS_TEXT_INK } from "@/lib/study/status";
import {
  getServerStudyProgressSnapshot,
  readStudyProgress,
  saveCardReview,
  subscribeStudyProgress,
} from "@/lib/study/storage";
import type { RatingQuality, StudyFlashcard } from "@/lib/study/types";

type FlashcardSessionProps = {
  cards?: readonly StudyFlashcard[];
  initialIndex?: number;
  initialRevealed?: boolean;
  displayPositionOffset?: number;
  displayTotal?: number;
  interactive?: boolean;
  closeHref?: string;
};

function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-bold text-text">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function formatPointsDecimal(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

export function FlashcardSession({
  cards = CORPORATE_FINANCE_FLASHCARDS,
  initialIndex = 0,
  initialRevealed = false,
  displayPositionOffset = 0,
  displayTotal,
  interactive = true,
  closeHref = "/heute",
}: FlashcardSessionProps) {
  const router = useRouter();
  const [index, setIndex] = useState(initialIndex);
  const [revealed, setRevealed] = useState(initialRevealed);
  const [completedCount, setCompletedCount] = useState(0);

  const progress = useSyncExternalStore(
    subscribeStudyProgress,
    readStudyProgress,
    getServerStudyProgressSnapshot,
  );

  const totalCards = displayTotal ?? cards.length;
  const isFinished = index >= cards.length;
  const currentCard = isFinished ? undefined : cards[index];
  const displayCardNumber = Math.min(
    index + 1 + displayPositionOffset,
    totalCards,
  );
  const progressPct =
    totalCards > 0 ? Math.min(100, (displayCardNumber / totalCards) * 100) : 0;

  const existingReview = currentCard
    ? progress.cardReviews[currentCard.id]
    : undefined;
  const intervals = previewStudyIntervals(existingReview);

  const handleRate = useCallback(
    (rating: RatingQuality) => {
      if (!currentCard || !revealed) return;
      const nextReview = scheduleStudyCard(existingReview, rating);
      if (interactive) {
        saveCardReview(currentCard.id, nextReview);
      }
      setCompletedCount((count) => count + 1);
      setIndex((current) => current + 1);
      setRevealed(false);
    },
    [currentCard, existingReview, interactive, revealed],
  );

  const handleReveal = useCallback(() => {
    setRevealed(true);
  }, []);

  const handleRestart = useCallback(() => {
    setIndex(0);
    setRevealed(false);
    setCompletedCount(0);
  }, []);

  useEffect(() => {
    if (!interactive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        router.push(closeHref);
        return;
      }

      if (isFinished) return;

      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        if (!revealed) {
          handleReveal();
        }
        return;
      }

      if (revealed && (event.key === "1" || event.key === "2" || event.key === "3")) {
        event.preventDefault();
        handleRate(Number(event.key) as RatingQuality);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeHref, handleRate, handleReveal, interactive, isFinished, revealed, router]);

  if (isFinished || !currentCard) {
    return (
      <section className="mx-auto flex w-full max-w-[780px] flex-col items-start px-8 py-14 sm:px-12">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-card bg-ok-bg text-ok-ink">
          <Check className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="mt-6 font-display text-[40px] font-bold leading-[1.08] tracking-[-0.03em] text-text sm:text-[48px]">
          Alle Karten durch
          <span
            aria-hidden="true"
            className="ml-1 inline-block h-[0.16em] w-[0.16em] bg-primary align-baseline"
          />
        </h1>
        <p className="mt-4 text-[16px] text-text-dim">
          Du hast {completedCount} Karten bewertet. Deine nächsten Intervalle sind
          gespeichert.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={closeHref}
            className="inline-flex h-[46px] items-center gap-2 rounded-btn bg-primary px-6 text-[14px] font-semibold text-on-primary transition-colors hover:bg-primary-press"
          >
            <span>Zurück zu Heute</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/rechnen"
            className="inline-flex h-[46px] items-center gap-2 rounded-btn bg-text px-6 text-[14px] font-semibold text-on-primary transition-opacity hover:opacity-90"
          >
            <span>Weiter zu Rechenaufgaben</span>
          </Link>
          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex h-[46px] items-center gap-2 rounded-btn border border-line bg-surface px-5 text-[14px] font-semibold text-text transition-colors hover:bg-surface-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Nochmal</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[920px] px-6 py-7 sm:px-10 sm:py-10">
      {/* Top progress bar */}
      <header className="flex items-center gap-5">
        {interactive ? (
          <Link
            href={closeHref}
            aria-label="Sitzung schließen"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card border border-line bg-surface text-text transition-colors hover:bg-surface-2"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <span
            aria-hidden="true"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card border border-line bg-surface text-text"
          >
            <X className="h-4 w-4" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-4 text-[13px]">
            <span className="font-bold text-text">
              Karte {displayCardNumber} von {totalCards}
            </span>
            <span className="font-semibold text-text-dim">
              ≈ {formatPointsDecimal(currentCard.pointValue)} P
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={displayCardNumber}
            aria-valuemin={1}
            aria-valuemax={totalCards}
            className="mt-2 h-[5px] w-full overflow-hidden rounded-full bg-work-bg"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Flashcard surface (12px radius) */}
      <article className="mt-6 flex min-h-[470px] flex-col rounded-card border border-line bg-surface p-7 sm:min-h-[520px] sm:p-11 lg:min-h-[470px]">
        <div
          className={
            revealed && currentCard.visual
              ? "grid flex-1 grid-cols-1 gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-11"
              : "flex flex-1 flex-col"
          }
        >
          <div className="flex flex-col justify-start self-start">
            <div className="flex items-center justify-between gap-4">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-bold ${STATUS_BG_SOFT[currentCard.topicStatus]} ${STATUS_TEXT_INK[currentCard.topicStatus]}`}
              >
                {currentCard.topicLabel}
              </span>
              <span className="text-[12px] font-medium text-text-dim">
                Frage
              </span>
            </div>

            <h1 className="mt-5 font-display text-[32px] font-bold leading-[1.12] tracking-[-0.03em] text-text sm:text-[38px]">
              {currentCard.question}
            </h1>

            {revealed ? (
              <div className="mt-6 border-t border-line pt-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
                  Antwort
                </p>
                <p className="mt-3 text-[17px] leading-[1.55] text-text sm:text-[18px]">
                  {renderFormattedText(currentCard.answer)}
                </p>
              </div>
            ) : (
              <div className="mt-10 pt-2">
                <button
                  type="button"
                  onClick={handleReveal}
                  className="inline-flex h-[46px] items-center justify-center rounded-btn bg-primary px-6 text-[14px] font-semibold text-on-primary transition-colors hover:bg-primary-press active:bg-primary-press"
                >
                  Antwort zeigen
                </button>
              </div>
            )}
          </div>

          {revealed && currentCard.visual ? (
            <div className="flex items-center justify-center lg:pt-8">
              <FlashcardVisual visual={currentCard.visual} />
            </div>
          ) : null}
        </div>
      </article>

      {/* 3-Step Rating Boxes (12px radius) */}
      <div className="mt-6 grid grid-cols-3 gap-3.5">
        <button
          type="button"
          disabled={!revealed}
          onClick={() => handleRate(1)}
          className="relative flex flex-col items-center justify-center rounded-card bg-err-bg px-4 py-5 text-err-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <span className="absolute left-3.5 top-3.5 inline-flex h-6 w-6 items-center justify-center rounded-[6px] bg-surface text-[12px] font-bold text-err-ink">
            1
          </span>
          <span className="font-display text-[17px] font-bold sm:text-[18px]">
            Schwer
          </span>
          <span className="mt-1 text-[13px] font-medium">
            {formatIntervalLabel(intervals[1])}
          </span>
        </button>

        <button
          type="button"
          disabled={!revealed}
          onClick={() => handleRate(2)}
          className="relative flex flex-col items-center justify-center rounded-card bg-urgent-bg px-4 py-5 text-urgent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <span className="absolute left-3.5 top-3.5 inline-flex h-6 w-6 items-center justify-center rounded-[6px] bg-surface text-[12px] font-bold text-urgent-ink">
            2
          </span>
          <span className="font-display text-[17px] font-bold sm:text-[18px]">
            Mittel
          </span>
          <span className="mt-1 text-[13px] font-medium">
            {formatIntervalLabel(intervals[2])}
          </span>
        </button>

        <button
          type="button"
          disabled={!revealed}
          onClick={() => handleRate(3)}
          className="relative flex flex-col items-center justify-center rounded-card bg-ok-bg px-4 py-5 text-ok-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <span className="absolute left-3.5 top-3.5 inline-flex h-6 w-6 items-center justify-center rounded-[6px] bg-surface text-[12px] font-bold text-ok-ink">
            3
          </span>
          <span className="font-display text-[17px] font-bold sm:text-[18px]">
            Leicht
          </span>
          <span className="mt-1 text-[13px] font-medium">
            {formatIntervalLabel(intervals[3])}
          </span>
        </button>
      </div>

      <p className="mt-4 text-center text-[13px] text-text-dim">
        Bewerte mit <strong className="font-bold text-text">1</strong>,{" "}
        <strong className="font-bold text-text">2</strong> oder{" "}
        <strong className="font-bold text-text">3</strong> · Leertaste zeigt die
        Antwort
      </p>
    </div>
  );
}
