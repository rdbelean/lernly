export const EXAM_COLORS = [
  "cyan",
  "violet",
  "sage",
  "rose",
  "amber",
  "indigo",
] as const;

export type ExamColor = (typeof EXAM_COLORS)[number];

const EXAM_COLOR_RGB: Record<ExamColor, string> = {
  cyan: "91,184,216",
  violet: "154,140,224",
  sage: "124,196,160",
  rose: "251,113,133",
  amber: "251,191,36",
  indigo: "124,120,216",
};

export function isExamColor(c: string | null | undefined): c is ExamColor {
  return !!c && (EXAM_COLORS as readonly string[]).includes(c);
}

export function examColorRgb(c: string | null | undefined): string {
  return EXAM_COLOR_RGB[isExamColor(c) ? c : "cyan"];
}

export function examRgba(c: string | null | undefined, alpha: number): string {
  return `rgba(${examColorRgb(c)},${alpha})`;
}

export type CountdownTone = "panic" | "warn" | "calm" | "past" | "undated";

export type CountdownInfo = {
  label: string;
  tone: CountdownTone;
  days: number | null;
};

// Pure copy + tone calculation. Days are integer calendar days from today
// (local) to the exam date. Tones map to color in the UI.
export function countdownInfo(examDate: string | null | undefined): CountdownInfo {
  if (!examDate) return { label: "Kein Datum", tone: "undated", days: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(examDate + "T00:00:00");
  if (Number.isNaN(target.getTime())) {
    return { label: "Kein Datum", tone: "undated", days: null };
  }
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { label: "vorbei", tone: "past", days };
  if (days === 0) return { label: "heute!", tone: "panic", days };
  if (days === 1) return { label: "morgen!", tone: "panic", days };
  if (days <= 3) return { label: `noch ${days} Tage`, tone: "panic", days };
  if (days <= 7) return { label: `noch ${days} Tage`, tone: "warn", days };
  return { label: `noch ${days} Tage`, tone: "calm", days };
}

const TONE_RGB: Record<CountdownTone, string> = {
  panic: "251,113,133",
  warn: "251,191,36",
  calm: "124,196,160",
  past: "255,255,255",
  undated: "255,255,255",
};

export function countdownToneRgba(tone: CountdownTone, alpha: number): string {
  return `rgba(${TONE_RGB[tone]},${alpha})`;
}

// Exam-date <input type="date"> formatter — emits null when input is blank.
export function formatDateForInput(d: string | null | undefined): string {
  if (!d) return "";
  // dates from Postgres come as "YYYY-MM-DD"; preserve verbatim.
  return d;
}

export function formatExamDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
