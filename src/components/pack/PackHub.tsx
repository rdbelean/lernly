"use client";

import type { StudyPack } from "@/lib/schema";
import {
  countdownInfo,
  examRgba,
} from "@/lib/exams";
import type { PackExamSummary } from "@/components/pack/PackHeader";
import {
  ArrowRight,
  Brain,
  BookOpen,
  Clock,
  FileText,
  GraduationCap,
  Layers,
  PenLine,
  Pin,
  Sparkles,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { PrimaryCTAButton } from "@/components/ui/PrimaryCTA";

// =========================================================================
// PackHub — the landing view of a pack. Replaces "open straight into a tab"
// with "orient → pick mode → study → return home". UI #3 refresh swaps the
// emoji marks for lucide icons in tinted chips, restyles the Weiterlernen
// CTA to the indigo --color-primary surface, and converts the mode launcher
// from a grid of big-emoji squares into a tight vertical list of rows.
// =========================================================================

type Language = "en" | "de";

type ModeTab =
  | "visualMap"
  | "essayPredictions"
  | "simulator"
  | "flashcards"
  | "blueprint"
  | "openQuestions";

export type LatestAttempt = {
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  per_topic: Record<
    string,
    { correct: number; wrong: number; skipped: number }
  >;
  created_at: string;
};

type AvailableModes = Record<ModeTab, boolean>;

function availableModes(pack: StudyPack): AvailableModes {
  return {
    visualMap: Boolean(
      pack.visualMap && pack.visualMap.blocks.length > 0,
    ),
    essayPredictions: Boolean(
      pack.essayPredictions &&
        pack.essayPredictions.predictions.length > 0,
    ),
    simulator: Boolean(pack.simulator && pack.simulator.questions.length > 0),
    flashcards: pack.flashcards.length > 0,
    blueprint: Boolean(
      pack.essayBlueprint && pack.essayBlueprint.parts.length > 0,
    ),
    openQuestions: Boolean(
      (pack.quiz && pack.quiz.questions.length > 0) ||
        (pack.openQuestions && pack.openQuestions.questions.length > 0),
    ),
  };
}

function pickWeiterlernen(
  modes: AvailableModes,
  latestAttempt: LatestAttempt | null,
  language: Language,
): { label: string; sub: string; target: ModeTab } {
  const isEn = language === "en";
  const weakTopics = latestAttempt
    ? Object.entries(latestAttempt.per_topic).filter(([, s]) => {
        const answered = s.correct + s.wrong;
        return answered > 0 && s.correct / answered < 0.6;
      })
    : [];
  if (modes.openQuestions && weakTopics.length > 0) {
    return {
      label: isEn ? "Practice your weak spots" : "Schwächen üben",
      sub: isEn
        ? `${weakTopics.length} topic${weakTopics.length === 1 ? "" : "s"} below 60% — fresh quiz, weak topics only`
        : `${weakTopics.length} schwache${weakTopics.length === 1 ? "s" : ""} Thema${weakTopics.length === 1 ? "" : "n"} — neues Quiz, nur diese Themen`,
      target: "openQuestions",
    };
  }
  if (modes.openQuestions) {
    return {
      label: isEn ? "Start the exam quiz" : "Übungsklausur starten",
      sub: isEn ? "Test yourself in exam format" : "Teste dich im Klausur-Stil",
      target: "openQuestions",
    };
  }
  if (modes.essayPredictions) {
    return {
      label: isEn ? "Open the essay plan" : "Aufsatz-Plan ansehen",
      sub: isEn
        ? "Likely essay questions with answer skeletons"
        : "Wahrscheinliche Klausurfragen mit Skelett",
      target: "essayPredictions",
    };
  }
  if (modes.simulator) {
    return {
      label: isEn ? "Start the trainer" : "Übungsklausur starten",
      sub: isEn ? "Multiple choice, exam-style" : "Multiple Choice im Klausur-Stil",
      target: "simulator",
    };
  }
  return {
    label: isEn ? "Review flashcards" : "Karteikarten durchgehen",
    sub: isEn ? "Active recall, one card at a time" : "Aktiv wiederholen, Karte für Karte",
    target: "flashcards",
  };
}

// Each launcher card carries a tinted icon chip — tone token tells the chip
// which category color to use. Picked once per tab so the visual rhythm is
// stable across sessions.
type ChipTone = "blue" | "teal" | "coral" | "primary";

const CHIP_BG: Record<ChipTone, string> = {
  blue: "rgba(142, 154, 245, 0.14)",
  teal: "rgba(79, 209, 165, 0.14)",
  coral: "rgba(242, 132, 92, 0.14)",
  primary: "rgba(110, 128, 242, 0.16)",
};
const CHIP_FG: Record<ChipTone, string> = {
  blue: "var(--color-cat-blue)",
  teal: "var(--color-cat-teal)",
  coral: "var(--color-cat-coral)",
  primary: "var(--color-primary-bright)",
};

type ModeCard = {
  tab: ModeTab;
  icon: LucideIcon;
  tone: ChipTone;
  title: string;
  sub: string;
  count: string;
};

function buildModeCards(
  pack: StudyPack,
  modes: AvailableModes,
  language: Language,
): ModeCard[] {
  const isEn = language === "en";
  const cards: ModeCard[] = [];

  if (modes.visualMap) {
    cards.push({
      tab: "visualMap",
      icon: Brain,
      tone: "primary",
      title: "Visual Map",
      sub: isEn
        ? "Big picture: what matters most"
        : "Überblick: was kommt dran",
      count: isEn
        ? `${pack.visualMap?.blocks.length ?? 0} topics`
        : `${pack.visualMap?.blocks.length ?? 0} Themen`,
    });
  }
  if (modes.openQuestions) {
    const n =
      pack.quiz?.questions.length ?? pack.openQuestions?.questions.length ?? 0;
    cards.push({
      tab: "openQuestions",
      icon: PenLine,
      tone: "coral",
      title: pack.quiz ? "Übungsklausur" : "Offene Fragen",
      sub: isEn
        ? "Test yourself in exam format"
        : "Teste dich im Klausur-Stil",
      count: isEn ? `${n} questions` : `${n} Fragen`,
    });
  }
  if (modes.flashcards) {
    cards.push({
      tab: "flashcards",
      icon: Layers,
      tone: "teal",
      title: "Karteikarten",
      sub: isEn ? "Active recall, card by card" : "Aktiv wiederholen",
      count: isEn
        ? `${pack.flashcards.length} cards`
        : `${pack.flashcards.length} Karten`,
    });
  }
  if (modes.essayPredictions) {
    cards.push({
      tab: "essayPredictions",
      icon: Pin,
      tone: "blue",
      title: "Aufsatz-Plan",
      sub: isEn
        ? "Likely essay questions with skeletons"
        : "Wahrscheinliche Klausurfragen + Skelett",
      count: isEn
        ? `${pack.essayPredictions?.predictions.length ?? 0} questions`
        : `${pack.essayPredictions?.predictions.length ?? 0} Fragen`,
    });
  }
  if (modes.simulator) {
    cards.push({
      tab: "simulator",
      icon: Target,
      tone: "coral",
      title: "Übungs-Trainer",
      sub: isEn
        ? "Multiple-choice in exam style"
        : "Multiple Choice im Klausur-Stil",
      count: isEn
        ? `${pack.simulator?.questions.length ?? 0} questions`
        : `${pack.simulator?.questions.length ?? 0} Fragen`,
    });
  }
  if (modes.blueprint) {
    cards.push({
      tab: "blueprint",
      icon: FileText,
      tone: "blue",
      title: "Essay-Blueprint",
      sub: isEn
        ? "Paragraph structure + checklist"
        : "Absatz-Struktur + Checkliste",
      count: isEn
        ? `${pack.essayBlueprint?.parts.length ?? 0} sections`
        : `${pack.essayBlueprint?.parts.length ?? 0} Teile`,
    });
  }
  return cards;
}

function formatRelative(iso: string, language: Language): string {
  const isEn = language === "en";
  const then = new Date(iso).getTime();
  const sec = Math.floor((Date.now() - then) / 1000);
  if (sec < 60) return isEn ? "just now" : "gerade eben";
  const min = Math.floor(sec / 60);
  if (min < 60) return isEn ? `${min} min ago` : `vor ${min} Min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return isEn ? `${hr} h ago` : `vor ${hr} Std`;
  const day = Math.floor(hr / 24);
  if (day === 1) return isEn ? "yesterday" : "gestern";
  return isEn ? `${day} d ago` : `vor ${day} Tagen`;
}

export default function PackHub({
  pack,
  exam,
  latestAttempt,
  language = "de",
  onEnterMode,
  mastery = null,
}: {
  pack: StudyPack;
  exam: PackExamSummary | null;
  latestAttempt: LatestAttempt | null;
  language?: Language;
  onEnterMode: (tab: ModeTab) => void;
  mastery?: { mastered: number; total: number } | null;
}) {
  const isEn = language === "en";
  const modes = availableModes(pack);
  const cta = pickWeiterlernen(modes, latestAttempt, language);
  const cards = buildModeCards(pack, modes, language);
  const countdown = exam ? countdownInfo(exam.exam_date) : null;
  const lastPct = latestAttempt
    ? Math.round(
        (latestAttempt.correct_count / latestAttempt.total_questions) * 100,
      )
    : null;

  return (
    <div className="space-y-8">
      {/* Situation — countdown + last quiz + content counts. Tinted icon
          chips replace the previous emoji marks. */}
      {(exam || latestAttempt || (mastery && mastery.total > 0)) && (
        <section
          className="rounded-2xl border p-4 sm:p-5"
          style={{
            background: "var(--color-surface)",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--color-text-faint)" }}
          >
            {isEn ? "Your situation" : "Deine Situation"}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {exam && countdown && (
              <SituationStat
                icon={Clock}
                chipBg="rgba(242, 163, 60, 0.14)"
                chipFg="var(--color-amber)"
                label={isEn ? "Until exam" : "Bis zur Klausur"}
                value={countdown.label}
                valueColor="var(--color-amber)"
                sub={exam.title}
                subColor={examRgba(exam.color, 0.9)}
              />
            )}
            {latestAttempt && lastPct !== null && (
              <SituationStat
                icon={Trophy}
                chipBg={
                  lastPct >= 80
                    ? "rgba(79, 209, 165, 0.14)"
                    : lastPct >= 60
                      ? "rgba(242, 163, 60, 0.14)"
                      : "rgba(242, 132, 92, 0.14)"
                }
                chipFg={
                  lastPct >= 80
                    ? "var(--color-cat-teal)"
                    : lastPct >= 60
                      ? "var(--color-amber)"
                      : "var(--color-cat-coral)"
                }
                label={isEn ? "Last quiz" : "Letztes Quiz"}
                value={`${lastPct}%`}
                valueColor={
                  lastPct >= 80
                    ? "var(--color-cat-teal)"
                    : lastPct >= 60
                      ? "var(--color-amber)"
                      : "var(--color-cat-coral)"
                }
                sub={`${latestAttempt.correct_count}/${latestAttempt.total_questions} · ${formatRelative(latestAttempt.created_at, language)}`}
              />
            )}
            <SituationStat
              icon={BookOpen}
              chipBg="rgba(110, 128, 242, 0.14)"
              chipFg="var(--color-primary-bright)"
              label={isEn ? "Content" : "Inhalt"}
              value={`${pack.flashcards.length} ${isEn ? "cards" : "Karten"}`}
              sub={isEn
                ? `${pack.overview.topics.reduce((n, t) => n + t.concepts.length, 0)} concepts`
                : `${pack.overview.topics.reduce((n, t) => n + t.concepts.length, 0)} Konzepte`}
            />
            {mastery && mastery.total > 0 && (
              <SituationStat
                icon={GraduationCap}
                chipBg="rgba(79, 209, 165, 0.14)"
                chipFg="var(--color-cat-teal)"
                label={isEn ? "Mastery" : "Beherrscht"}
                value={`${Math.round((mastery.mastered / mastery.total) * 100)}%`}
                valueColor="var(--color-cat-teal)"
                sub={
                  isEn
                    ? `${mastery.mastered} of ${mastery.total} mastered`
                    : `${mastery.mastered} von ${mastery.total} beherrscht`
                }
              />
            )}
          </div>
        </section>
      )}

      {/* Primary Weiterlernen CTA — single decisive deep-indigo button. */}
      <section>
        <PrimaryCTAButton
          size="lg"
          fullWidth
          onClick={() => onEnterMode(cta.target)}
          eyebrow={
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={12} strokeWidth={2} aria-hidden />
              {isEn ? "Continue learning" : "Weiterlernen"}
            </span>
          }
          subtitle={cta.sub}
          trailingIcon={ArrowRight}
        >
          {cta.label}
        </PrimaryCTAButton>
      </section>

      {/* Mode launcher — vertical list of rows with tinted icon chips. */}
      <section>
        <h2
          className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--color-text-faint)" }}
        >
          {isEn ? "Pick a study mode" : "Wähl deinen Lernmodus"}
        </h2>
        <ul className="flex flex-col gap-2">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <li key={c.tab}>
                <button
                  type="button"
                  onClick={() => onEnterMode(c.tab)}
                  className="mode-row group flex w-full items-center gap-3.5 text-left transition"
                  style={{
                    background: "#141930",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "12px",
                    padding: "13px 15px",
                  }}
                >
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                    style={{ background: CHIP_BG[c.tone] }}
                  >
                    <Icon
                      size={18}
                      strokeWidth={1.75}
                      color={CHIP_FG[c.tone]}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-[14px] leading-tight"
                      style={{
                        color: "var(--color-text)",
                        fontFamily: "var(--font-display)",
                        fontWeight: 600,
                      }}
                    >
                      {c.title}
                    </div>
                    <div
                      className="mt-0.5 truncate text-[12px]"
                      style={{ color: "#8C95B6" }}
                    >
                      {c.sub}
                    </div>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <div
                      className="text-[11px] font-medium tabular-nums"
                      style={{ color: "#6F7799" }}
                    >
                      {c.count}
                    </div>
                  </div>
                  <ArrowRight
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden
                    className="shrink-0 transition-transform group-hover:translate-x-0.5"
                    color="#5A627F"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function SituationStat({
  icon: Icon,
  chipBg,
  chipFg,
  label,
  value,
  valueColor,
  sub,
  subColor,
}: {
  icon: LucideIcon;
  chipBg: string;
  chipFg: string;
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: chipBg }}
      >
        <Icon size={16} strokeWidth={1.9} color={chipFg} />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className="text-[10.5px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--color-text-faint)" }}
        >
          {label}
        </div>
        <div
          className="mt-0.5 text-[17px] font-semibold leading-tight sm:text-[19px]"
          style={{
            color: valueColor ?? "var(--color-text)",
            fontFamily: "var(--font-display)",
          }}
        >
          {value}
        </div>
        {sub && (
          <div
            className="mt-0.5 truncate text-[12px] leading-snug"
            style={{ color: subColor ?? "var(--color-text-dim)" }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
