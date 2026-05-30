"use client";

import { useEffect, useMemo, useState } from "react";
import type { StudyPack } from "@/lib/schema";
import FlashcardDeck from "./FlashcardDeck";
import EssayBlueprintView from "./EssayBlueprintView";
import ExamSimulator from "./ExamSimulator";
import VisualMapView from "./VisualMapView";
import { track } from "@/lib/analytics";
import OpenQuestionsView from "./OpenQuestionsView";
import QuizView from "./QuizView";
import EssayPredictionsView from "./EssayPredictionsView";
import PackHub, { type LatestAttempt } from "./PackHub";
import type { PackExamSummary } from "./PackHeader";

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

type TabDef = { id: Tab; emoji: string; de: string; en: string };

const ALL_TABS: TabDef[] = [
  { id: "hub", emoji: "🏠", de: "Hub", en: "Hub" },
  { id: "visualMap", emoji: "🧠", de: "Visual Map", en: "Visual Map" },
  { id: "essayPredictions", emoji: "📌", de: "Aufsatz-Plan", en: "Essay Plan" },
  { id: "simulator", emoji: "🎯", de: "Übungsklausur", en: "Exam Trainer" },
  { id: "flashcards", emoji: "🃏", de: "Karteikarten", en: "Flashcards" },
  { id: "blueprint", emoji: "📝", de: "Blueprint", en: "Blueprint" },
  { id: "openQuestions", emoji: "✍️", de: "Offene Fragen", en: "Open Questions" },
];

export default function PackView({
  pack,
  language = "de",
  packId,
  exam = null,
  latestAttempt = null,
}: {
  pack: StudyPack;
  language?: Language;
  packId?: string;
  exam?: PackExamSummary | null;
  latestAttempt?: LatestAttempt | null;
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
        {tab === "hub" && (
          <PackHub
            pack={pack}
            exam={exam}
            latestAttempt={latestAttempt}
            language={language}
            onEnterMode={onEnterMode}
          />
        )}
        {tab === "visualMap" && pack.visualMap && (
          <VisualMapView
            map={pack.visualMap}
            overview={pack.overview}
            language={language}
          />
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
            packId={packId}
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
      </div>
    </div>
  );
}
