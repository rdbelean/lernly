"use client";

import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  Play,
  Sparkles,
} from "lucide-react";
import { InlineRichText } from "@/components/trainer/BlockRenderer";
import {
  computeTopicBreakdown,
  formatPtsDe,
  round1,
} from "@/components/trainer/trainerHelpers";
import type {
  McpCourseTopic,
  TrainerBundle,
  TrainerProgressState,
} from "@/lib/trainer/types";

type Props = {
  bundle: TrainerBundle;
  sortedTopics: readonly McpCourseTopic[];
  progress: TrainerProgressState;
  hasCheatsheet: boolean;
  onStartNextTopic: (topicId: string) => void;
  onOpenTopicUnderstand: (topicId: string) => void;
  onOpenAppendix: () => void;
  onOpenExamSim: () => void;
};

export function StackedProgressBar({
  ok,
  learn,
  red,
  total,
  tall = false,
}: {
  ok: number;
  learn: number;
  red: number;
  total: number;
  tall?: boolean;
}) {
  const pct = (v: number) =>
    total > 0 ? `${Math.min(100, (v / total) * 100).toFixed(2)}%` : "0%";
  return (
    <div
      className={`flex w-full overflow-hidden rounded-full bg-surface-2 ${
        tall ? "h-4" : "h-2.5"
      }`}
    >
      <div className="h-full bg-ok-ink transition-all" style={{ width: pct(ok) }} />
      <div
        className="h-full bg-urgent-ink transition-all"
        style={{ width: pct(learn) }}
      />
      <div
        className="h-full bg-err-ink transition-all"
        style={{ width: pct(red) }}
      />
    </div>
  );
}

export function TrainerOverviewTab({
  bundle,
  sortedTopics,
  progress,
  hasCheatsheet,
  onStartNextTopic,
  onOpenTopicUnderstand,
  onOpenAppendix,
  onOpenExamSim,
}: Props) {
  const breakdowns = sortedTopics.map((meta) => ({
    meta,
    hydrated: Boolean(bundle.topics[meta.id]),
    bd: computeTopicBreakdown(meta, bundle.topics[meta.id], progress),
  }));

  // Aggregate exam points across tier-1 topics if course totalPoints is set,
  // or sum all topics when no fixed exam cap exists.
  const examTotal =
    bundle.course.exam?.totalPoints ??
    breakdowns.reduce((s, item) => s + item.bd.total, 0);

  const primaryPool = breakdowns.some((b) => (b.meta.tier ?? 2) === 1) &&
    bundle.course.exam?.totalPoints
    ? breakdowns.filter((b) => (b.meta.tier ?? 2) === 1)
    : breakdowns;

  const poolTotals = primaryPool.reduce(
    (acc, item) => ({
      ok: acc.ok + item.bd.ok,
      learn: acc.learn + item.bd.learn,
      red: acc.red + item.bd.red,
      new: acc.new + item.bd.new,
      total: acc.total + item.bd.total,
    }),
    { ok: 0, learn: 0, red: 0, new: 0, total: 0 },
  );

  const displayTotal = poolTotals.total > 0 ? poolTotals.total : examTotal;
  const totalTasks = breakdowns.reduce((s, i) => s + i.bd.totalTasks, 0);
  const okTasks = breakdowns.reduce((s, i) => s + i.bd.okTasks, 0);

  const nextTopicItem =
    breakdowns.find((b) => b.hydrated && b.bd.openTasks > 0) ??
    breakdowns.find((b) => b.hydrated);

  const latestMocks = [...progress.mockHistory].reverse().slice(0, 4);

  return (
    <div className="space-y-7">
      {/* Hero Progress Summary */}
      <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-text-dim">
              Aktueller Lernstand
            </p>
            <div className="mt-1 flex items-baseline gap-2.5">
              <span className="font-display text-[44px] font-bold leading-none tracking-[-0.03em] text-ok-ink tabular-nums sm:text-[52px]">
                {formatPtsDe(poolTotals.ok)}
              </span>
              <span className="font-display text-[20px] font-semibold text-text-dim tabular-nums">
                / {formatPtsDe(displayTotal)} Punkte gesichert
              </span>
            </div>
            <p className="mt-2 text-[14px] text-text-dim tabular-nums">
              {okTasks} von {totalTasks} Aufgaben beherrscht
              {bundle.course.exam?.date ? (
                <span className="ml-3 inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Klausur: {bundle.course.exam.date}</span>
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hasCheatsheet ? (
              <button
                type="button"
                onClick={onOpenAppendix}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 text-[14px] font-semibold text-text transition hover:opacity-85"
              >
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                <span>Formelsammlung / Appendix</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={onOpenExamSim}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-[14px] font-semibold text-text transition hover:bg-surface-2"
            >
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
              <span>Probeklausur</span>
            </button>

            {nextTopicItem ? (
              <button
                type="button"
                onClick={() => onStartNextTopic(nextTopicItem.meta.id)}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-[14.5px] font-semibold text-on-primary transition hover:bg-primary-press"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                <span>Jetzt weiterlernen</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <StackedProgressBar
            ok={poolTotals.ok}
            learn={poolTotals.learn}
            red={poolTotals.red}
            total={displayTotal}
            tall
          />
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] font-medium tabular-nums">
            <span className="inline-flex items-center gap-1.5 text-ok-ink">
              <span className="h-2.5 w-2.5 rounded-sm bg-ok-ink" />
              Beherrscht: {formatPtsDe(poolTotals.ok)} P
            </span>
            <span className="inline-flex items-center gap-1.5 text-urgent-ink">
              <span className="h-2.5 w-2.5 rounded-sm bg-urgent-ink" />
              In Arbeit: {formatPtsDe(poolTotals.learn)} P
            </span>
            <span className="inline-flex items-center gap-1.5 text-err-ink">
              <span className="h-2.5 w-2.5 rounded-sm bg-err-ink" />
              Nochmal: {formatPtsDe(poolTotals.red)} P
            </span>
            <span className="inline-flex items-center gap-1.5 text-text-dim">
              <span className="h-2.5 w-2.5 rounded-sm bg-surface-2" />
              Offen: {formatPtsDe(round1(poolTotals.new))} P
            </span>
          </div>
        </div>

        {bundle.course.strategy ? (
          <div className="mt-6 rounded-xl border border-line bg-bg px-4 py-3 text-[14.5px] leading-relaxed text-text">
            <span className="mr-2 font-bold uppercase tracking-[0.05em] text-primary">
              Klausurstrategie:
            </span>
            <InlineRichText md={bundle.course.strategy} />
          </div>
        ) : null}
      </section>

      {/* Recent Mock Simulation Results */}
      {latestMocks.length > 0 ? (
        <section className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-text-dim">
            Letzte Probeklausuren
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {latestMocks.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-line bg-bg px-4 py-2.5 text-[14px] tabular-nums"
              >
                <span className="font-semibold text-text">{entry.mockName}</span>
                <span className="mx-2 text-text-faint">·</span>
                <span className="font-bold text-primary">
                  {formatPtsDe(entry.score)} / {formatPtsDe(entry.total)} P
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Topic Grid sorted by points / priority */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-display text-[20px] font-bold tracking-[-0.02em] text-text">
            Themen nach Klausurpunkten ({sortedTopics.length})
          </h2>
          <p className="text-[13px] text-text-dim">
            Empfohlene Reihenfolge: sichere Rechenpunkte zuerst
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {breakdowns.map(({ meta, hydrated, bd }) => {
            const isNext = nextTopicItem?.meta.id === meta.id;
            const allDone = hydrated && bd.totalTasks > 0 && bd.openTasks === 0;
            const stripe = allDone
              ? "border-l-4 border-l-ok-ink"
              : bd.red > 0
                ? "border-l-4 border-l-err-ink"
                : bd.learn > 0 || bd.ok > 0
                  ? "border-l-4 border-l-urgent-ink"
                  : "";

            return (
              <article
                key={meta.id}
                className={`flex flex-col justify-between rounded-2xl border bg-surface p-5 transition ${stripe} ${
                  isNext
                    ? "border-primary ring-2 ring-primary/15"
                    : "border-line"
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] ${
                        meta.tier === 1
                          ? "bg-urgent-bg text-urgent-ink"
                          : meta.tier === 2
                            ? "bg-work-bg text-work-ink"
                            : "bg-surface-2 text-text-dim"
                      }`}
                    >
                      Stufe {meta.tier ?? 2}
                    </span>
                    <div className="flex items-center gap-2">
                      {isNext ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-on-primary">
                          <Sparkles className="h-3 w-3" aria-hidden="true" />
                          <span>Nächster Schritt</span>
                        </span>
                      ) : null}
                      {bd.total > 0 ? (
                        <span className="text-[14px] font-bold tabular-nums text-text">
                          {formatPtsDe(bd.total)} {bd.unit}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <h3 className="mt-3 font-display text-[17px] font-bold leading-snug text-text">
                    {meta.title}
                  </h3>

                  {meta.why ? (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-text-dim">
                      {meta.why}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 pt-2">
                  <StackedProgressBar
                    ok={bd.ok}
                    learn={bd.learn}
                    red={bd.red}
                    total={bd.total}
                  />

                  <div className="mt-2.5 flex items-center justify-between text-[12.5px] font-medium tabular-nums">
                    <span className="text-text-dim">
                      {formatPtsDe(bd.ok)} / {formatPtsDe(bd.total)} {bd.unit}
                    </span>
                    {allDone ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-ok-ink">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Alles sicher</span>
                      </span>
                    ) : hydrated ? (
                      <span className="font-semibold text-urgent-ink">
                        {bd.openTasks} offen
                      </span>
                    ) : (
                      <span className="text-text-faint">Kein Inhalt geladen</span>
                    )}
                  </div>

                  {hydrated ? (
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenTopicUnderstand(meta.id)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[13px] font-semibold text-text transition hover:opacity-85"
                      >
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Verstehen</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onStartNextTopic(meta.id)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[13px] font-semibold text-on-primary transition hover:bg-primary-press"
                      >
                        <span>Üben</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
