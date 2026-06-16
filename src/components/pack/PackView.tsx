"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Brain,
  FileText,
  Home,
  Layers,
  PenLine,
  Pin,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { StudyPack } from "@/lib/schema";
import { track } from "@/lib/analytics";
import PackHub, { type LatestAttempt } from "./PackHub";
import type { PackExamSummary } from "./PackHeader";

// The Hub is the default landing tab, so it stays statically imported and
// paints instantly. Every other mode is lazy: its chunk — and the heavy
// interactive libs it pulls (motion/confetti/katex, the in-mode tutor) — is
// fetched only when the user first activates that tab. This keeps the initial
// pack-open bundle small (Hub + tab bar) instead of shipping all seven views
// and ~400 KB of motion/katex/confetti up front. ssr:false because these are
// client-only interactive views that never render on the server (the Hub is
// always the initial tab) — it also avoids confetti/motion touching SSR.
function ModeSkeleton() {
  return (
    <div
      className="relative h-[340px] overflow-hidden rounded-2xl"
      style={{
        background: "rgba(20, 22, 28, 0.6)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div className="ln-skeleton-shimmer absolute inset-0" />
    </div>
  );
}

const FlashcardStudio = dynamic(() => import("./FlashcardStudio"), {
  ssr: false,
  loading: ModeSkeleton,
});
const EssayBlueprintView = dynamic(() => import("./EssayBlueprintView"), {
  ssr: false,
  loading: ModeSkeleton,
});
const ExamSimulator = dynamic(() => import("./ExamSimulator"), {
  ssr: false,
  loading: ModeSkeleton,
});
const VisualMapView = dynamic(() => import("./VisualMapView"), {
  ssr: false,
  loading: ModeSkeleton,
});
const OpenQuestionsView = dynamic(() => import("./OpenQuestionsView"), {
  ssr: false,
  loading: ModeSkeleton,
});
const QuizView = dynamic(() => import("./QuizView"), {
  ssr: false,
  loading: ModeSkeleton,
});
const EssayPredictionsView = dynamic(() => import("./EssayPredictionsView"), {
  ssr: false,
  loading: ModeSkeleton,
});

type Language = "en" | "de";
// The pack now opens to a Hub (situation + Weiterlernen + mode launcher
// cards) instead of dumping into a tab. The hub IS the home; mode cards
// switch into the existing study modes. The tab bar persists so users can
// jump between modes laterally once they've left the hub.
type Tab =
  | "hub"
  | "visualMap"
  | "essayPredictions"
  | "simulator"
  | "flashcards"
  | "blueprint"
  | "openQuestions";

type TabDef = { id: Tab; icon: LucideIcon; de: string; en: string };

const ALL_TABS: TabDef[] = [
  { id: "hub", icon: Home, de: "Hub", en: "Hub" },
  { id: "visualMap", icon: Brain, de: "Visual Map", en: "Visual Map" },
  { id: "essayPredictions", icon: Pin, de: "Aufsatz-Plan", en: "Essay Plan" },
  { id: "simulator", icon: Target, de: "Übungsklausur", en: "Exam Trainer" },
  { id: "flashcards", icon: Layers, de: "Karteikarten", en: "Flashcards" },
  { id: "blueprint", icon: FileText, de: "Blueprint", en: "Blueprint" },
  { id: "openQuestions", icon: PenLine, de: "Offene Fragen", en: "Open Questions" },
];

export type CardStates = { new: number; learning: number; mastered: number };

export default function PackView({
  pack,
  language = "de",
  packId,
  exam = null,
  latestAttempt = null,
  mastery = null,
  cardStates = null,
  favoriteIds = [],
}: {
  pack: StudyPack;
  language?: Language;
  packId?: string;
  exam?: PackExamSummary | null;
  latestAttempt?: LatestAttempt | null;
  mastery?: { mastered: number; total: number } | null;
  cardStates?: CardStates | null;
  favoriteIds?: string[];
}) {
  const tabs = useMemo<TabDef[]>(() => {
    const has: Record<Tab, boolean> = {
      hub: true, // Hub always available — it's the landing.
      visualMap: Boolean(pack.visualMap && pack.visualMap.blocks.length > 0),
      essayPredictions: Boolean(
        pack.essayPredictions && pack.essayPredictions.predictions.length > 0,
      ),
      simulator: Boolean(pack.simulator && pack.simulator.questions.length > 0),
      flashcards: pack.flashcards.length > 0,
      blueprint: Boolean(pack.essayBlueprint && pack.essayBlueprint.parts.length > 0),
      openQuestions: Boolean(
        (pack.quiz && pack.quiz.questions.length > 0) ||
          (pack.openQuestions && pack.openQuestions.questions.length > 0),
      ),
    };
    return ALL_TABS.filter((t) => has[t.id]);
  }, [pack]);

  // Default-active is always the Hub now. The previous HERO_TAB_FOR_FORMAT
  // logic moved into the Hub's "Weiterlernen" CTA — it picks the smartest
  // mode given exam format + latest attempt, and the user CHOOSES to enter
  // it instead of being dropped into it.
  const [tab, setTab] = useState<Tab>("hub");
  const isEn = language === "en";

  useEffect(() => {
    track("pack_opened", {
      cards: pack.flashcards.length,
      quiz: pack.simulator?.questions.length ?? 0,
      exam_type: pack.examType,
      has_visual_map: Boolean(pack.visualMap),
    });
  }, [
    pack.flashcards.length,
    pack.simulator?.questions.length,
    pack.examType,
    pack.visualMap,
  ]);

  // Mode entry from the hub — narrowed to non-hub tabs so callers can't
  // accidentally bounce back to themselves.
  const onEnterMode = (target: Exclude<Tab, "hub">) => {
    if (tabs.some((t) => t.id === target)) setTab(target);
  };

  return (
    <div>
      <div
        className="flex overflow-x-auto border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex shrink-0 items-center gap-2 border-b-2 px-4 py-4 text-[14px] font-medium transition"
              style={{
                borderColor: active
                  ? "var(--color-primary-bright)"
                  : "transparent",
                color: active
                  ? "var(--color-text)"
                  : "var(--color-text-dim)",
              }}
            >
              <Icon
                size={16}
                strokeWidth={1.75}
                color={
                  active
                    ? "var(--color-primary-bright)"
                    : "var(--color-text-faint)"
                }
                aria-hidden
              />
              <span className="hidden sm:inline">{isEn ? t.en : t.de}</span>
            </button>
          );
        })}
      </div>

      {/* key={tab} retriggers the CSS fade on every switch — pure CSS so no
          animation lib lands in the pack bundle; honours prefers-reduced-motion. */}
      <div key={tab} className="ln-view-fade py-6 sm:py-7 md:py-9">
        {tab === "hub" && (
          <PackHub
            pack={pack}
            exam={exam}
            latestAttempt={latestAttempt}
            language={language}
            onEnterMode={onEnterMode}
            mastery={mastery}
          />
        )}
        {tab === "visualMap" && pack.visualMap && (
          <VisualMapView
            map={pack.visualMap}
            overview={pack.overview}
            language={language}
            examLens={pack.examLens ?? null}
          />
        )}
        {tab === "essayPredictions" && pack.essayPredictions && (
          <EssayPredictionsView
            predictions={pack.essayPredictions.predictions}
            language={language}
          />
        )}
        {tab === "simulator" && pack.simulator && (
          <ExamSimulator
            questions={pack.simulator.questions}
            language={language}
            examLens={pack.examLens ?? null}
          />
        )}
        {tab === "flashcards" && (
          <FlashcardStudio
            cards={pack.flashcards}
            language={language}
            packId={packId}
            cardStates={cardStates}
            favoriteIds={favoriteIds}
          />
        )}
        {tab === "blueprint" && pack.essayBlueprint && (
          <EssayBlueprintView blueprint={pack.essayBlueprint} language={language} />
        )}
        {tab === "openQuestions" && pack.quiz && pack.quiz.questions.length > 0 ? (
          <QuizView
            questions={pack.quiz.questions}
            overview={pack.overview}
            language={language}
            packId={packId}
            examLens={pack.examLens ?? null}
          />
        ) : null}
        {tab === "openQuestions" &&
          !(pack.quiz && pack.quiz.questions.length > 0) &&
          pack.openQuestions && (
            <OpenQuestionsView
              questions={pack.openQuestions.questions}
              language={language}
              examLens={pack.examLens ?? null}
            />
          )}
      </div>
    </div>
  );
}
