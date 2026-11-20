// Timeline of the landing hero story (pure, testable). The component only
// advances a clock and renders what these functions return.
export type StoryId = "plan" | "verstehen" | "ueben" | "karten";

type Focus = { from: number; key: string | null };

export const STORY: { id: StoryId; label: string; ms: number; focus: Focus[] }[] = [
  {
    id: "plan",
    label: "Klausurplan",
    ms: 4500,
    focus: [
      { from: 0, key: null },
      { from: 1400, key: "points" },
      { from: 3000, key: "next" },
    ],
  },
  {
    id: "verstehen",
    label: "Verstehen",
    ms: 6000,
    focus: [
      { from: 0, key: null },
      { from: 1300, key: "formula" },
      { from: 2800, key: "trap" },
      { from: 4400, key: "muster" },
    ],
  },
  {
    id: "ueben",
    label: "Üben",
    ms: 6000,
    focus: [
      { from: 0, key: null },
      { from: 2900, key: "woher" },
      { from: 4400, key: "result" },
    ],
  },
  {
    id: "karten",
    label: "Karteikarten",
    ms: 6000,
    focus: [
      { from: 0, key: null },
      { from: 2100, key: "rates" },
      { from: 3900, key: "progress" },
    ],
  },
];

export const STORY_TOTAL_MS = STORY.reduce((a, s) => a + s.ms, 0);

export function storyAt(t: number): { index: number; id: StoryId; local: number } {
  let rest = Math.max(0, t) % STORY_TOTAL_MS;
  for (let i = 0; i < STORY.length; i++) {
    if (rest < STORY[i].ms) return { index: i, id: STORY[i].id, local: rest };
    rest -= STORY[i].ms;
  }
  return { index: 0, id: STORY[0].id, local: 0 };
}

export function sceneStart(index: number): number {
  return STORY.slice(0, index).reduce((a, s) => a + s.ms, 0);
}

export function focusAt(index: number, local: number): string | null {
  let key: string | null = null;
  for (const f of STORY[index].focus) if (local >= f.from) key = f.key;
  return key;
}

/** Text revealed so far: one character per `charMs` once `startMs` has passed. */
export function typed(text: string, localMs: number, startMs: number, charMs = 45): string {
  if (localMs < startMs) return "";
  return text.slice(0, Math.floor((localMs - startMs) / charMs));
}
