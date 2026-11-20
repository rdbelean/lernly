"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Layers,
  LayoutDashboard,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { TrainerFlashcardsTab } from "@/components/trainer/TrainerFlashcardsTab";
import { TrainerLearnTab } from "@/components/trainer/TrainerLearnTab";
import { TrainerMockExamTab } from "@/components/trainer/TrainerMockExamTab";
import { TrainerOnboardingAssistant } from "@/components/trainer/TrainerOnboardingAssistant";
import { TrainerOverviewTab } from "@/components/trainer/TrainerOverviewTab";
import { TrainerPracticeTab } from "@/components/trainer/TrainerPracticeTab";
import {
  collectCourseCards,
  collectCourseTasks,
  getSortedCourseTopics,
  getTaskStatus,
  resolveMockExams,
} from "@/components/trainer/trainerHelpers";
import {
  importTrainerBundle,
  importTrainerFromText,
  type ImportTrainerResult,
} from "@/lib/trainer/importer";
import {
  getServerTrainerBundleSnapshot,
  getServerTrainerProgressSnapshot,
  readTrainerBundleSnapshot,
  readTrainerProgress,
  resetTrainerBundle,
  saveTrainerBundle,
  subscribeTrainerBundle,
  subscribeTrainerProgress,
} from "@/lib/trainer/store";
import type { TrainerBundle } from "@/lib/trainer/types";

type MainTrainerTab =
  | "plan"
  | "verstehen"
  | "ueben"
  | "karten"
  | "probeklausur";

export interface TrainerViewProps {
  initialBundle?: TrainerBundle;
  initialCourseId?: string | null;
  focusUpload?: boolean;
  hasSavedCourses?: boolean;
  syncToken?: string | null;
}

const DIRECTORY_INPUT_ATTRS = {
  webkitdirectory: "",
  directory: "",
} as unknown as React.InputHTMLAttributes<HTMLInputElement>;

export function TrainerView({
  initialBundle,
  initialCourseId = null,
  focusUpload = false,
  hasSavedCourses = false,
  syncToken = null,
}: TrainerViewProps = {}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const stored = useSyncExternalStore(
    subscribeTrainerBundle,
    readTrainerBundleSnapshot,
    getServerTrainerBundleSnapshot,
  );
  const progress = useSyncExternalStore(
    subscribeTrainerProgress,
    readTrainerProgress,
    getServerTrainerProgressSnapshot,
  );

  const [localOverrideBundle, setLocalOverrideBundle] =
    useState<TrainerBundle | null>(null);
  const [activeTab, setActiveTab] = useState<MainTrainerTab>("plan");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [learnAppendixKey, setLearnAppendixKey] = useState(0);
  const [learnShowAppendix, setLearnShowAppendix] = useState(false);

  const [showUploadBox, setShowUploadBox] = useState<boolean>(() =>
    Boolean(focusUpload || (!hasSavedCourses && !initialCourseId && !initialBundle)),
  );
  const [importError, setImportError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const bundle = localOverrideBundle ?? initialBundle ?? stored.bundle;
  const isCustom = Boolean(localOverrideBundle || initialBundle || stored.isCustom);

  const sortedTopics = useMemo(() => getSortedCourseTopics(bundle), [bundle]);
  const allTasks = useMemo(
    () => collectCourseTasks(bundle, sortedTopics),
    [bundle, sortedTopics],
  );
  const allCards = useMemo(
    () => collectCourseCards(bundle, sortedTopics),
    [bundle, sortedTopics],
  );
  const mockExams = useMemo(() => resolveMockExams(bundle), [bundle]);

  const effectiveTopicId =
    selectedTopicId && bundle.topics[selectedTopicId]
      ? selectedTopicId
      : sortedTopics.find((t) => Boolean(bundle.topics[t.id]))?.id ??
        sortedTopics[0]?.id ??
        "";

  const openTaskCount = useMemo(
    () =>
      allTasks.filter((entry) => getTaskStatus(progress, entry.task.id) !== "ok")
        .length,
    [allTasks, progress],
  );

  const handleOpenArtifactTab = useCallback(() => {
    if (!bundle.artifactHtml) return;
    const blob = new Blob([bundle.artifactHtml], {
      type: "text/html;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }, [bundle.artifactHtml]);

  const persistImportResult = useCallback(
    async (res: ImportTrainerResult) => {
      if (!res.ok) {
        setImportError(res.error);
        return;
      }

      saveTrainerBundle(res.bundle);
      setLocalOverrideBundle(res.bundle);
      const firstHydrated = res.bundle.course.topics.find((t) =>
        Boolean(res.bundle.topics[t.id]),
      );
      setSelectedTopicId(
        firstHydrated?.id ?? res.bundle.course.topics[0]?.id ?? null,
      );
      setActiveTab("plan");
      setLearnShowAppendix(false);

      const resp = await fetch("/api/trainer/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle: res.bundle }),
      });

      const detailSuffix = res.bundle.artifactHtml
        ? "als HTML-Trainer"
        : `(${res.summary.hydratedTopics}/${res.summary.topics} Themen, ${res.summary.tasks} Aufgaben, ${res.summary.cards} Karten)`;

      if (!resp.ok) {
        const errPayload = (await resp.json().catch(() => null)) as
          | { error?: string }
          | null;
        setImportError(
          errPayload?.error ??
            "Kurs lokal geladen, konnte aber nicht in deinem Account gespeichert werden.",
        );
        return;
      }

      const saved = (await resp.json()) as {
        id: string;
        updated?: boolean;
      };
      const verb = saved.updated ? "aktualisiert" : "dauerhaft gespeichert";
      setImportStatus(
        `Kurs „${res.bundle.course.title}“ ${verb} ${detailSuffix}.`,
      );
      setShowUploadBox(false);
      router.replace(`/dashboard?course=${saved.id}`);
      router.refresh();
    },
    [router],
  );

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setImportError(null);
      setImportStatus(null);
      const candidates = Array.from(fileList).filter((f) => {
        const lower = f.name.toLowerCase();
        return (
          lower.endsWith(".json") ||
          lower.endsWith(".html") ||
          lower.endsWith(".htm")
        );
      });
      if (candidates.length === 0) {
        setImportError(
          "Keine `.json` oder `Lernly-Trainer.html` gefunden. Wähle den `_lernly`-Ordner oder eine Datei aus Claude/ChatGPT.",
        );
        return;
      }

      setIsSaving(true);
      try {
        const loaded = await Promise.all(
          candidates.map(async (f) => ({
            name: f.webkitRelativePath || f.name,
            content: await f.text(),
          })),
        );
        await persistImportResult(importTrainerBundle(loaded));
      } catch {
        setImportError("Dateien konnten nicht gelesen oder gespeichert werden.");
      } finally {
        setIsSaving(false);
      }
    },
    [persistImportResult],
  );

  const handlePasteSubmit = useCallback(
    async (rawText: string) => {
      setImportError(null);
      setImportStatus(null);
      setIsSaving(true);
      try {
        await persistImportResult(importTrainerFromText(rawText));
      } catch {
        setImportError("Eingefügter Kurs konnte nicht gespeichert werden.");
      } finally {
        setIsSaving(false);
      }
    },
    [persistImportResult],
  );

  const badgeLabel = bundle.artifactHtml
    ? "HTML-Trainer · Gespeichert"
    : initialCourseId || localOverrideBundle
      ? "Gespeicherter Kurs"
      : stored.isCustom
        ? "Importierter Kurs"
        : "Demo-Kurs · lernly.kurs/1";

  const hasCheatsheet = Boolean(
    bundle.cheatsheet?.html || bundle.cheatsheet?.sections?.length,
  );

  return (
    <div className="mx-auto w-full max-w-[1160px] px-5 py-6 sm:px-8 lg:px-10">
      {/* Compact Header with Course Title + Collapsible "+ Kurs hochladen" */}
      <header className="border-b border-line pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-text-dim">
              <span className="rounded-full bg-work-bg px-2.5 py-0.5 text-work-ink">
                {badgeLabel}
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

            <h1 className="mt-1.5 font-display text-[26px] font-bold tracking-[-0.03em] text-text sm:text-[32px]">
              {bundle.course.title}
            </h1>
            {bundle.course.subtitle ? (
              <p className="mt-0.5 text-[14px] text-text-dim">
                {bundle.course.subtitle}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {bundle.artifactHtml ? (
              <button
                type="button"
                onClick={handleOpenArtifactTab}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-[13px] font-semibold text-text transition hover:bg-surface-2"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                <span>In neuem Tab öffnen</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setShowUploadBox((v) => !v)}
              aria-expanded={showUploadBox}
              className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition ${
                showUploadBox
                  ? "border border-line bg-surface-2 text-text"
                  : "bg-primary text-on-primary hover:bg-primary-press"
              }`}
            >
              {showUploadBox ? (
                <>
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Assistent ausblenden</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Neuen Kurs erstellen</span>
                </>
              )}
            </button>

            {isCustom ? (
              <button
                type="button"
                onClick={() => {
                  resetTrainerBundle();
                  setLocalOverrideBundle(null);
                  setSelectedTopicId(null);
                  setActiveTab("plan");
                  setImportStatus(null);
                  setImportError(null);
                  if (initialCourseId) {
                    router.push("/dashboard");
                  }
                }}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-[13px] font-semibold text-text-dim transition hover:bg-surface-2 hover:text-text"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Demo-Kurs</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* 5 Primary Study Tabs (hidden only for standalone raw HTML iframes) */}
        {!bundle.artifactHtml ? (
          <nav
            aria-label="Trainer-Modus"
            className="mt-5 flex flex-wrap gap-2"
          >
            <button
              type="button"
              onClick={() => setActiveTab("plan")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${
                activeTab === "plan"
                  ? "bg-primary text-on-primary"
                  : "border border-line bg-surface text-text-dim hover:text-text"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              <span>Übersicht &amp; Klausurplan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLearnShowAppendix(false);
                setActiveTab("verstehen");
              }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${
                activeTab === "verstehen"
                  ? "bg-primary text-on-primary"
                  : "border border-line bg-surface text-text-dim hover:text-text"
              }`}
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span>Lernen &amp; Verstehen</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ueben")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${
                activeTab === "ueben"
                  ? "bg-primary text-on-primary"
                  : "border border-line bg-surface text-text-dim hover:text-text"
              }`}
            >
              <Calculator className="h-4 w-4" aria-hidden="true" />
              <span>Üben &amp; Rechnen</span>
              {openTaskCount > 0 ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                    activeTab === "ueben"
                      ? "bg-surface/20 text-on-primary"
                      : "bg-urgent-bg text-urgent-ink"
                  }`}
                >
                  {openTaskCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("karten")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${
                activeTab === "karten"
                  ? "bg-primary text-on-primary"
                  : "border border-line bg-surface text-text-dim hover:text-text"
              }`}
            >
              <Layers className="h-4 w-4" aria-hidden="true" />
              <span>Karteikarten</span>
              {allCards.length > 0 ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                    activeTab === "karten"
                      ? "bg-surface/20 text-on-primary"
                      : "bg-surface-2 text-text-dim"
                  }`}
                >
                  {allCards.length}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("probeklausur")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${
                activeTab === "probeklausur"
                  ? "bg-primary text-on-primary"
                  : "border border-line bg-surface text-text-dim hover:text-text"
              }`}
            >
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
              <span>Probeklausur</span>
              {mockExams.length > 0 ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                    activeTab === "probeklausur"
                      ? "bg-surface/20 text-on-primary"
                      : "bg-surface-2 text-text-dim"
                  }`}
                >
                  {mockExams.length}
                </span>
              ) : null}
            </button>
          </nav>
        ) : null}
      </header>

      {/* Collapsible Importer Zone */}
      <section
        id="upload"
        aria-label="Claude MCP Kursordner importieren"
        className="scroll-mt-6"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.html,.htm"
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

        {showUploadBox ? (
          <TrainerOnboardingAssistant
            isSaving={isSaving}
            focusUpload={focusUpload}
            syncToken={syncToken}
            canDismiss={hasSavedCourses || isCustom}
            fileInputRef={fileInputRef}
            folderInputRef={folderInputRef}
            onFiles={(files) => void handleFiles(files)}
            onPasteSubmit={(text) => void handlePasteSubmit(text)}
            onClose={() => setShowUploadBox(false)}
          />
        ) : null}

        {importError ? (
          <p role="alert" className="mt-3 text-[13.5px] font-medium text-err-ink">
            {importError}
          </p>
        ) : null}
        {importStatus ? (
          <p
            role="status"
            className="mt-3 flex items-center gap-1.5 text-[13.5px] font-medium text-ok-ink"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>{importStatus}</span>
          </p>
        ) : null}
      </section>

      {/* Main Content Area */}
      <div className="mt-6">
        {bundle.artifactHtml ? (
          <section aria-label="Gespeicherter HTML-Trainer">
            <iframe
              title={bundle.course.title}
              srcDoc={bundle.artifactHtml}
              sandbox="allow-scripts"
              className="h-[80vh] min-h-[620px] w-full rounded-2xl border border-line bg-surface"
            />
          </section>
        ) : activeTab === "plan" ? (
          <TrainerOverviewTab
            bundle={bundle}
            sortedTopics={sortedTopics}
            progress={progress}
            hasCheatsheet={hasCheatsheet}
            onStartNextTopic={(topicId) => {
              setSelectedTopicId(topicId);
              setActiveTab("ueben");
            }}
            onOpenTopicUnderstand={(topicId) => {
              setSelectedTopicId(topicId);
              setLearnShowAppendix(false);
              setLearnAppendixKey((k) => k + 1);
              setActiveTab("verstehen");
            }}
            onOpenAppendix={() => {
              setLearnShowAppendix(true);
              setLearnAppendixKey((k) => k + 1);
              setActiveTab("verstehen");
            }}
            onOpenExamSim={() => setActiveTab("probeklausur")}
          />
        ) : activeTab === "verstehen" ? (
          <TrainerLearnTab
            key={`learn-${learnAppendixKey}-${learnShowAppendix ? "app" : "top"}`}
            sortedTopics={sortedTopics}
            topicsRecord={bundle.topics}
            selectedTopicId={effectiveTopicId}
            readTopics={progress.readTopics}
            cheatsheet={bundle.cheatsheet}
            initialShowAppendix={learnShowAppendix}
            onSelectTopic={(id) => {
              setSelectedTopicId(id);
              setLearnShowAppendix(false);
            }}
            onPracticeTopic={(id) => {
              setSelectedTopicId(id);
              setActiveTab("ueben");
            }}
          />
        ) : activeTab === "ueben" ? (
          <TrainerPracticeTab
            sortedTopics={sortedTopics}
            allTasks={allTasks}
            selectedTopicId={effectiveTopicId}
            progress={progress}
            onSelectTopic={(id) => setSelectedTopicId(id)}
            onOpenOverview={() => setActiveTab("plan")}
          />
        ) : activeTab === "karten" ? (
          <TrainerFlashcardsTab
            sortedTopics={sortedTopics}
            allCards={allCards}
            selectedTopicId={effectiveTopicId}
            progress={progress}
            onSelectTopic={(id) => setSelectedTopicId(id)}
          />
        ) : (
          <TrainerMockExamTab
            mocks={mockExams}
            progress={progress}
            onCompletedToOverview={() => setActiveTab("plan")}
          />
        )}
      </div>
    </div>
  );
}
