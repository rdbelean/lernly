import { ListChecks, PenLine, FileText, type LucideIcon } from "lucide-react";
import type { ExamType } from "@/lib/schema";

// Essay generation isn't shipped yet — the picker shows it as "bald verfügbar".
export const ESSAY_ENABLED = false;

export type ExamFormatOption = {
  value: ExamType;
  /** Full title for the in-app picker cards. */
  title: string;
  /** Compact label for the landing try-widget chips. */
  shortLabel: string;
  description: string;
  Icon: LucideIcon;
  locked: boolean;
};

// SINGLE SOURCE OF TRUTH for the exam-format picker — used by BOTH the in-app
// /dashboard/new picker and the anonymous landing try-widget, so the two can
// never drift apart again. Only the three formats that produce real, distinct
// practice content are offered. `oral` and `open_book` remain in the schema
// enum so legacy packs still render, but they are intentionally NOT shown here
// (a click on a format that doesn't exist = confusion on the user's first action).
// Order matters: MC first (and default-selected), Offene Fragen, Essay (locked) last.
export const EXAM_FORMATS: ExamFormatOption[] = [
  {
    value: "multiple_choice",
    title: "Multiple Choice",
    shortLabel: "Multiple Choice",
    description: "Kniffliges MC-Quiz, das echtes Verstehen testet",
    Icon: ListChecks,
    locked: false,
  },
  {
    value: "open_questions",
    title: "Offene Fragen",
    shortLabel: "Offene Fragen",
    description: "Offene Fragen mit Musterantworten zum Selbstabfragen",
    Icon: PenLine,
    locked: false,
  },
  {
    value: "essay",
    title: "Essay (Klausur)",
    shortLabel: "Essay",
    description: "Essay-Baupläne — kommt bald",
    Icon: FileText,
    locked: !ESSAY_ENABLED,
  },
];

/** The default selected format (Multiple Choice). */
export const DEFAULT_EXAM_FORMAT: ExamType = "multiple_choice";
