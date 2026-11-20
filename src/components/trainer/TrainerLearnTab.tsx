"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Play,
} from "lucide-react";
import {
  BlockRenderer,
  InlineRichText,
  TopicMetaFooter,
} from "@/components/trainer/BlockRenderer";
import { formatTrainerRichHtml } from "@/lib/trainer/importer";
import { toggleTrainerTopicRead } from "@/lib/trainer/store";
import type {
  McpCheatsheet,
  McpCourseTopic,
  McpTopicContent,
} from "@/lib/trainer/types";

type Props = {
  sortedTopics: readonly McpCourseTopic[];
  topicsRecord: Record<string, McpTopicContent>;
  selectedTopicId: string;
  readTopics: Record<string, boolean>;
  cheatsheet?: McpCheatsheet;
  initialShowAppendix?: boolean;
  onSelectTopic: (topicId: string) => void;
  onPracticeTopic: (topicId: string) => void;
};

export function TrainerLearnTab({
  sortedTopics,
  topicsRecord,
  selectedTopicId,
  readTopics,
  cheatsheet,
  initialShowAppendix = false,
  onSelectTopic,
  onPracticeTopic,
}: Props) {
  const [viewMode, setViewMode] = useState<"topic" | "appendix">(
    initialShowAppendix && cheatsheet ? "appendix" : "topic",
  );

  const hydratedTopics = sortedTopics.filter((t) => Boolean(topicsRecord[t.id]));
  const currentIdx = Math.max(
    0,
    hydratedTopics.findIndex((t) => t.id === selectedTopicId),
  );
  const activeMeta = hydratedTopics[currentIdx] ?? sortedTopics[0];
  const activeContent = activeMeta ? topicsRecord[activeMeta.id] : undefined;
  const isRead = activeMeta ? Boolean(readTopics[activeMeta.id]) : false;

  const prevMeta = currentIdx > 0 ? hydratedTopics[currentIdx - 1] : null;
  const nextMeta =
    currentIdx < hydratedTopics.length - 1
      ? hydratedTopics[currentIdx + 1]
      : null;

  return (
    <div className="mx-auto max-w-[860px] space-y-6">
      {/* Topic Picker + Appendix Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
          <label className="sr-only" htmlFor="learn-topic-select">
            Thema wählen
          </label>
          <select
            id="learn-topic-select"
            value={activeMeta?.id ?? ""}
            onChange={(e) => {
              setViewMode("topic");
              onSelectTopic(e.target.value);
            }}
            className="h-10 min-w-[220px] max-w-full flex-1 rounded-xl border border-line bg-bg px-3 text-[14px] font-semibold text-text outline-none focus:border-primary"
          >
            {hydratedTopics.map((t, idx) => (
              <option key={t.id} value={t.id}>
                {idx + 1}. {t.title} (
                {t.expectedPoints ?? t.points ?? topicsRecord[t.id]?.tasks.length ?? 0}{" "}
                {t.expectedPoints ?? t.points ? "P" : "Aufg."})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!prevMeta}
              onClick={() => {
                if (prevMeta) {
                  setViewMode("topic");
                  onSelectTopic(prevMeta.id);
                }
              }}
              aria-label="Vorheriges Thema"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-text transition hover:opacity-85 disabled:opacity-35"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={!nextMeta}
              onClick={() => {
                if (nextMeta) {
                  setViewMode("topic");
                  onSelectTopic(nextMeta.id);
                }
              }}
              aria-label="Nächstes Thema"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-text transition hover:opacity-85 disabled:opacity-35"
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {cheatsheet ? (
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-bg p-1">
            <button
              type="button"
              onClick={() => setViewMode("topic")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                viewMode === "topic"
                  ? "bg-primary text-on-primary"
                  : "text-text-dim hover:text-text"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Erklärung</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("appendix")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                viewMode === "appendix"
                  ? "bg-primary text-on-primary"
                  : "text-text-dim hover:text-text"
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Formelsammlung / Appendix</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Mode A: Appendix / Cheatsheet */}
      {viewMode === "appendix" && cheatsheet ? (
        <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <h2 className="font-display text-[24px] font-bold tracking-[-0.02em] text-text">
            {cheatsheet.title ?? "Formelsammlung & Gesetzes-Kompass"}
          </h2>

          {cheatsheet.html ? (
            <div
              className="trainer-rich-html mt-4"
              dangerouslySetInnerHTML={{
                __html: formatTrainerRichHtml(cheatsheet.html),
              }}
            />
          ) : cheatsheet.sections ? (
            <div className="mt-5 space-y-6">
              {cheatsheet.sections.map((sec, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-line bg-bg p-5"
                >
                  <h3 className="mb-3 font-display text-[17px] font-bold text-primary">
                    {sec.title}
                  </h3>
                  <BlockRenderer blocks={sec.blocks} />
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : !activeMeta || !activeContent ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-[15px] text-text-dim">
          Für dieses Thema sind noch keine Erklärungen geladen.
        </div>
      ) : (
        /* Mode B: Calm Single-Column Study Reading View */
        <>
          {/* Sticky Collapsible Case Facts Panel (like Tax Mock Trainer) */}
          {activeContent.caseHtml ? (
            <details
              open
              className="group sticky top-3 z-20 rounded-2xl border-2 border-urgent-ink bg-surface shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-[14.5px] font-bold text-urgent-ink">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    Sachverhalt · {activeContent.caseTitle ?? activeMeta.title}
                  </span>
                </span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div
                className="trainer-rich-html max-h-[34vh] overflow-y-auto border-t border-line px-5 py-3 text-[15px]"
                dangerouslySetInnerHTML={{
                  __html: formatTrainerRichHtml(activeContent.caseHtml),
                }}
              />
            </details>
          ) : null}

          <article className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-work-bg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] text-work-ink">
                    Stufe {activeMeta.tier ?? 1}
                  </span>
                  {typeof (activeMeta.expectedPoints ?? activeMeta.points) ===
                  "number" ? (
                    <span className="rounded-full bg-urgent-bg px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-urgent-ink">
                      {activeMeta.expectedPoints ?? activeMeta.points} Punkte
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-2 font-display text-[24px] font-bold tracking-[-0.02em] text-text sm:text-[28px]">
                  {activeMeta.title}
                </h2>
                {activeMeta.why ? (
                  <p className="mt-1 text-[14px] text-text-dim">
                    <InlineRichText md={activeMeta.why} />
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => toggleTrainerTopicRead(activeMeta.id)}
                className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-semibold transition ${
                  isRead
                    ? "border-ok-ink bg-ok-bg text-ok-ink"
                    : "border-line bg-surface-2 text-text hover:opacity-85"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>{isRead ? "Gelesen" : "Als gelesen markieren"}</span>
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {activeContent.theory.length > 0 ? (
                <BlockRenderer blocks={activeContent.theory} />
              ) : null}

              {activeContent.standardAnswer &&
              activeContent.standardAnswer.length > 0 ? (
                <div className="pt-2">
                  <BlockRenderer blocks={activeContent.standardAnswer} />
                </div>
              ) : null}

              <TopicMetaFooter
                hook={activeContent.hook}
                mistakes={activeContent.mistakes}
                source={activeContent.source}
              />
            </div>

            {activeContent.tasks.length > 0 ? (
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
                <p className="text-[14px] text-text-dim">
                  Bereit für die Klausuraufgaben? ({activeContent.tasks.length}{" "}
                  Aufgaben in diesem Thema)
                </p>
                <button
                  type="button"
                  onClick={() => onPracticeTopic(activeMeta.id)}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-[14.5px] font-semibold text-on-primary transition hover:bg-primary-press"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  <span>Jetzt Aufgaben üben</span>
                </button>
              </div>
            ) : null}
          </article>
        </>
      )}
    </div>
  );
}
