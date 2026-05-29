"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { QuizQuestion, StudyPack } from "@/lib/schema";
import { renderRichText } from "@/lib/richText";

type Language = "en" | "de";

const LETTERS = ["A", "B", "C", "D"] as const;

const T = (en: boolean) => ({
  q: en ? "Question" : "Frage",
  of: en ? "of" : "von",
  answered: en ? "answered" : "beantwortet",
  showTheory: en ? "View concept first" : "📖 Konzept zuerst ansehen",
  hideTheory: en ? "Hide concept" : "Konzept ausblenden",
  checkAll: en ? "Check all answers" : "Alle Antworten prüfen",
  results: en ? "Results" : "Ergebnis",
  correct: en ? "Correct" : "Richtig",
  wrong: en ? "Wrong" : "Falsch",
  skipped: en ? "Skipped" : "Übersprungen",
  verdictPass: en ? "Bestanden — du bist drin." : "Bestanden — du bist drin.",
  verdictMid: en ? "Borderline. Noch ein paar Lücken." : "Grenzwertig. Noch ein paar Lücken.",
  verdictFail: en ? "Noch nicht durch. Schau die Erklärungen an." : "Noch nicht durch. Schau die Erklärungen an.",
  filterAll: en ? "All" : "Alle",
  filterWrong: en ? "❌ Wrong only" : "❌ Nur falsche",
  restart: en ? "🔄 New quiz" : "🔄 Neues Quiz",
  explanationLabel: en ? "Explanation" : "Erklärung",
});

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildConceptIndex(overview: StudyPack["overview"]) {
  const map = new Map<
    string,
    { term: string; definition: string; examRelevance?: string; author?: string }
  >();
  for (const topic of overview.topics) {
    for (const c of topic.concepts) {
      map.set(c.term.toLowerCase(), {
        term: c.term,
        definition: c.definition,
        examRelevance: c.examRelevance,
        author: c.author,
      });
    }
  }
  return map;
}

export default function QuizView({
  questions,
  overview,
  language = "de",
}: {
  questions: QuizQuestion[];
  overview: StudyPack["overview"];
  language?: Language;
}) {
  const isEn = language === "en";
  const labels = T(isEn);
  const conceptIndex = useMemo(() => buildConceptIndex(overview), [overview]);

  const [deck, setDeck] = useState<QuizQuestion[]>(() => shuffle(questions));
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);
  const [filter, setFilter] = useState<"all" | "wrong">("all");
  const [openTheory, setOpenTheory] = useState<Record<string, boolean>>({});
  const resultsRef = useRef<HTMLDivElement | null>(null);

  // If the parent ever swaps questions, reset state.
  useEffect(() => {
    setDeck(shuffle(questions));
    setAnswers({});
    setChecked(false);
    setFilter("all");
    setOpenTheory({});
  }, [questions]);

  if (deck.length === 0) {
    return (
      <p className="text-[14px]" style={{ color: "var(--color-ln-mute)" }}>
        {isEn ? "No quiz questions available." : "Keine Quiz-Fragen verfügbar."}
      </p>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const progressPct = Math.round((answeredCount / deck.length) * 100);

  const correctCount = checked
    ? deck.filter((q) => answers[q.id] === q.correctIndex).length
    : 0;
  const wrongCount = checked
    ? deck.filter(
        (q) => q.id in answers && answers[q.id] !== q.correctIndex,
      ).length
    : 0;
  const skippedCount = checked ? deck.length - answeredCount : 0;
  const scorePct = checked ? Math.round((correctCount / deck.length) * 100) : 0;
  const verdict =
    scorePct >= 75 ? labels.verdictPass : scorePct >= 50 ? labels.verdictMid : labels.verdictFail;
  const verdictColor =
    scorePct >= 75 ? "#34d399" : scorePct >= 50 ? "#fbbf24" : "#fb7185";

  const visibleDeck =
    checked && filter === "wrong"
      ? deck.filter((q) => answers[q.id] !== q.correctIndex)
      : deck;

  const select = (qid: string, idx: number) => {
    if (checked) return;
    setAnswers((prev) => ({ ...prev, [qid]: idx }));
  };

  const checkAll = () => {
    setChecked(true);
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const restart = () => {
    setDeck(shuffle(questions));
    setAnswers({});
    setChecked(false);
    setFilter("all");
    setOpenTheory({});
  };

  const toggleTheory = (qid: string) =>
    setOpenTheory((prev) => ({ ...prev, [qid]: !prev[qid] }));

  return (
    <div>
      {/* Progress / status bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[160px]">
          <div
            className="h-1.5 overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-400"
              style={{
                width: `${checked ? scorePct : progressPct}%`,
                background: checked
                  ? `linear-gradient(90deg, ${verdictColor}, ${verdictColor}aa)`
                  : "linear-gradient(90deg, var(--color-ln-cyan), var(--color-ln-violet))",
              }}
            />
          </div>
          <div
            className="mt-1.5 text-[11.5px]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            {checked
              ? `${correctCount}/${deck.length} ${labels.correct.toLowerCase()} (${scorePct}%)`
              : `${answeredCount}/${deck.length} ${labels.answered}`}
          </div>
        </div>
        {checked && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter("all")}
              className={
                "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition " +
                (filter === "all"
                  ? "border-[color:var(--color-ln-cyan)] text-white"
                  : "border-white/10 text-white/55 hover:text-white")
              }
            >
              {labels.filterAll}
            </button>
            <button
              onClick={() => setFilter("wrong")}
              disabled={wrongCount === 0}
              className={
                "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 " +
                (filter === "wrong"
                  ? "border-[#fb7185] text-white"
                  : "border-white/10 text-white/55 hover:text-white")
              }
            >
              {labels.filterWrong}
            </button>
          </div>
        )}
      </div>

      {/* Results panel (shown after check) */}
      {checked && (
        <div
          ref={resultsRef}
          className="mb-6 rounded-2xl border p-5 sm:p-6"
          style={{
            background: "rgba(20,22,28,0.6)",
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div
                className="text-[11px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {labels.results}
              </div>
              <div
                className="mt-1 text-[44px] font-extrabold leading-none sm:text-[56px]"
                style={{ color: verdictColor }}
              >
                {scorePct}%
              </div>
              <div
                className="mt-2 text-[13.5px] font-semibold"
                style={{ color: verdictColor }}
              >
                {verdict}
              </div>
            </div>
            <div className="flex gap-4 text-center sm:gap-6">
              <ScoreStat n={correctCount} label={labels.correct} color="#34d399" />
              <ScoreStat n={wrongCount} label={labels.wrong} color="#fb7185" />
              <ScoreStat
                n={skippedCount}
                label={labels.skipped}
                color="rgba(255,255,255,0.5)"
              />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={restart}
              className="rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[#0F1535] transition hover:bg-white/90"
            >
              {labels.restart}
            </button>
          </div>
        </div>
      )}

      {/* Questions */}
      <ol className="space-y-3 sm:space-y-4">
        {visibleDeck.map((q, displayIdx) => {
          const realIdx = deck.findIndex((d) => d.id === q.id);
          const picked = answers[q.id];
          const isAnswered = picked !== undefined;
          const isCorrect = checked && picked === q.correctIndex;
          const isWrong = checked && isAnswered && picked !== q.correctIndex;
          const concept = q.conceptRef
            ? conceptIndex.get(q.conceptRef.toLowerCase())
            : undefined;
          const theoryOpen = !!openTheory[q.id];

          return (
            <li
              key={q.id}
              className="rounded-2xl border p-4 transition-colors sm:p-5"
              style={{
                background: "rgba(20,22,28,0.55)",
                borderColor: isCorrect
                  ? "rgba(52,211,153,0.45)"
                  : isWrong
                    ? "rgba(251,113,133,0.45)"
                    : "rgba(255,255,255,0.08)",
              }}
            >
              <div
                className="mb-2 flex flex-wrap items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                <span>
                  {labels.q} {realIdx + 1} {labels.of} {deck.length}
                </span>
                {q.category && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[9.5px]"
                    style={{
                      background: "rgba(91,184,216,0.12)",
                      color: "var(--color-ln-cyan)",
                    }}
                  >
                    {q.category}
                  </span>
                )}
              </div>
              <div
                className="text-[15px] font-semibold leading-snug text-white sm:text-[16px]"
                dangerouslySetInnerHTML={{ __html: renderRichText(q.stem) }}
              />

              {concept && !checked && (
                <button
                  onClick={() => toggleTheory(q.id)}
                  className={
                    "mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition " +
                    (theoryOpen
                      ? "border-[color:var(--color-ln-violet)] bg-[color:var(--color-ln-violet)]/10 text-white"
                      : "border-white/15 text-white/65 hover:text-white")
                  }
                >
                  {theoryOpen ? labels.hideTheory : labels.showTheory}
                  {!theoryOpen && (
                    <span
                      className="ml-1 rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em]"
                      style={{
                        background: "rgba(154,140,224,0.16)",
                        color: "var(--color-ln-violet)",
                      }}
                    >
                      {concept.term}
                    </span>
                  )}
                </button>
              )}

              {concept && theoryOpen && !checked && (
                <div
                  className="mt-2 rounded-lg border p-3 text-[12.5px] leading-relaxed"
                  style={{
                    background: "rgba(154,140,224,0.06)",
                    borderColor: "rgba(154,140,224,0.3)",
                    color: "rgba(255,255,255,0.78)",
                  }}
                >
                  <div
                    className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: "var(--color-ln-violet)" }}
                  >
                    {concept.term}
                    {concept.author && (
                      <span
                        className="ml-2 font-normal"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                      >
                        {concept.author}
                      </span>
                    )}
                  </div>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderRichText(concept.definition),
                    }}
                  />
                  {concept.examRelevance && (
                    <div
                      className="mt-2 text-[11.5px]"
                      style={{ color: "rgba(255,255,255,0.55)" }}
                      dangerouslySetInnerHTML={{
                        __html: renderRichText(concept.examRelevance),
                      }}
                    />
                  )}
                </div>
              )}

              <div className="mt-3 space-y-1.5">
                {q.options.map((opt, oi) => {
                  const selected = picked === oi;
                  const showCorrect = checked && oi === q.correctIndex;
                  const showWrong = checked && selected && oi !== q.correctIndex;

                  let border = "rgba(255,255,255,0.1)";
                  let bg = "transparent";
                  let mark: string | null = null;
                  let markColor = "transparent";

                  if (showCorrect) {
                    border = "rgba(52,211,153,0.55)";
                    bg = "rgba(52,211,153,0.1)";
                    mark = "✓";
                    markColor = "#34d399";
                  } else if (showWrong) {
                    border = "rgba(251,113,133,0.55)";
                    bg = "rgba(251,113,133,0.1)";
                    mark = "✗";
                    markColor = "#fb7185";
                  } else if (selected && !checked) {
                    border = "rgba(91,184,216,0.55)";
                    bg = "rgba(91,184,216,0.08)";
                  }

                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => select(q.id, oi)}
                      disabled={checked}
                      className={
                        "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-[13.5px] leading-snug transition disabled:cursor-default sm:px-4 sm:text-[14px] " +
                        (!checked ? "hover:border-white/30" : "")
                      }
                      style={{
                        background: bg,
                        borderColor: border,
                        color: "rgba(255,255,255,0.92)",
                      }}
                    >
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                        style={{
                          background: selected
                            ? "rgba(91,184,216,0.18)"
                            : "rgba(255,255,255,0.06)",
                          color: selected
                            ? "var(--color-ln-cyan)"
                            : "rgba(255,255,255,0.7)",
                        }}
                      >
                        {LETTERS[oi]}
                      </span>
                      <span
                        className="flex-1"
                        dangerouslySetInnerHTML={{ __html: renderRichText(opt) }}
                      />
                      {mark && (
                        <span
                          className="ml-1 mt-0.5 shrink-0 text-[14px] font-bold"
                          style={{ color: markColor }}
                        >
                          {mark}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {checked && (
                <div
                  className="mt-3 rounded-lg border-l-[3px] border-y border-r px-3.5 py-2.5 text-[12.5px] leading-relaxed"
                  style={{
                    background: "rgba(91,184,216,0.04)",
                    borderLeftColor: "var(--color-ln-cyan)",
                    borderTopColor: "rgba(91,184,216,0.15)",
                    borderRightColor: "rgba(91,184,216,0.15)",
                    borderBottomColor: "rgba(91,184,216,0.15)",
                    color: "rgba(255,255,255,0.78)",
                  }}
                >
                  <div
                    className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: "var(--color-ln-cyan)" }}
                  >
                    {labels.explanationLabel}
                  </div>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderRichText(q.explanation),
                    }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Bottom action bar */}
      {!checked && (
        <div className="sticky bottom-3 z-10 mt-6 flex justify-center">
          <button
            onClick={checkAll}
            disabled={answeredCount === 0}
            className="rounded-full bg-white px-6 py-3 text-[14px] font-bold text-[#0F1535] shadow-lg shadow-black/30 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {labels.checkAll}
            <span
              className="ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold"
              style={{
                background:
                  answeredCount === deck.length
                    ? "rgba(52,211,153,0.18)"
                    : "rgba(15,21,53,0.1)",
                color:
                  answeredCount === deck.length ? "#34d399" : "rgba(15,21,53,0.6)",
              }}
            >
              {answeredCount}/{deck.length}
            </span>
          </button>
        </div>
      )}

      {checked && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={restart}
            className="rounded-full border border-white/15 px-5 py-2.5 text-[13px] font-semibold text-white/80 transition hover:text-white"
          >
            {labels.restart}
          </button>
        </div>
      )}
    </div>
  );
}

function ScoreStat({
  n,
  label,
  color,
}: {
  n: number;
  label: string;
  color: string;
}) {
  return (
    <div>
      <div className="text-[24px] font-bold sm:text-[28px]" style={{ color }}>
        {n}
      </div>
      <div
        className="text-[10px] font-bold uppercase tracking-[0.1em]"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        {label}
      </div>
    </div>
  );
}
