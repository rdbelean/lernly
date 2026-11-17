"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { evaluateCalcInput, type CalcEvaluation } from "@/lib/study/calcCheck";
import {
  getServerActiveCourseSnapshot,
  readActiveCourseSnapshot,
  subscribeActiveCourse,
} from "@/lib/study/courseStore";
import { markExerciseCompleted } from "@/lib/study/storage";
import type { CalcExercise } from "@/lib/study/types";

type CalcExerciseViewProps = {
  exercises?: readonly CalcExercise[];
  initialIndex?: number;
  initialInput?: string;
  initialChecked?: boolean;
  interactive?: boolean;
  closeHref?: string;
};

function renderBoldInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export function CalcExerciseView({
  exercises: explicitExercises,
  initialIndex = 0,
  initialInput = "",
  initialChecked = false,
  interactive = true,
  closeHref = "/heute",
}: CalcExerciseViewProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const storedCourse = useSyncExternalStore(
    subscribeActiveCourse,
    readActiveCourseSnapshot,
    getServerActiveCourseSnapshot,
  );
  const exercises = explicitExercises ?? storedCourse.course.exercises;

  const [index, setIndex] = useState(initialIndex);
  const [input, setInput] = useState(initialInput);
  const [evaluation, setEvaluation] = useState<CalcEvaluation | null>(() => {
    if (initialChecked && exercises[initialIndex]) {
      return evaluateCalcInput(exercises[initialIndex], initialInput);
    }
    return null;
  });
  const [solvedCount, setSolvedCount] = useState(0);

  const isFinished = index >= exercises.length;
  const exercise = isFinished ? undefined : exercises[index];
  const progressPct =
    exercises.length > 0
      ? Math.min(100, ((index + 1) / exercises.length) * 100)
      : 0;

  useEffect(() => {
    if (interactive && !isFinished && !evaluation) {
      inputRef.current?.focus();
    }
  }, [evaluation, index, interactive, isFinished]);

  useEffect(() => {
    if (!interactive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        router.push(closeHref);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeHref, interactive, router]);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (!exercise) return;
      const result = evaluateCalcInput(exercise, input);
      setEvaluation(result);
      if (result.kind === "correct") {
        setSolvedCount((count) => count + 1);
        if (interactive) {
          markExerciseCompleted(exercise.id);
        }
      }
    },
    [exercise, input, interactive],
  );

  const handleNext = useCallback(() => {
    setIndex((current) => current + 1);
    setInput("");
    setEvaluation(null);
  }, []);

  const handleRestart = useCallback(() => {
    setIndex(0);
    setInput("");
    setEvaluation(null);
    setSolvedCount(0);
  }, []);

  if (isFinished || !exercise) {
    return (
      <section className="mx-auto flex w-full max-w-[780px] flex-col items-start px-8 py-14 sm:px-12">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-card bg-ok-bg text-ok-ink">
          <Check className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="mt-6 font-display text-[40px] font-bold leading-[1.08] tracking-[-0.03em] text-text sm:text-[48px]">
          Rechenblock fertig
          <span
            aria-hidden="true"
            className="ml-1 inline-block h-[0.16em] w-[0.16em] bg-primary align-baseline"
          />
        </h1>
        <p className="mt-4 text-[16px] text-text-dim">
          {solvedCount} von {exercises.length} Aufgaben direkt richtig gelöst.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={closeHref}
            className="inline-flex h-[46px] items-center gap-2 rounded-btn bg-primary px-6 text-[14px] font-semibold text-on-primary transition-colors hover:bg-primary-press"
          >
            <span>Zurück zu Heute</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex h-[46px] items-center gap-2 rounded-btn border border-line bg-surface px-5 text-[14px] font-semibold text-text transition-colors hover:bg-surface-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Nochmal rechnen</span>
          </button>
        </div>
      </section>
    );
  }

  const showSolution =
    evaluation !== null &&
    (evaluation.kind === "correct" || evaluation.kind === "wrong");

  const inputColorClass =
    evaluation?.kind === "wrong"
      ? "text-err-ink"
      : evaluation?.kind === "correct"
        ? "text-ok-ink"
        : "text-text";

  const underlineClass =
    evaluation?.kind === "wrong"
      ? "border-b-err-ink"
      : evaluation?.kind === "correct"
        ? "border-b-ok-ink"
        : "border-b-text";

  return (
    <div className="mx-auto w-full max-w-[1120px] px-8 py-8 sm:px-12 sm:py-10 lg:px-14">
      {/* Top progress header */}
      <header>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 pb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-text">
            Aufgabe {index + 1} / {exercises.length}
          </p>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
            {exercise.topicLabel}
          </p>
          <div className="flex justify-end">
            {interactive ? (
              <Link
                href={closeHref}
                aria-label="Rechenaufgabe schließen"
                className="inline-flex h-8 w-8 items-center justify-center text-text transition-opacity hover:opacity-65"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Link>
            ) : (
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 items-center justify-center text-text"
              >
                <X className="h-5 w-5" />
              </span>
            )}
          </div>
        </div>

        <div className="relative h-[1px] w-full bg-line">
          <div
            className="absolute left-0 top-[-1px] h-[2px] bg-text transition-[width] duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {/* Main content: 2 columns on Desktop, stacked on iPad */}
      <div className="mt-10 grid grid-cols-1 gap-12 sm:mt-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:gap-16">
        {/* Left: Problem headline + clean hairline parameter list */}
        <section aria-labelledby="calc-heading">
          <h1
            id="calc-heading"
            className="font-display text-[44px] font-bold leading-[1.05] tracking-[-0.035em] text-text sm:text-[54px] lg:text-[56px]"
          >
            {exercise.headlineLine1}{" "}
            <br className="hidden lg:inline" />
            {exercise.headlineLine2}
            <span
              aria-hidden="true"
              className="ml-[0.06em] inline-block h-[0.155em] w-[0.155em] bg-primary align-baseline"
            />
          </h1>

          <dl className="mt-8 divide-y divide-line border-t border-t-text border-b border-b-line">
            {exercise.parameters.map((param) => (
              <div
                key={param.label}
                className="flex items-baseline justify-between gap-4 py-3.5 text-[15px]"
              >
                <dt className="text-text-dim">{param.label}</dt>
                <dd className="font-bold text-text">{param.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Right: Numeric input, ink Prüfen button, feedback, solution steps */}
        <section aria-label="Antwort und Lösungsweg">
          <form onSubmit={handleSubmit}>
            <div className="flex items-end gap-5">
              <div
                className={`flex flex-1 items-baseline gap-2 border-b-2 pb-2.5 transition-colors ${underlineClass}`}
              >
                <label htmlFor="calc-answer" className="sr-only">
                  Dein Ergebnis in {exercise.unit}
                </label>
                <input
                  ref={inputRef}
                  id="calc-answer"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0,0"
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value);
                    if (evaluation) {
                      setEvaluation(null);
                    }
                  }}
                  className={`w-full min-w-0 bg-transparent font-display text-[50px] font-bold leading-none tracking-[-0.03em] outline-none placeholder:text-text-faint/35 sm:text-[58px] ${inputColorClass}`}
                />
                <span className="shrink-0 text-[18px] font-medium text-text-dim sm:text-[20px]">
                  {exercise.unit}
                </span>
              </div>

              <button
                type="submit"
                className="inline-flex h-[46px] shrink-0 items-center justify-center rounded-btn bg-text px-7 text-[14px] font-semibold text-on-primary transition-opacity hover:opacity-88 active:opacity-80"
              >
                Prüfen
              </button>
            </div>

            {evaluation ? (
              <p
                role="status"
                className={`mt-3 text-[14px] leading-[1.45] ${
                  evaluation.kind === "correct"
                    ? "text-ok-ink"
                    : "text-err-ink"
                }`}
              >
                {renderBoldInline(evaluation.feedback)}
              </p>
            ) : (
              <p className="mt-3 text-[13px] text-text-dim">
                Gib dein Ergebnis ein und drücke{" "}
                <strong className="font-semibold text-text">Enter</strong>.
              </p>
            )}
          </form>

          {showSolution ? (
            <div className="mt-8 border-t border-text pt-6">
              <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
                Lösungsweg
              </h2>

              <ol className="mt-3 divide-y divide-line border-b border-line">
                {exercise.steps.map((step) => (
                  <li
                    key={step.num}
                    className="grid grid-cols-[24px_1fr] items-baseline gap-3 py-3.5 text-[15px] text-text"
                  >
                    <span className="text-[12px] font-medium text-text-dim">
                      {step.num}
                    </span>
                    <span>{renderBoldInline(step.text)}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-7 flex items-end justify-between gap-4">
                <span className="pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ok-ink">
                  Ergebnis
                </span>
                <p className="font-display text-[54px] font-bold leading-none tracking-[-0.035em] text-ok-ink sm:text-[64px]">
                  {exercise.formattedAnswer}
                </p>
              </div>

              <div className="mt-10 lg:mt-16">
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-btn bg-primary px-6 text-[15px] font-semibold text-on-primary transition-colors hover:bg-primary-press active:bg-primary-press"
                >
                  <span>
                    {index + 1 < exercises.length
                      ? "Nächste Aufgabe"
                      : "Abschließen"}
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
