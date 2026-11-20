"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Eye,
  FileText,
  Lightbulb,
  Pencil,
  RotateCcw,
  Square,
} from "lucide-react";
import {
  BlockRenderer,
  InlineRichText,
} from "@/components/trainer/BlockRenderer";
import { DrillTaskCard } from "@/components/trainer/DrillTaskCard";
import { McTaskCard } from "@/components/trainer/EssayAndMcTaskCard";
import {
  type CourseTaskEntry,
  formatPtsDe,
  getTaskStatus,
  ratingToStatus,
  type TopicStatusKey,
} from "@/components/trainer/trainerHelpers";
import { formatTrainerRichHtml } from "@/lib/trainer/importer";
import {
  rateTrainerTask,
  toggleTrainerChecklistItem,
} from "@/lib/trainer/store";
import type {
  McpCourseTopic,
  TrainerProgressState,
  TrainerRating,
} from "@/lib/trainer/types";

type StatusMeta = {
  label: string;
  className: string;
};

const STATUS_BADGE: Record<TopicStatusKey, StatusMeta> = {
  new: { label: "Neu", className: "bg-surface-2 text-text-dim" },
  red: { label: "Nochmal", className: "bg-err-bg text-err-ink" },
  learn: { label: "In Arbeit", className: "bg-urgent-bg text-urgent-ink" },
  ok: { label: "Beherrscht", className: "bg-ok-bg text-ok-ink" },
};

const RATING_BUTTONS: {
  rating: TrainerRating;
  keyLabel: string;
  label: string;
  sub: string;
  style: string;
}[] = [
  {
    rating: 0,
    keyLabel: "1",
    label: "Nochmal",
    sub: "Kommt gleich wieder",
    style: "border-err-ink text-err-ink hover:bg-err-bg",
  },
  {
    rating: 1,
    keyLabel: "2",
    label: "Schwer",
    sub: "Später wiederholen",
    style: "border-urgent-ink text-urgent-ink hover:bg-urgent-bg",
  },
  {
    rating: 2,
    keyLabel: "3",
    label: "Gut",
    sub: "Kann ich sicher",
    style: "border-ok-ink text-ok-ink hover:bg-ok-bg",
  },
  {
    rating: 3,
    keyLabel: "4",
    label: "Leicht",
    sub: "Sitzt sofort",
    style: "border-primary text-primary hover:bg-work-bg",
  },
];

function PracticeSessionRunner({
  entries,
  filterMode,
  entryById,
  progress,
  scopeTitle,
  nextOpenTopic,
  onRestartAll,
  onJumpToTopic,
  onOpenOverview,
}: {
  entries: readonly CourseTaskEntry[];
  filterMode: "open" | "all";
  entryById: Map<string, CourseTaskEntry>;
  progress: TrainerProgressState;
  scopeTitle: string;
  nextOpenTopic: { id: string; title: string } | null;
  onRestartAll: () => void;
  onJumpToTopic: (topicId: string) => void;
  onOpenOverview: () => void;
}) {
  const [queue, setQueue] = useState<string[]>(() => {
    const rank = (s: TopicStatusKey) =>
      s === "red" ? 0 : s === "learn" ? 1 : 2;
    const open = entries
      .filter((e) => getTaskStatus(progress, e.task.id) !== "ok")
      .sort(
        (a, b) =>
          rank(getTaskStatus(progress, a.task.id)) -
          rank(getTaskStatus(progress, b.task.id)),
      );
    const active = filterMode === "open" && open.length > 0 ? open : entries;
    return active.map((e) => e.task.id);
  });
  const [initialLength] = useState<number>(() => queue.length);
  const [doneCount, setDoneCount] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [counts, setCounts] = useState<[number, number, number, number]>([
    0, 0, 0, 0,
  ]);

  const currentId = queue[0];
  const currentEntry = currentId ? entryById.get(currentId) : undefined;
  const totalSlots = Math.max(1, doneCount + queue.length);
  const pctDone = Math.round((doneCount / totalSlots) * 100);

  const handleRate = useCallback(
    (rating: TrainerRating) => {
      if (!currentId) return;
      rateTrainerTask(currentId, rating);
      setCounts((prev) => {
        const next: [number, number, number, number] = [...prev];
        next[rating] += 1;
        return next;
      });

      setQueue((prev) => {
        const rest = prev.slice(1);
        if (rating < 2) {
          const offset = rating === 0 ? 2 : 4;
          const nextQ = [...rest];
          nextQ.splice(Math.min(nextQ.length, offset), 0, currentId);
          return nextQ;
        }
        return rest;
      });

      if (rating >= 2) {
        setDoneCount((d) => d + 1);
      }
      setRevealed(false);
    },
    [currentId],
  );

  const handleJumpDot = (targetId: string) => {
    setQueue((prev) => [targetId, ...prev.filter((id) => id !== targetId)]);
    setRevealed(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!currentEntry || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === " " && !revealed) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        handleRate((Number(e.key) - 1) as TrainerRating);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentEntry, revealed, handleRate]);

  if (initialLength === 0 || !currentEntry) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok-bg text-ok-ink">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 font-display text-[24px] font-semibold text-text">
          {scopeTitle}: Runde abgeschlossen
        </h2>
        <p className="mt-2 text-[15px] text-text-dim tabular-nums">
          {counts[2] + counts[3]} beherrscht · {counts[1]} schwer · {counts[0]} nochmal
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {nextOpenTopic ? (
            <button
              type="button"
              onClick={() => onJumpToTopic(nextOpenTopic.id)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-[14.5px] font-semibold text-on-primary transition hover:bg-primary-press"
            >
              <span>Nächstes Thema: {nextOpenTopic.title}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={onRestartAll}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 text-[14px] font-semibold text-text transition hover:opacity-85"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Alle Aufgaben nochmal üben</span>
          </button>

          <button
            type="button"
            onClick={onOpenOverview}
            className="inline-flex h-11 items-center rounded-xl border border-line bg-surface px-4 text-[14px] font-semibold text-text transition hover:bg-surface-2"
          >
            Zur Übersicht
          </button>
        </div>
      </section>
    );
  }

  const { task } = currentEntry;
  const caseHtml = task.caseHtml ?? currentEntry.topicCaseHtml;
  const caseTitle = task.caseTitle ?? currentEntry.topicCaseTitle ?? currentEntry.topicTitle;
  const taskStatus = getTaskStatus(progress, task.id);
  const badge = STATUS_BADGE[taskStatus];

  return (
    <div className="space-y-5">
      {/* Progress bar + clickable dots */}
      <div className="rounded-2xl border border-line bg-surface px-5 py-3.5">
        <div className="flex items-center justify-between gap-3 text-[13px] font-medium text-text-dim tabular-nums">
          <span>Fortschritt in dieser Runde</span>
          <span>
            {queue.length} verbleibend · {pctDone} %
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-ok-ink transition-all"
            style={{ width: `${pctDone}%` }}
          />
        </div>
        {queue.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Array.from(new Set(queue))
              .slice(0, 36)
              .map((qId) => {
                const st = ratingToStatus(
                  progress.taskRatings[qId] ??
                    (progress.solvedDrills[qId] ? 2 : null),
                );
                const dotClass =
                  st === "ok"
                    ? "bg-ok-ink"
                    : st === "learn"
                      ? "bg-urgent-ink"
                      : st === "red"
                        ? "bg-err-ink"
                        : "bg-surface-2 border border-line";
                const isCur = qId === currentId;
                return (
                  <button
                    key={qId}
                    type="button"
                    onClick={() => handleJumpDot(qId)}
                    title={entryById.get(qId)?.task.name ?? qId}
                    aria-label={`Zu Aufgabe ${qId} springen`}
                    className={`h-3 w-3 rounded-full transition ${dotClass} ${
                      isCur ? "scale-125 ring-2 ring-primary ring-offset-1" : ""
                    }`}
                  />
                );
              })}
          </div>
        ) : null}
      </div>

      {/* Sticky Collapsible Case Facts */}
      {caseHtml ? (
        <details
          open
          className="group sticky top-3 z-20 rounded-2xl border-2 border-urgent-ink bg-surface shadow-sm"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-[14px] font-semibold text-urgent-ink">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Sachverhalt · {caseTitle}</span>
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div
            className="trainer-rich-html max-h-[34vh] overflow-y-auto border-t border-line px-5 py-3 text-[15px]"
            dangerouslySetInnerHTML={{
              __html: formatTrainerRichHtml(caseHtml),
            }}
          />
        </details>
      ) : null}

      {/* Main Active Task Card */}
      <article className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-urgent-bg px-2.5 py-0.5 text-[11.5px] font-semibold text-urgent-ink">
              {task.originLabel ?? currentEntry.topicTitle}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
          <span className="text-[12.5px] font-medium text-text-dim">
            {currentEntry.topicTitle}
          </span>
        </div>

        {/* Drill or MC or Essay Question */}
        {task.kind === "drill" ? (
          <div className="mt-4">
            <DrillTaskCard
              key={task.id}
              task={task}
              solved={Boolean(progress.solvedDrills[task.id])}
            />
            {!revealed ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 text-[13.5px] font-semibold text-text transition hover:opacity-85"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  <span>Rechen-Feedback &amp; Bewertung öffnen</span>
                </button>
              </div>
            ) : null}
          </div>
        ) : task.kind === "mc" ? (
          <div className="mt-4">
            <McTaskCard key={task.id} task={task} />
            {!revealed ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 text-[13.5px] font-semibold text-text transition hover:opacity-85"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  <span>Aufgabe abschließen &amp; bewerten</span>
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <h2 className="mt-4 font-display text-[21px] font-semibold leading-snug text-text sm:text-[23px]">
              <InlineRichText md={task.question} />
            </h2>

            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-dashed border-urgent-ink bg-urgent-bg/40 px-4 py-3 text-[14.5px] text-text">
              <Pencil
                className="mt-0.5 h-4 w-4 shrink-0 text-urgent-ink"
                aria-hidden="true"
              />
              <span>
                <strong>Erst auf Papier oder im Kopf lösen.</strong> Danach die
                Musterlösung aufdecken und ehrlich bewerten.
              </span>
            </div>

            {task.hint && !revealed ? (
              <details className="mt-4 rounded-xl border border-primary/40 bg-work-bg/40 px-4 py-3 text-[14.5px]">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-work-ink">
                  <Lightbulb className="h-4 w-4" aria-hidden="true" />
                  <span>Hinweis anzeigen</span>
                </summary>
                <p className="mt-2 text-text">
                  <InlineRichText md={task.hint} />
                </p>
              </details>
            ) : null}

            {!revealed ? (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-[15px] font-semibold text-on-primary transition hover:bg-primary-press"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  <span>Lösung aufdecken</span>
                </button>
                <span className="text-[12.5px] text-text-faint">
                  Taste: Leertaste
                </span>
              </div>
            ) : null}
          </>
        )}

        {/* Revealed Solution + Didactic Breakdown + 4-Step Self-Rating */}
        {revealed ? (
          <div className="mt-6 space-y-5 border-t border-line pt-6">
            {task.kind === "essay" &&
            task.modelAnswer &&
            task.modelAnswer.length > 0 ? (
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-text-dim">
                  Musterlösung &amp; Rechenschritte
                </p>
                <BlockRenderer blocks={task.modelAnswer} />
              </div>
            ) : null}

            {task.whyHtml ? (
              <div
                className="trainer-rich-html"
                dangerouslySetInnerHTML={{
                  __html: formatTrainerRichHtml(task.whyHtml),
                }}
              />
            ) : null}

            {task.fullAnswerHtml ? (
              <details className="rounded-xl border border-line bg-bg px-4 py-3">
                <summary className="cursor-pointer text-[14px] font-semibold text-primary">
                  Ausführliche Herleitung / Textversion
                </summary>
                <div
                  className="trainer-rich-html mt-3 border-t border-line pt-3"
                  dangerouslySetInnerHTML={{
                    __html: formatTrainerRichHtml(task.fullAnswerHtml),
                  }}
                />
              </details>
            ) : null}

            {task.kind === "essay" && task.checklist.length > 0 ? (
              <div className="rounded-xl border border-line bg-bg p-4">
                <p className="mb-2.5 flex items-center justify-between text-[12px] font-semibold uppercase tracking-[0.06em] text-text-dim">
                  <span>Punkte-Checkliste ({task.points} P)</span>
                  <span className="tabular-nums text-primary">
                    {formatPtsDe(
                      task.checklist.reduce(
                        (sum, item, idx) =>
                          (progress.checkedChecklist[task.id] ?? []).includes(
                            idx,
                          )
                            ? sum + item.points
                            : sum,
                        0,
                      ),
                    )}{" "}
                    / {formatPtsDe(task.points)} P
                  </span>
                </p>
                <ul className="space-y-1.5">
                  {task.checklist.map((item, idx) => {
                    const checked = (
                      progress.checkedChecklist[task.id] ?? []
                    ).includes(idx);
                    return (
                      <li key={idx}>
                        <button
                          type="button"
                          onClick={() => toggleTrainerChecklistItem(task.id, idx)}
                          className={`flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left text-[13.5px] transition ${
                            checked
                              ? "border-ok-ink bg-ok-bg/45 text-text"
                              : "border-line bg-surface text-text hover:bg-surface-2"
                          }`}
                        >
                          <span className="flex items-start gap-2">
                            {checked ? (
                              <CheckSquare
                                className="mt-0.5 h-4 w-4 shrink-0 text-ok-ink"
                                aria-hidden="true"
                              />
                            ) : (
                              <Square
                                className="mt-0.5 h-4 w-4 shrink-0 text-text-dim"
                                aria-hidden="true"
                              />
                            )}
                            <InlineRichText md={item.text} />
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums text-urgent-ink">
                            +{formatPtsDe(item.points)} P
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {task.merke ? (
              <div className="rounded-r-xl border-l-4 border-ok-ink bg-ok-bg px-4 py-3 text-[15px] text-text">
                <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-ok-ink">
                  <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Merke</span>
                </p>
                <InlineRichText md={task.merke} />
              </div>
            ) : null}

            {task.trap ? (
              <div className="rounded-r-xl border-l-4 border-err-ink bg-err-bg px-4 py-3 text-[14.5px] text-text">
                <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-err-ink">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Typische Klausurfalle</span>
                </p>
                <InlineRichText md={task.trap} />
              </div>
            ) : null}

            {/* 4-Step Self-Rating Bar */}
            <div className="border-t border-line pt-5">
              <p className="mb-3 text-[13px] font-semibold text-text-dim">
                Wie sicher sitzt diese Aufgabe? (Tasten 1–4)
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {RATING_BUTTONS.map((btn) => (
                  <button
                    key={btn.rating}
                    type="button"
                    onClick={() => handleRate(btn.rating)}
                    className={`rounded-xl border-2 bg-surface px-3 py-2.5 text-center transition ${btn.style}`}
                  >
                    <span className="block font-display text-[15px] font-semibold">
                      {btn.keyLabel} · {btn.label}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] font-medium opacity-85">
                      {btn.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </article>
    </div>
  );
}

export function TrainerPracticeTab({
  sortedTopics,
  allTasks,
  selectedTopicId,
  progress,
  onSelectTopic,
  onOpenOverview,
}: {
  sortedTopics: readonly McpCourseTopic[];
  allTasks: readonly CourseTaskEntry[];
  selectedTopicId: string;
  progress: TrainerProgressState;
  onSelectTopic: (topicId: string) => void;
  onOpenOverview: () => void;
}) {
  const [scope, setScope] = useState<"topic" | "all">("topic");
  const [filterMode, setFilterMode] = useState<"open" | "all">("open");
  const [generation, setGeneration] = useState(0);

  const scopedTasks = useMemo(
    () =>
      scope === "all"
        ? allTasks
        : allTasks.filter((entry) => entry.topicId === selectedTopicId),
    [allTasks, scope, selectedTopicId],
  );

  const openTasks = useMemo(
    () =>
      scopedTasks
        .filter((entry) => getTaskStatus(progress, entry.task.id) !== "ok")
        .sort((a, b) => {
          const rank = (s: TopicStatusKey) =>
            s === "red" ? 0 : s === "learn" ? 1 : 2;
          return (
            rank(getTaskStatus(progress, a.task.id)) -
            rank(getTaskStatus(progress, b.task.id))
          );
        }),
    [scopedTasks, progress],
  );

  const entryById = useMemo(
    () => new Map(allTasks.map((entry) => [entry.task.id, entry])),
    [allTasks],
  );

  const currentTopicTitle =
    sortedTopics.find((t) => t.id === selectedTopicId)?.title ?? "Alle Themen";

  const nextOpenTopicMeta = useMemo(() => {
    const nextEntry = allTasks.find(
      (e) =>
        e.topicId !== selectedTopicId &&
        getTaskStatus(progress, e.task.id) !== "ok",
    );
    if (!nextEntry) return null;
    return { id: nextEntry.topicId, title: nextEntry.topicTitle };
  }, [allTasks, selectedTopicId, progress]);

  if (allTasks.length === 0) {
    return (
      <div className="mx-auto max-w-[860px] rounded-2xl border border-line bg-surface p-8 text-[15px] text-text-dim">
        In diesem Kurs sind noch keine Übungsaufgaben hinterlegt.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[860px] space-y-5">
      {/* Compact Scope + Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
          <select
            aria-label="Thema für Übungsrunde wählen"
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
            className="h-10 min-w-[220px] max-w-full flex-1 rounded-xl border border-line bg-bg px-3 text-[14px] font-semibold text-text outline-none focus:border-primary"
          >
            <option value="__ALL__">Alle Themen ({allTasks.length} Aufgaben)</option>
            {sortedTopics.map((t) => {
              const count = allTasks.filter((e) => e.topicId === t.id).length;
              if (count === 0) return null;
              return (
                <option key={t.id} value={t.id}>
                  {t.title} ({count})
                </option>
              );
            })}
          </select>
        </div>

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
            Offen ({openTasks.length})
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
            Alle ({scopedTasks.length})
          </button>
        </div>
      </div>

      <PracticeSessionRunner
        key={`${scope}-${selectedTopicId}-${filterMode}-${generation}`}
        entries={scopedTasks}
        filterMode={filterMode}
        entryById={entryById}
        progress={progress}
        scopeTitle={scope === "all" ? "Alle Themen" : currentTopicTitle}
        nextOpenTopic={nextOpenTopicMeta}
        onRestartAll={() => {
          setFilterMode("all");
          setGeneration((g) => g + 1);
        }}
        onJumpToTopic={(topicId) => {
          setScope("topic");
          setFilterMode("open");
          onSelectTopic(topicId);
          setGeneration((g) => g + 1);
        }}
        onOpenOverview={onOpenOverview}
      />
    </div>
  );
}
