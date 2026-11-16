// Timeline of the landing hero scene. Pure functions so timing is testable;
// the component only advances a clock and renders what these return.
export type SceneId = "dashboard" | "verstehen" | "ueben" | "merken" | "ki" | "karte";

export const SCENES: { id: SceneId; ms: number }[] = [
  { id: "dashboard", ms: 3200 },
  { id: "verstehen", ms: 3600 },
  { id: "ueben", ms: 4600 },
  { id: "merken", ms: 3600 },
  { id: "ki", ms: 5000 },
  { id: "karte", ms: 3600 },
];

export const TOTAL_MS = SCENES.reduce((a, s) => a + s.ms, 0);

export function sceneAt(t: number): { index: number; id: SceneId; local: number } {
  let rest = ((Math.max(0, t) % TOTAL_MS) + TOTAL_MS) % TOTAL_MS;
  for (let i = 0; i < SCENES.length; i++) {
    if (rest < SCENES[i].ms) return { index: i, id: SCENES[i].id, local: rest };
    rest -= SCENES[i].ms;
  }
  return { index: 0, id: SCENES[0].id, local: 0 };
}

/** Text revealed so far: one character per `charMs` once `startMs` has passed. */
export function typed(text: string, localMs: number, startMs: number, charMs = 45): string {
  if (localMs < startMs) return "";
  return text.slice(0, Math.floor((localMs - startMs) / charMs));
}
