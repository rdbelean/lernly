"use client";

import { useEffect, useMemo, useState } from "react";
import type { StudyPack } from "@/lib/schema";
import FlashcardDeck from "./FlashcardDeck";
import EssayBlueprintView from "./EssayBlueprintView";
import OverviewView from "./OverviewView";
import ExamSimulator from "./ExamSimulator";
import VisualMapView from "./VisualMapView";
import { track } from "@/lib/analytics";
import OpenQuestionsView from "./OpenQuestionsView";
import QuizView from "./QuizView";
import EssayPredictionsView from "./EssayPredictionsView";

type Language = "en" | "de";
type Tab =
  | "visualMap"
  | "essayPredictions"
  | "simulator"
  | "flashcards"
  | "blueprint"
  | "openQuestions"
  | "overview";

type TabDef = { id: Tab; emoji: string; de: string; en: string };

const ALL_TABS: TabDef[] = [
  { id: "visualMap", emoji: "🧠", de: "Visual Map", en: "Visual Map" },
  { id: "essayPredictions", emoji: "📌", de: "Aufsatz-Plan", en: "Essay Plan" },
  { id: "simulator", emoji: "🎯", de: "Übungsklausur", en: "Exam Trainer" },
  { id: "flashcards", emoji: "🃏", de: "Karteikarten", en: "Flashcards" },
  { id: "blueprint", emoji: "📝", de: "Blueprint", en: "Blueprint" },
  { id: "openQuestions", emoji: "✍️", de: "Offene Fragen", en: "Open Questions" },
  { id: "overview", emoji: "🗺", de: "Übersicht", en: "Overview" },
];

// Hero tab on pack open — chosen by exam format. Falls back to the first
// available tab if the preferred one isn't present (e.g. legacy essay packs
// that only have a blueprint).
const HERO_TAB_FOR_FORMAT: Record<string, Tab> = {
  multiple_choice: "openQuestions",
  open_questions: "openQuestions",
  oral: "flashcards",
  open_book: "overview",
  essay: "essayPredictions",
};

export default function PackView({
  pack,
  language = "de",
}: {
  pack: StudyPack;
  language?: Language;
}) {
  const tabs = useMemo<TabDef[]>(() => {
    const has: Record<Tab, boolean> = {
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
      overview: pack.overview.topics.length > 0,
    };
    return ALL_TABS.filter((t) => has[t.id]);
  }, [pack]);

  // Default-active tab on open is determined by the pack's exam format.
  // Falls back to the first available tab if the preferred one isn't present
  // (e.g. an old essay pack without essayPredictions falls back to blueprint).
  const preferredHero = HERO_TAB_FOR_FORMAT[pack.examType];
  const defaultTab =
    (preferredHero && tabs.find((t) => t.id === preferredHero)?.id) ??
    tabs[0]?.id ??
    "overview";
  const [tab, setTab] = useState<Tab>(defaultTab);
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

  return (
    <div>
      <div className="flex overflow-x-auto border-b border-white/10">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                "flex shrink-0 items-center gap-2 border-b-2 px-4 py-4 text-[14px] font-medium transition " +
                (active
                  ? "border-[color:var(--color-ln-cyan)] text-white"
                  : "border-transparent text-white/50 hover:text-white/80")
              }
            >
              <span>{t.emoji}</span>
              <span className="hidden sm:inline">{isEn ? t.en : t.de}</span>
            </button>
          );
        })}
      </div>

      <div className="py-6 sm:py-7 md:py-9">
        {tab === "visualMap" && pack.visualMap && (
          <VisualMapView map={pack.visualMap} />
        )}
        {tab === "essayPredictions" && pack.essayPredictions && (
          <EssayPredictionsView
            predictions={pack.essayPredictions.predictions}
            language={language}
          />
        )}
        {tab === "simulator" && pack.simulator && (
          <ExamSimulator questions={pack.simulator.questions} language={language} />
        )}
        {tab === "flashcards" && (
          <FlashcardDeck cards={pack.flashcards} language={language} />
        )}
        {tab === "blueprint" && pack.essayBlueprint && (
          <EssayBlueprintView blueprint={pack.essayBlueprint} language={language} />
        )}
        {tab === "openQuestions" && pack.quiz && pack.quiz.questions.length > 0 ? (
          <QuizView
            questions={pack.quiz.questions}
            overview={pack.overview}
            language={language}
          />
        ) : null}
        {tab === "openQuestions" &&
          !(pack.quiz && pack.quiz.questions.length > 0) &&
          pack.openQuestions && (
            <OpenQuestionsView
              questions={pack.openQuestions.questions}
              language={language}
            />
          )}
        {tab === "overview" && (
          <OverviewView overview={pack.overview} language={language} />
        )}
      </div>
    </div>
  );
}
