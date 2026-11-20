"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import {
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FolderOpen,
  Layers,
  RotateCcw,
  Upload,
} from "lucide-react";
import {
  BlockRenderer,
  InlineRichText,
  TopicMetaFooter,
} from "@/components/trainer/BlockRenderer";
import { DrillTaskCard } from "@/components/trainer/DrillTaskCard";
import {
  EssayTaskCard,
  McTaskCard,
} from "@/components/trainer/EssayAndMcTaskCard";
import { importTrainerBundle } from "@/lib/trainer/importer";
import {
  getServerTrainerBundleSnapshot,
  getServerTrainerProgressSnapshot,
  readTrainerBundleSnapshot,
  readTrainerProgress,
  resetTrainerBundle,
  saveTrainerBundle,
  subscribeTrainerBundle,
  subscribeTrainerProgress,
  toggleTrainerCardKnown,
} from "@/lib/trainer/store";
import type { McpDrillTask, McpEssayTask, McpMcTask } from "@/lib/trainer/types";

type TrainerTab = "verstehen" | "rechnen" | "klausur" | "karten";

const DIRECTORY_INPUT_ATTRS = {
  webkitdirectory: "",
  directory: "",
} as unknown as React.InputHTMLAttributes<HTMLInputElement>;

export function TrainerView() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const { bundle, isCustom } = useSyncExternalStore(
    subscribeTrainerBundle,
    readTrainerBundleSnapshot,
    getServerTrainerBundleSnapshot,
  );
  const progress = useSyncExternalStore(
    subscribeTrainerProgress,
    readTrainerProgress,
    getServerTrainerProgressSnapshot,
  );

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TrainerTab>("verstehen");
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [importError, setImportError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const sortedCourseTopics = [...bundle.course.topics].sort((a, b) => {
    const tierDiff = (a.tier ?? 2) - (b.tier ?? 2);
    if (tierDiff !== 0) return tierDiff;
    return (
      (b.expectedPoints ?? b.points ?? 0) - (a.expectedPoints ?? a.points ?? 0)
    );
  });

  const activeTopicMeta =
    sortedCourseTopics.find((t) => t.id === selectedTopicId) ??
    sortedCourseTopics.find((t) => Boolean(bundle.topics[t.id])) ??
    sortedCourseTopics[0];
  const activeTopicContent = activeTopicMeta
    ? bundle.topics[activeTopicMeta.id]
    : undefined;

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    setImportError(null);
    setImportStatus(null);
    const candidates = Array.from(fileList).filter((f) => {
      const lower = f.name.toLowerCase();
      return lower.endsWith(".json") || lower.endsWith(".html");
    });
    if (candidates.length === 0) {
      setImportError(
        "Keine `.json` oder `Lernly-Trainer.html` gefunden. Wähle den `_lernly`-Ordner oder `kurs.json` + `themen/*.json`.",
      );
      return;
    }
    try {
      const loaded = await Promise.all(
        candidates.map(async (f) => ({
          name: f.webkitRelativePath || f.name,
          content: await f.text(),
        })),
      );
      const res = importTrainerBundle(loaded);
      if (!res.ok) {
        setImportError(res.error);
        return;
      }
      saveTrainerBundle(res.bundle);
      const firstHydrated = res.bundle.course.topics.find(
        (t) => Boolean(res.bundle.topics[t.id]),
      );
      setSelectedTopicId(
        firstHydrated?.id ?? res.bundle.course.topics[0]?.id ?? null,
      );
      setActiveTab("verstehen");
      setFlippedCards({});
      setImportStatus(
        `Kurs „${res.bundle.course.title}“ geladen (${res.summary.hydratedTopics}/${res.summary.topics} Themen ausgearbeitet, ${res.summary.tasks} Aufgaben, ${res.summary.cards} Karten).`,
      );
    } catch {
      setImportError("Dateien konnten nicht gelesen werden.");
    }
  }, []);

  const drills: McpDrillTask[] = (activeTopicContent?.tasks ?? []).filter(
    (t): t is McpDrillTask => t.kind === "drill",
  );
  const examTasks: (McpEssayTask | McpMcTask)[] = (
    activeTopicContent?.tasks ?? []
  ).filter(
    (t): t is McpEssayTask | McpMcTask => t.kind === "essay" || t.kind === "mc",
  );
  const cards = activeTopicContent?.cards ?? [];

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 py-8 sm:px-8 lg:px-10">
      {/* Header + Course Summary */}
      <header className="border-b border-line pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-text-dim">
              <span className="rounded-full bg-work-bg px-2.5 py-0.5 text-work-ink">
                {isCustom ? "Importierter MCP-Kurs" : "Demo-Kurs · lernly.kurs/1"}
              </span>
              {bundle.course.exam?.totalPoints ? (
                <span>· {bundle.course.exam.totalPoints} Punkte</span>
              ) : null}
              {bundle.course.exam?.durationMin ? (
                <span>· {bundle.course.exam.durationMin} Min</span>
              ) : null}
              {bundle.course.exam?.aids ? (
                <span>· {bundle.course.exam.aids}</span>
              ) : null}
            </div>

            <h1 className="mt-2 font-display text-[30px] font-bold tracking-[-0.03em] text-text sm:text-[36px]">
              {bundle.course.title}
            </h1>
            {bundle.course.subtitle ? (
              <p className="mt-1 text-[14px] text-text-dim">
                {bundle.course.subtitle}
              </p>
            ) : null}
          </div>

          {isCustom ? (
            <button
              type="button"
              onClick={() => {
                resetTrainerBundle();
                setSelectedTopicId(null);
                setImportStatus(null);
                setImportError(null);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-[13px] font-semibold text-text transition hover:bg-surface-2"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Demo-Kurs laden</span>
            </button>
          ) : null}
        </div>

        {bundle.course.strategy ? (
          <div className="mt-4 rounded-xl border border-line bg-surface px-4 py-3 text-[14px] text-text">
            <span className="mr-2 font-bold uppercase tracking-[0.05em] text-primary">
              Klausurstrategie:
            </span>
            <InlineRichText md={bundle.course.strategy} />
          </div>
        ) : null}
      </header>

      {/* Drag & Drop / Folder Importer for _lernly/ */}
      <section aria-label="Claude MCP Kursordner importieren" className="mt-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.html"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="sr-only"
          {...DIRECTORY_INPUT_ATTRS}
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files) void handleFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-start justify-between gap-4 rounded-2xl border border-dashed p-5 transition sm:flex-row sm:items-center ${
            dragging
              ? "border-primary bg-work-bg/40"
              : "border-ink-a14 bg-surface"
          }`}
        >
          <div>
            <p className="text-[15px] font-semibold text-text">
              Eigenen Kurs aus Claude/MCP laden (<code>_lernly/</code>)
            </p>
            <p className="mt-0.5 text-[13.5px] text-text-dim">
              Wähle deinen <code>_lernly</code>-Ordner oder ziehe{" "}
              <code>kurs.json</code> + <code>themen/*.json</code> (oder{" "}
              <code>Lernly-Trainer.html</code>) hierher.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13.5px] font-semibold text-on-primary transition hover:bg-primary-press"
            >
              <FolderOpen className="h-4 w-4" aria-hidden="true" />
              <span>_lernly-Ordner wählen</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 text-[13.5px] font-semibold text-text transition hover:opacity-85"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span>JSON / HTML wählen</span>
            </button>
          </div>
        </div>

        {importError ? (
          <p role="alert" className="mt-2.5 text-[13.5px] font-medium text-err-ink">
            {importError}
          </p>
        ) : null}
        {importStatus ? (
          <p
            role="status"
            className="mt-2.5 flex items-center gap-1.5 text-[13.5px] font-medium text-ok-ink"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>{importStatus}</span>
          </p>
        ) : null}
      </section>

      {/* Main Split: Topics by Exam Points + Active Topic Interactive View */}
      <div className="mt-8 grid grid-cols-1 gap-7 lg:grid-cols-[290px_1fr] lg:items-start">
        <aside aria-label="Themen nach Klausurpunkten" className="space-y-2.5">
          <p className="px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim">
            Klausur-Themen ({sortedCourseTopics.length})
          </p>

          <ul className="space-y-2">
            {sortedCourseTopics.map((topic) => {
              const active = activeTopicMeta?.id === topic.id;
              const hydrated = Boolean(bundle.topics[topic.id]);
              const pts = topic.expectedPoints ?? topic.points;
              return (
                <li key={topic.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTopicId(topic.id);
                      setActiveTab("verstehen");
                    }}
                    className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${
                      active
                        ? "border-primary bg-surface shadow-sm"
                        : "border-line bg-surface/60 hover:bg-surface"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          topic.tier === 1
                            ? "bg-urgent-bg text-urgent-ink"
                            : "bg-work-bg text-work-ink"
                        }`}
                      >
                        Stufe {topic.tier ?? 2}
                      </span>
                      {typeof pts === "number" ? (
                        <span className="text-[13px] font-bold tabular-nums text-text">
                          {pts} P
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1.5 text-[14.5px] font-semibold text-text">
                      {topic.title}
                    </p>
                    {topic.why ? (
                      <p className="mt-0.5 text-[12px] text-text-dim">
                        {topic.why}
                      </p>
                    ) : null}
                    {!hydrated ? (
                      <p className="mt-1 text-[11.5px] font-medium text-text-faint">
                        Noch keine `themen/{topic.id}.json` geladen
                      </p>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Right: Active Topic Tabs */}
        <section className="min-w-0">
          {!activeTopicMeta ? null : !activeTopicContent ? (
            <div className="rounded-2xl border border-line bg-surface p-8">
              <h2 className="font-display text-[22px] font-bold text-text">
                {activeTopicMeta.title}
              </h2>
              <p className="mt-2 text-[15px] text-text-dim">
                Dieses Thema steht im Klausurplan (<code>kurs.json</code>), aber
                die Datei <code>themen/{activeTopicMeta.id}.json</code> wurde
                noch nicht mit ausgewählt. Wähle den kompletten{" "}
                <code>_lernly</code>-Ordner aus oder lass Claude das Thema zuerst
                erstellen.
              </p>
              {activeTopicMeta.sources ? (
                <p className="mt-3 text-[13px] text-text-dim">
                  Quellen: {activeTopicMeta.sources}
                </p>
              ) : null}
            </div>
          ) : (
            <div>
              {/* 4 Mode Tabs */}
              <div
                role="tablist"
                aria-label="Lernmodus"
                className="flex flex-wrap gap-2 border-b border-line pb-4"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "verstehen"}
                  onClick={() => setActiveTab("verstehen")}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${
                    activeTab === "verstehen"
                      ? "bg-primary text-on-primary"
                      : "border border-line bg-surface text-text-dim hover:text-text"
                  }`}
                >
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  <span>Verstehen</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "rechnen"}
                  onClick={() => setActiveTab("rechnen")}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${
                    activeTab === "rechnen"
                      ? "bg-primary text-on-primary"
                      : "border border-line bg-surface text-text-dim hover:text-text"
                  }`}
                >
                  <Calculator className="h-4 w-4" aria-hidden="true" />
                  <span>Rechnen ({drills.length})</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "klausur"}
                  onClick={() => setActiveTab("klausur")}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${
                    activeTab === "klausur"
                      ? "bg-primary text-on-primary"
                      : "border border-line bg-surface text-text-dim hover:text-text"
                  }`}
                >
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                  <span>Klausur-Aufgaben ({examTasks.length})</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "karten"}
                  onClick={() => setActiveTab("karten")}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${
                    activeTab === "karten"
                      ? "bg-primary text-on-primary"
                      : "border border-line bg-surface text-text-dim hover:text-text"
                  }`}
                >
                  <Layers className="h-4 w-4" aria-hidden="true" />
                  <span>Karteikarten ({cards.length})</span>
                </button>
              </div>

              {/* Tab 1: Verstehen (theory + standardAnswer + hook/mistakes/source) */}
              {activeTab === "verstehen" ? (
                <div className="mt-5 space-y-6 rounded-2xl border border-line bg-surface p-6">
                  {activeTopicContent.theory.length > 0 ? (
                    <BlockRenderer blocks={activeTopicContent.theory} />
                  ) : null}

                  {activeTopicContent.standardAnswer &&
                  activeTopicContent.standardAnswer.length > 0 ? (
                    <div className="pt-2">
                      <BlockRenderer blocks={activeTopicContent.standardAnswer} />
                    </div>
                  ) : null}

                  <TopicMetaFooter
                    hook={activeTopicContent.hook}
                    mistakes={activeTopicContent.mistakes}
                    source={activeTopicContent.source}
                  />
                </div>
              ) : null}

              {/* Tab 2: Rechen-Drills */}
              {activeTab === "rechnen" ? (
                <div className="mt-5 space-y-5">
                  {drills.length === 0 ? (
                    <div className="rounded-2xl border border-line bg-surface p-6 text-[15px] text-text-dim">
                      Für dieses Thema sind keine Rechen-Drills hinterlegt.
                    </div>
                  ) : (
                    drills.map((task) => (
                      <DrillTaskCard
                        key={task.id}
                        task={task}
                        solved={Boolean(progress.solvedDrills[task.id])}
                      />
                    ))
                  )}
                </div>
              ) : null}

              {/* Tab 3: Klausur-Aufgaben (Essay Checklists + MC) */}
              {activeTab === "klausur" ? (
                <div className="mt-5 space-y-5">
                  {examTasks.length === 0 ? (
                    <div className="rounded-2xl border border-line bg-surface p-6 text-[15px] text-text-dim">
                      Für dieses Thema sind keine offenen Klausuraufgaben oder
                      MC-Fragen hinterlegt.
                    </div>
                  ) : (
                    examTasks.map((task) =>
                      task.kind === "essay" ? (
                        <EssayTaskCard
                          key={task.id}
                          task={task}
                          checkedIndices={progress.checkedChecklist[task.id] ?? []}
                        />
                      ) : (
                        <McTaskCard key={task.id} task={task} />
                      ),
                    )
                  )}
                </div>
              ) : null}

              {/* Tab 4: Karteikarten */}
              {activeTab === "karten" ? (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {cards.length === 0 ? (
                    <div className="col-span-full rounded-2xl border border-line bg-surface p-6 text-[15px] text-text-dim">
                      Für dieses Thema sind keine Karteikarten hinterlegt.
                    </div>
                  ) : (
                    cards.map((card) => {
                      const flipped = Boolean(flippedCards[card.id]);
                      const known = Boolean(progress.knownCards[card.id]);
                      return (
                        <article
                          key={card.id}
                          className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                            known
                              ? "border-ok-ink bg-ok-bg/35"
                              : "border-line bg-surface"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setFlippedCards((prev) => ({
                                ...prev,
                                [card.id]: !prev[card.id],
                              }))
                            }
                            className="text-left"
                          >
                            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-dim">
                              {flipped ? "Antwort" : "Frage · Klicken zum Aufdecken"}
                            </p>
                            <p className="mt-2 font-display text-[17px] font-bold text-text">
                              <InlineRichText
                                md={flipped ? card.back : card.front}
                              />
                            </p>
                          </button>

                          <div className="mt-5 flex items-center justify-between border-t border-line pt-3">
                            <button
                              type="button"
                              onClick={() =>
                                setFlippedCards((prev) => ({
                                  ...prev,
                                  [card.id]: !prev[card.id],
                                }))
                              }
                              className="text-[12.5px] font-semibold text-primary hover:underline"
                            >
                              {flipped ? "Zur Frage" : "Antwort zeigen"}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleTrainerCardKnown(card.id)}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[12px] font-semibold transition ${
                                known
                                  ? "bg-ok-bg text-ok-ink"
                                  : "bg-surface-2 text-text-dim hover:text-text"
                              }`}
                            >
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>{known ? "Kann ich" : "Merken"}</span>
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
