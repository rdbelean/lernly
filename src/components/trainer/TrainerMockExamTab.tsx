"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import {
  BlockRenderer,
  InlineRichText,
} from "@/components/trainer/BlockRenderer";
import {
  formatPtsDe,
  round1,
} from "@/components/trainer/trainerHelpers";
import { formatTrainerRichHtml } from "@/lib/trainer/importer";
import {
  rateTrainerTask,
  recordTrainerMockResult,
} from "@/lib/trainer/store";
import type {
  McpMockExam,
  TrainerProgressState,
} from "@/lib/trainer/types";

type ExamPhase = "intro" | "run" | "grade";
type GradeChoice = 0 | 1 | 2; // 0 = 0 P, 1 = half, 2 = full

function formatCountdown(msLeft: number): string {
  const clamped = Math.max(0, msLeft);
  const mins = Math.floor(clamped / 60_000);
  const secs = Math.floor((clamped % 60_000) / 1000);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function TrainerMockExamTab({
  mocks,
  progress,
  onCompletedToOverview,
}: {
  mocks: readonly McpMockExam[];
  progress: TrainerProgressState;
  onCompletedToOverview: () => void;
}) {
  const [selectedMockId, setSelectedMockId] = useState<string>(
    () => mocks[0]?.id ?? "",
  );
  const [phase, setPhase] = useState<ExamPhase>("intro");
  const [endTimeMs, setEndTimeMs] = useState<number>(0);
  const [nowMs, setNowMs] = useState<number>(0);
  const [grades, setGrades] = useState<Record<string, GradeChoice>>({});

  useEffect(() => {
    if (phase !== "run") return;
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  if (mocks.length === 0) {
    return (
      <div className="mx-auto max-w-[900px] rounded-2xl border border-line bg-surface p-8 text-[15px] text-text-dim">
        Für diesen Kurs liegen noch keine Probeklausur-Aufgaben vor.
      </div>
    );
  }

  const activeMock = mocks.find((m) => m.id === selectedMockId) ?? mocks[0];
  const partsToRender =
    activeMock.parts && activeMock.parts.length > 0
      ? activeMock.parts
      : [
          {
            id: "all",
            title: activeMock.name,
            items: activeMock.items,
          },
        ];

  const allItems = partsToRender.flatMap((p) => p.items);
  const gradedCount = allItems.filter((it) => grades[it.id] !== undefined).length;
  const totalScore = round1(
    allItems.reduce((sum, it) => {
      const g = grades[it.id];
      if (g === undefined) return sum;
      return sum + it.points * (g === 2 ? 1 : g === 1 ? 0.5 : 0);
    }, 0),
  );

  const startExam = () => {
    const now = Date.now();
    setNowMs(now);
    setEndTimeMs(now + activeMock.durationMin * 60_000);
    setGrades({});
    setPhase("run");
  };

  const handleSaveScore = () => {
    recordTrainerMockResult({
      mockId: activeMock.id,
      mockName: activeMock.name,
      score: totalScore,
      total: activeMock.totalPoints,
    });

    for (const item of allItems) {
      const g = grades[item.id];
      if (g !== undefined && item.taskId) {
        rateTrainerTask(item.taskId, g === 2 ? 2 : g === 1 ? 1 : 0);
      }
    }

    setPhase("intro");
    setGrades({});
    onCompletedToOverview();
  };

  if (phase === "intro") {
    const historyForMock = [...progress.mockHistory]
      .filter((h) => h.mockId === activeMock.id)
      .reverse();

    return (
      <div className="mx-auto max-w-[900px] space-y-6">
        <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-text-dim">
            <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Klausursimulation unter Echtzeit-Bedingungen</span>
          </div>

          <h2 className="mt-2 font-display text-[26px] font-semibold tracking-[-0.02em] text-text">
            Probeklausur schreiben ({activeMock.durationMin} Min ·{" "}
            {formatPtsDe(activeMock.totalPoints)} P)
          </h2>

          <p className="mt-2 max-w-[65ch] text-[15px] leading-relaxed text-text-dim">
            Schreibe die Aufgaben komplett auf Papier durch (wie in der echten
            Klausur). Danach deckst du die Musterlösungen auf und bepunktest
            jede Teilaufgabe — schwache Aufgaben landen sofort in deiner
            Wiederholungs-Queue.
          </p>

          {/* Mock Selector */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mocks.map((mock) => {
              const selected = mock.id === activeMock.id;
              return (
                <button
                  key={mock.id}
                  type="button"
                  onClick={() => setSelectedMockId(mock.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-primary bg-work-bg/40 ring-2 ring-primary/15"
                      : "border-line bg-bg hover:bg-surface-2"
                  }`}
                >
                  <p className="font-display text-[16px] font-semibold text-text">
                    {mock.name}
                  </p>
                  {mock.subtitle ? (
                    <p className="mt-1 text-[13px] text-text-dim">
                      {mock.subtitle}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[12.5px] font-semibold tabular-nums text-primary">
                    {mock.durationMin} Min · {formatPtsDe(mock.totalPoints)} P
                  </p>
                </button>
              );
            })}
          </div>

          {historyForMock.length > 0 ? (
            <div className="mt-5 rounded-xl border border-line bg-bg px-4 py-3 text-[14px] text-text">
              <span className="font-semibold">Letztes Ergebnis: </span>
              <span className="font-semibold tabular-nums text-primary">
                {formatPtsDe(historyForMock[0].score)} /{" "}
                {formatPtsDe(historyForMock[0].total)} P
              </span>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={startExam}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-[14.5px] font-semibold text-on-primary transition hover:bg-primary-press"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              <span>{activeMock.name} starten ({activeMock.durationMin} Min)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setGrades({});
                setPhase("grade");
              }}
              className="inline-flex h-11 items-center rounded-xl border border-line bg-surface-2 px-4 text-[14px] font-semibold text-text transition hover:opacity-85"
            >
              Direkt zur Bepunktung
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (phase === "run") {
    const msLeft = endTimeMs - nowMs;
    return (
      <div className="mx-auto max-w-[900px] space-y-6">
        {/* Sticky Timer Bar */}
        <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-urgent-ink" aria-hidden="true" />
            <span className="font-display text-[26px] font-semibold tabular-nums text-urgent-ink">
              {formatCountdown(msLeft)}
            </span>
            <span className="text-[14px] text-text-dim">
              {activeMock.name} · auf Papier mitschreiben
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setPhase("intro")}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3.5 text-[13.5px] font-semibold text-text transition hover:opacity-85"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Abbrechen</span>
            </button>

            <button
              type="button"
              onClick={() => setPhase("grade")}
              className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-[14px] font-semibold text-on-primary transition hover:bg-primary-press"
            >
              Abgeben &amp; bepunkten
            </button>
          </div>
        </div>

        {/* All Exam Parts & Sub-Questions */}
        {partsToRender.map((part) => (
          <section
            key={part.id}
            className="rounded-2xl border border-line bg-surface p-6 sm:p-8"
          >
            <h3 className="font-display text-[20px] font-semibold text-text">
              {part.title}
            </h3>

            {part.caseHtml ? (
              <div
                className="trainer-rich-html mt-3 rounded-xl border border-line bg-bg px-4 py-3 text-[15px]"
                dangerouslySetInnerHTML={{
                  __html: formatTrainerRichHtml(part.caseHtml),
                }}
              />
            ) : null}

            <div className="mt-5 divide-y divide-line">
              {part.items.map((item) => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-[15.5px] leading-relaxed text-text">
                      <InlineRichText md={item.question} />
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-urgent-ink">
                      ({formatPtsDe(item.points)} P)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  /* Phase 3: Self-Grading with Model Answers */
  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-3.5 shadow-sm">
        <div>
          <span className="font-display text-[24px] font-semibold tabular-nums text-primary">
            {formatPtsDe(totalScore)} / {formatPtsDe(activeMock.totalPoints)} P
          </span>
          <span className="ml-3 text-[13.5px] text-text-dim tabular-nums">
            {activeMock.name} · {gradedCount} / {allItems.length} Teilaufgaben
            bewertet
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setPhase("intro")}
            className="inline-flex h-10 items-center rounded-xl border border-line bg-surface-2 px-3.5 text-[13.5px] font-semibold text-text transition hover:opacity-85"
          >
            Zurück
          </button>
          <button
            type="button"
            disabled={gradedCount === 0}
            onClick={handleSaveScore}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-[14px] font-semibold text-on-primary transition hover:bg-primary-press disabled:opacity-45"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Ergebnis speichern</span>
          </button>
        </div>
      </div>

      {partsToRender.map((part) => (
        <section
          key={part.id}
          className="rounded-2xl border border-line bg-surface p-6 sm:p-8"
        >
          <h3 className="font-display text-[20px] font-semibold text-text">
            {part.title}
          </h3>

          <div className="mt-4 divide-y divide-line">
            {part.items.map((item) => {
              const g = grades[item.id];
              return (
                <div key={item.id} className="py-5 first:pt-2 last:pb-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-[15.5px] font-medium text-text">
                      <InlineRichText md={item.question} />
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-urgent-ink">
                      ({formatPtsDe(item.points)} P)
                    </span>
                  </div>

                  {item.solution && item.solution.length > 0 ? (
                    <details className="mt-3 rounded-xl border border-line bg-bg px-4 py-2.5">
                      <summary className="cursor-pointer text-[13.5px] font-semibold text-primary">
                        Musterlösung anzeigen
                      </summary>
                      <div className="mt-3 space-y-4 border-t border-line pt-3">
                        <BlockRenderer blocks={item.solution} />
                        {item.whyHtml ? (
                          <div
                            className="trainer-rich-html"
                            dangerouslySetInnerHTML={{
                              __html: formatTrainerRichHtml(item.whyHtml),
                            }}
                          />
                        ) : null}
                      </div>
                    </details>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setGrades((prev) => ({ ...prev, [item.id]: 0 }))
                      }
                      className={`inline-flex items-center gap-1 rounded-lg border px-3.5 py-1.5 text-[13px] font-semibold transition ${
                        g === 0
                          ? "border-err-ink bg-err-ink text-on-primary"
                          : "border-line bg-surface text-err-ink hover:bg-err-bg"
                      }`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>0 P</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setGrades((prev) => ({ ...prev, [item.id]: 1 }))
                      }
                      className={`rounded-lg border px-3.5 py-1.5 text-[13px] font-semibold transition ${
                        g === 1
                          ? "border-urgent-ink bg-urgent-ink text-on-primary"
                          : "border-line bg-surface text-urgent-ink hover:bg-urgent-bg"
                      }`}
                    >
                      Teilpunkte ({formatPtsDe(item.points * 0.5)} P)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setGrades((prev) => ({ ...prev, [item.id]: 2 }))
                      }
                      className={`inline-flex items-center gap-1 rounded-lg border px-3.5 py-1.5 text-[13px] font-semibold transition ${
                        g === 2
                          ? "border-ok-ink bg-ok-ink text-on-primary"
                          : "border-line bg-surface text-ok-ink hover:bg-ok-bg"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Volle {formatPtsDe(item.points)} P</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
