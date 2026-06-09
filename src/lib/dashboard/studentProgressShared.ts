// Pure, dependency-free types + helpers for the student progress dashboard.
// No supabase / server-only imports → unit-testable and safe to import from
// both the server aggregator and the (server-rendered) components. All date
// math is done on "YYYY-MM-DD" strings via UTC midnight, so it's deterministic
// and timezone-agnostic (the caller passes an already-Berlin-local "today").

const DAY_MS = 86_400_000;

function parseDay(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}
function dayToStr(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
// Monday (UTC ms) of the week containing `ms` — week starts Monday (DACH).
function mondayOf(ms: number): number {
  const dow = new Date(ms).getUTCDay(); // 0=Sun..6=Sat
  return ms - ((dow + 6) % 7) * DAY_MS;
}

// ---- Types ----------------------------------------------------------------

export type HeatmapDay = { day: string; count: number };
export type HeatmapCell = { day: string; count: number; inRange: boolean };
export type HeatmapGrid = { weeks: HeatmapCell[][]; maxCount: number };

export type PerTopic = Record<
  string,
  { correct: number; wrong: number; skipped: number }
>;

export type ExamProgress = {
  examId: string;
  title: string;
  color: string | null;
  examDate: string | null; // countdown computed in the component via countdownInfo
  masteredCards: number;
  totalCards: number;
  masteryPct: number; // 0..100
  questionsAnswered: number;
  topicsDone: number;
  topicsTotal: number;
  hasTopicData: boolean; // false → component hides the "Themen" segment
};

export type StudentProgress = {
  hasAnyData: boolean;
  streak: { current: number; longest: number };
  heatmap: HeatmapGrid;
  totals: {
    masteredCards: number;
    questionsAnswered: number;
    studyDays: number;
    packs: number;
  };
  exams: ExamProgress[];
  due: { count: number };
};

// ---- Pure helpers ---------------------------------------------------------

// current = consecutive study days ending today OR yesterday (so a streak you
// haven't continued *today* yet still shows). longest = max consecutive run in
// all history. `days` may be unsorted/duplicated; `today` is Berlin "YYYY-MM-DD".
export function computeStreaks(
  days: string[],
  today: string,
): { current: number; longest: number } {
  const set = new Set(days);
  if (set.size === 0) return { current: 0, longest: 0 };

  const todayMs = parseDay(today);
  let cursor: number | null = null;
  if (set.has(dayToStr(todayMs))) cursor = todayMs;
  else if (set.has(dayToStr(todayMs - DAY_MS))) cursor = todayMs - DAY_MS;
  let current = 0;
  while (cursor !== null && set.has(dayToStr(cursor))) {
    current++;
    cursor -= DAY_MS;
  }

  const sorted = [...set].map(parseDay).sort((a, b) => a - b);
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] - sorted[i - 1] === DAY_MS ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  return { current, longest };
}

// Anki-style calendar grid: `weeks` columns (Mon→Sun rows), rightmost column is
// the current week. Cells past `today` are inRange:false (rendered empty).
export function buildHeatmapGrid(
  studied: HeatmapDay[],
  today: string,
  weeks: number,
): HeatmapGrid {
  const countMap = new Map(studied.map((s) => [s.day, s.count]));
  const todayMs = parseDay(today);
  const startMonday = mondayOf(todayMs) - (weeks - 1) * 7 * DAY_MS;
  let maxCount = 0;
  for (const s of studied) if (s.count > maxCount) maxCount = s.count;

  const cols: HeatmapCell[][] = [];
  for (let c = 0; c < weeks; c++) {
    const col: HeatmapCell[] = [];
    for (let r = 0; r < 7; r++) {
      const ms = startMonday + (c * 7 + r) * DAY_MS;
      const day = dayToStr(ms);
      col.push({ day, count: countMap.get(day) ?? 0, inRange: ms <= todayMs });
    }
    cols.push(col);
  }
  return { weeks: cols, maxCount };
}

// A topic is "durch" when its latest-attempt score has correct>0 AND wrong==0.
// per_topic keys are the quiz question's `category`, which isn't guaranteed to
// equal the overview topic name → match on a normalized (trim+lowercase) key.
// Empty topicNames → {0,0} (caller hides the segment); empty perTopic → 0 done.
export function topicsDone(
  topicNames: string[],
  perTopic: PerTopic,
): { done: number; total: number } {
  const total = topicNames.length;
  if (total === 0) return { done: 0, total: 0 };
  const norm = (s: string) => s.trim().toLowerCase();
  const lookup = new Map<string, { correct: number; wrong: number; skipped: number }>();
  for (const [k, v] of Object.entries(perTopic)) lookup.set(norm(k), v);
  let done = 0;
  for (const name of topicNames) {
    const v = lookup.get(norm(name));
    if (v && v.correct > 0 && v.wrong === 0) done++;
  }
  return { done, total };
}

export function masteryPct(mastered: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((mastered / total) * 100));
}
