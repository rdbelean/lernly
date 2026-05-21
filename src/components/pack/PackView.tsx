"use client";

import { useState } from "react";
import type { StudyPack } from "@/lib/schema";
import FlashcardDeck from "./FlashcardDeck";
import EssayBlueprintView from "./EssayBlueprintView";
import OverviewView from "./OverviewView";
import ExamSimulator from "./ExamSimulator";

type Language = "en" | "de";
type Tab = "flashcards" | "overview" | "blueprint" | "simulator";

const TABS: { id: Tab; emoji: string; de: string; en: string }[] = [
  { id: "flashcards", emoji: "🃏", de: "Karteikarten", en: "Flashcards" },
  { id: "overview", emoji: "🗺", de: "Übersicht", en: "Overview" },
  { id: "blueprint", emoji: "📝", de: "Blueprint", en: "Blueprint" },
  { id: "simulator", emoji: "🎯", de: "Simulator", en: "Simulator" },
];

export default function PackView({
  pack,
  language = "de",
}: {
  pack: StudyPack;
  language?: Language;
}) {
  const [tab, setTab] = useState<Tab>("flashcards");
  const isEn = language === "en";

  return (
    <div className="ln-glass-card overflow-hidden">
      <div className="flex border-b border-white/10 px-4 md:px-8">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                "flex items-center gap-2 border-b-2 px-4 py-4 text-[14px] font-medium transition " +
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
        {tab === "flashcards" && (
          <FlashcardDeck cards={pack.flashcards} language={language} />
        )}
        {tab === "overview" && (
          <OverviewView overview={pack.overview} language={language} />
        )}
        {tab === "blueprint" && (
          <EssayBlueprintView blueprint={pack.essayBlueprint} language={language} />
        )}
        {tab === "simulator" && (
          <ExamSimulator
            questions={pack.simulator.questions}
            language={language}
          />
        )}
      </div>
    </div>
  );
}
