"use client";

import type { StudyPack } from "@/lib/schema";
import {
  countdownInfo,
  countdownToneRgba,
  examRgba,
} from "@/lib/exams";
import type { PackExamSummary } from "@/components/pack/PackHeader";

// =========================================================================
// PackHub — the landing view of a pack. Replaces "open straight into a tab"
// with "orient → pick mode → study → return home". Model = Quizlet's set
// page: situation + primary CTA + mode launcher cards.
// =========================================================================

type Language = "en" | "de";

// Subset of the Tab union from PackView so we don't create a circular dep.
// PackView controls the actual switch via onEnterMode(tab).
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

// Smart "Weiterlernen" — picks the most useful next mode given the data
// we have. Priority cascade is intentionally simple (no scheduler in V1):
//   1. Quiz available + a past attempt with weak topics → "Schwächen üben"
//      (still enters Übungsklausur; the re-practice button lives inside).
//   2. Quiz available, no prior attempt → "Übungsklausur starten".
//   3. Essay-format pack with predictions → "Aufsatz-Plan ansehen".
//   4. Fallback → "Karteikarten durchgehen".
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

type ModeCard = {
  tab: ModeTab;
  icon: string;
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
      icon: "🧠",
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
      icon: "✍️",
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
      icon: "🃏",
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
      icon: "📌",
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
      icon: "🎯",
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
      icon: "📝",
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
}: {
  pack: StudyPack;
  exam: PackExamSummary | null;
  latestAttempt: LatestAttempt | null;
  language?: Language;
  onEnterMode: (tab: ModeTab) => void;
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
      {/* Situation — countdown + last quiz + content counts. Shown only if
          there's at least one signal worth surfacing. */}
      {(exam || latestAttempt) && (
        <section
          className="rounded-2xl border p-4 sm:p-5"
          style={{
            background: "rgba(20,22,28,0.5)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            {isEn ? "Your situation" : "Deine Situation"}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr]">
            {exam && countdown && (
              <SituationStat
                icon="⏱"
                label={isEn ? "Until exam" : "Bis zur Klausur"}
                value={countdown.label}
                valueColor={countdownToneRgba(countdown.tone, 1)}
                sub={exam.title}
                subColor={examRgba(exam.color, 0.9)}
              />
            )}
            {latestAttempt && lastPct !== null && (
              <SituationStat
                icon="📊"
                label={isEn ? "Last quiz" : "Letztes Quiz"}
                value={`${lastPct}%`}
                valueColor={
                  lastPct >= 80
                    ? "#34d399"
                    : lastPct >= 60
                      ? "#fbbf24"
                      : "#fb7185"
                }
                sub={`${latestAttempt.correct_count}/${latestAttempt.total_questions} · ${formatRelative(latestAttempt.created_at, language)}`}
              />
            )}
            <SituationStat
              icon="📚"
              label={isEn ? "Content" : "Inhalt"}
              value={`${pack.flashcards.length} ${isEn ? "cards" : "Karten"}`}
              sub={isEn
                ? `${pack.overview.topics.reduce((n, t) => n + t.concepts.length, 0)} concepts`
                : `${pack.overview.topics.reduce((n, t) => n + t.concepts.length, 0)} Konzepte`}
            />
          </div>
        </section>
      )}

      {/* Primary Weiterlernen CTA — bold, single button, picks the
          smartest mode given available data. */}
      <section>
        <button
          type="button"
          onClick={() => onEnterMode(cta.target)}
          className="group flex w-full items-center justify-between gap-4 rounded-2xl bg-white px-5 py-4 text-left transition hover:bg-white/95 sm:px-6 sm:py-5"
        >
          <div className="min-w-0">
            <div
              className="text-[11px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "rgba(15,21,53,0.55)" }}
            >
              ✦ {isEn ? "Continue learning" : "Weiterlernen"}
            </div>
            <div className="mt-1 text-[17px] font-extrabold leading-snug text-[#0F1535] sm:text-[19px]">
              {cta.label}
            </div>
            <div
              className="mt-0.5 text-[12.5px] leading-snug"
              style={{ color: "rgba(15,21,53,0.65)" }}
            >
              {cta.sub}
            </div>
          </div>
          <span
            aria-hidden
            className="shrink-0 text-[20px] text-[#0F1535] transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </button>
      </section>

      {/* Mode launcher — big tappable cards, one per available mode. */}
      <section>
        <h2
          className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em]"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          {isEn ? "Pick a study mode" : "Wähl deinen Lernmodus"}
        </h2>
        <div
          className="grid gap-2.5"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {cards.map((c) => (
            <button
              key={c.tab}
              type="button"
              onClick={() => onEnterMode(c.tab)}
              className="group flex flex-col gap-2 rounded-2xl border bg-black/15 p-4 text-left transition hover:bg-black/25 hover:-translate-y-0.5 sm:p-5"
              style={{
                borderColor: "rgba(255,255,255,0.1)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[28px] leading-none" aria-hidden>
                  {c.icon}
                </span>
                <span
                  aria-hidden
                  className="text-[14px] text-white/40 transition group-hover:text-white/70"
                >
                  →
                </span>
              </div>
              <div className="text-[15.5px] font-bold text-white">{c.title}</div>
              <div
                className="text-[12.5px] leading-snug"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                {c.sub}
              </div>
              <div
                className="mt-1 text-[11px] font-semibold tabular-nums"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                {c.count}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function SituationStat({
  icon,
  label,
  value,
  valueColor,
  sub,
  subColor,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div>
      <div
        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em]"
        style={{ color: "rgba(255,255,255,0.55)" }}
      >
        <span aria-hidden>{icon}</span>
        {label}
      </div>
      <div
        className="mt-1 text-[18px] font-extrabold leading-tight sm:text-[20px]"
        style={{ color: valueColor ?? "white" }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="mt-0.5 truncate text-[12px] leading-snug"
          style={{ color: subColor ?? "rgba(255,255,255,0.5)" }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
