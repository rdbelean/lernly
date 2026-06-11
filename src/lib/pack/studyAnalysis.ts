// Pure, dependency-free helpers for the pack study experience: splitting a
// flashcard answer into body + mnemonic, and building the per-topic "what saß,
// what didn't" breakdown for the quiz/flashcard completion screens. No React /
// schema imports → unit-testable and reusable across components.

export type BreakdownRow = { name: string; correct: number; total: number };
export type Tone = "weak" | "warn" | "strong";

// The flashcard generator emits answers as: <answer> <br> <explanation+example>
// <br> <strong>Mnemonic '…'</strong> … (prompts.ts TASK_CARDS). Pull the
// trailing mnemonic segment into its own block so the UI can separate it.
// Falls back to {body: answer, mnemonic: null} when no mnemonic is present (or
// when the mnemonic is the very first segment — nothing to separate from).
const MNEMONIC_RE = /^\s*(?:<[^>]+>\s*)*(mnemonic|merkhilfe|eselsbr)/i;

export function splitMnemonic(answer: string): {
  body: string;
  mnemonic: string | null;
} {
  if (!answer) return { body: "", mnemonic: null };
  const segments = answer.split(/<br\s*\/?>/i);
  const idx = segments.findIndex((s) => MNEMONIC_RE.test(s));
  if (idx <= 0) return { body: answer, mnemonic: null };
  const body = segments.slice(0, idx).join("<br>").trim();
  const mnemonic = segments.slice(idx).join("<br>").trim();
  return { body: body || answer, mnemonic: mnemonic || null };
}

export function accuracy(row: BreakdownRow): number {
  return row.total > 0 ? row.correct / row.total : 0;
}

export function rowTone(row: BreakdownRow): Tone {
  const a = accuracy(row);
  if (a < 0.5) return "weak";
  if (a < 0.75) return "warn";
  return "strong";
}

// Weakest topics first (lowest accuracy), bigger topics breaking ties — so the
// student sees what to study first.
function sortWeakestFirst(rows: BreakdownRow[]): BreakdownRow[] {
  return [...rows].sort((a, b) => {
    const d = accuracy(a) - accuracy(b);
    return d !== 0 ? d : b.total - a.total;
  });
}

// Quiz/exam: group questions by category; correct = answer matched correctIndex.
// Skipped/wrong both count against the topic (= still to study).
export function simulatorTopicRows(
  questions: { category?: string | null; correctIndex: number }[],
  answers: (number | null)[],
  uncategorized = "Allgemein",
): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  questions.forEach((q, i) => {
    const name = (q.category && q.category.trim()) || uncategorized;
    let row = map.get(name);
    if (!row) {
      row = { name, correct: 0, total: 0 };
      map.set(name, row);
    }
    row.total++;
    if (answers[i] != null && answers[i] === q.correctIndex) row.correct++;
  });
  return sortWeakestFirst([...map.values()]);
}

// Flashcards: group by category; correct = card mastered ("known").
export function flashcardTopicRows(
  items: { category?: string | null; status: string }[],
  uncategorized = "Allgemein",
): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  for (const it of items) {
    const name = (it.category && it.category.trim()) || uncategorized;
    let row = map.get(name);
    if (!row) {
      row = { name, correct: 0, total: 0 };
      map.set(name, row);
    }
    row.total++;
    if (it.status === "known") row.correct++;
  }
  return sortWeakestFirst([...map.values()]);
}

// The 1–2 weakest, not-yet-perfect topics — for the "Jetzt dran: …" focus hint.
export function weakestNames(rows: BreakdownRow[], n = 2): string[] {
  return rows
    .filter((r) => accuracy(r) < 1)
    .slice(0, n)
    .map((r) => r.name);
}
