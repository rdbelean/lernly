"use client";

import { useEffect, useMemo, useState } from "react";
import type { StudyPack } from "@/lib/schema";
import FlashcardDeck from "./FlashcardDeck";
import EssayBlueprintView from "./EssayBlueprintView";
import OverviewView from "./OverviewView";
import ExamSimulator from "./ExamSimulator";
import VisualMapView from "./VisualMapView";
import { track } from "@/lib/analytics";

type Language = "en" | "de";
type Tab =
  | "visualMap"
  | "simulator"
  | "flashcards"
  | "blueprint"
  | "overview";

type TabDef = { id: Tab; emoji: string; de: string; en: string };

const ALL_TABS: TabDef[] = [
  { id: "visualMap", emoji: "🧠", de: "Visual Map", en: "Visual Map" },
  { id: "simulator", emoji: "🎯", de: "Übungsklausur", en: "Exam Trainer" },
  { id: "flashcards", emoji: "🃏", de: "Karteikarten", en: "Flashcards" },
  { id: "blueprint", emoji: "📝", de: "Blueprint", en: "Blueprint" },
  { id: "overview", emoji: "🗺", de: "Übersicht", en: "Overview" },
];

export default function PackView({
  pack,
  language = "de",
}: {
  pack: StudyPack;
  language?: Language;
}) {
  const tabs = useMemo<TabDef[]>(() => {
    // Visual Map tab only renders if the pack actually contains one — older
    // packs without the new section get the legacy 4-tab layout.
    if (pack.visualMap && pack.visualMap.blocks.length > 0) return ALL_TABS;
    return ALL_TABS.filter((t) => t.id !== "visualMap");
  }, [pack.visualMap]);

  const [tab, setTab] = useState<Tab>(tabs[0]?.id ?? "simulator");
  const isEn = language === "en";

  useEffect(() => {
    track("pack_opened", {
      cards: pack.flashcards.length,
      quiz: pack.simulator.questions.length,
      exam_type: pack.examType,
      has_visual_map: Boolean(pack.visualMap),
    });
  }, [
    pack.flashcards.length,
    pack.simulator.questions.length,
    pack.examType,
    pack.visualMap,
  ]);

  return (
    <div className="ln-glass-card overflow-hidden">
      <div className="flex overflow-x-auto border-b border-white/10 px-4 md:px-8">
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

      <div className="p-6 md:p-9">
        {tab === "visualMap" && pack.visualMap && (
          <VisualMapView map={pack.visualMap} />
        )}
        {tab === "simulator" && (
          <ExamSimulator
            questions={pack.simulator.questions}
            language={language}
          />
        )}
        {tab === "flashcards" && (
          <FlashcardDeck cards={pack.flashcards} language={language} />
        )}
        {tab === "blueprint" && (
          <EssayBlueprintView
            blueprint={pack.essayBlueprint}
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
