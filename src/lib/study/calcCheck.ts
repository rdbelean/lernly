import type { CalcExercise } from "./types";

export type CalcEvaluation =
  | { kind: "empty"; feedback: string }
  | { kind: "invalid"; feedback: string }
  | { kind: "correct"; parsed: number; feedback: string }
  | { kind: "wrong"; parsed: number; feedback: string };

/**
 * Parses numeric student input supporting German comma decimals ("7,4"),
 * dot decimals ("7.4"), optional units ("7,4 %", "200 Mio."), and thousands
 * separators ("1.000,5").
 */
export function parseStudentNumber(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/[%€$]/g, "")
    .replace(/\b(?:mio|mrd|eur|p)\b\.?/gi, "")
    .replace(/\s+/g, "");

  if (!cleaned) return null;

  let normalized = cleaned;
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    // Decide which separator is the decimal separator by last position.
    if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function evaluateCalcInput(
  exercise: CalcExercise,
  rawInput: string,
): CalcEvaluation {
  if (!rawInput.trim()) {
    return {
      kind: "empty",
      feedback: "Gib zuerst dein Ergebnis ein.",
    };
  }

  const parsed = parseStudentNumber(rawInput);
  if (parsed === null) {
    return {
      kind: "invalid",
      feedback: "Bitte gib eine Zahl ein (z. B. 6,8).",
    };
  }

  if (Math.abs(parsed - exercise.correctAnswer) <= exercise.tolerance) {
    return {
      kind: "correct",
      parsed,
      feedback: "**Richtig.** Sauber gerechnet.",
    };
  }

  for (const mistake of exercise.mistakes) {
    const tol = mistake.tolerance ?? exercise.tolerance;
    if (Math.abs(parsed - mistake.match) <= tol) {
      return {
        kind: "wrong",
        parsed,
        feedback: mistake.message,
      };
    }
  }

  return {
    kind: "wrong",
    parsed,
    feedback: exercise.genericError,
  };
}
