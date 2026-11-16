// Pure data layer for the dashboard "Klausurkarte": topic weight (tile size)
// and learning status (tile color). No I/O; see examMap.server.ts for reads.
import type { PerTopic } from "./studentProgressShared";

export type TopicStatus = "sicher" | "arbeit" | "offen";

export type MapTopic = {
  key: string;
  name: string;
  packId: string;
  /** Normalised weight, all topics sum to 1. */
  share: number;
  /** Altklausur weight in percent; null when the weight is only derived. */
  sharePct: number | null;
  status: TopicStatus;
};

type Importance = "high" | "medium" | "low";
export type MapPack = {
  id: string;
  topics: { name: string; concepts: { importance: Importance; relevanceTag?: string }[] }[];
};

const IMPORTANCE_WEIGHT: Record<Importance, number> = { high: 3, medium: 2, low: 1 };
const MIN_WEIGHT = 1; // concept-sum fallback for a topic without concepts
const MIN_PROFILE_WEIGHT = 0.02; // profile exists but does not mention this topic

const norm = (s: string) => s.trim().toLowerCase();

function conceptWeight(topic: MapPack["topics"][number]): number {
  const sum = topic.concepts.reduce(
    (a, c) => a + IMPORTANCE_WEIGHT[c.importance] + (c.relevanceTag ? 1 : 0),
    0,
  );
  return Math.max(sum, MIN_WEIGHT);
}

// Same rule as topicsDone() in studentProgressShared: per_topic keys are quiz
// categories, matched on trim+lowercase; sicher = correct > 0 and wrong === 0.
function statusOf(lookup: Map<string, PerTopic[string]>, name: string): TopicStatus {
  const v = lookup.get(norm(name));
  if (!v) return "offen";
  if (v.correct > 0 && v.wrong === 0) return "sicher";
  return "arbeit";
}

export function buildExamMap(args: {
  packs: MapPack[];
  perTopicByPack: Map<string, PerTopic>;
  profileTopics: { name: string; weight: number }[] | null;
}): MapTopic[] {
  const { packs, perTopicByPack, profileTopics } = args;
  const profile = new Map((profileTopics ?? []).map((p) => [norm(p.name), p.weight]));
  const minProfile = profile.size
    ? Math.min(MIN_PROFILE_WEIGHT, ...profile.values())
    : MIN_PROFILE_WEIGHT;

  const raw: { topic: MapTopic; weight: number }[] = [];
  for (const p of packs) {
    const lookup = new Map(
      Object.entries(perTopicByPack.get(p.id) ?? {}).map(([k, v]) => [norm(k), v]),
    );
    for (const t of p.topics) {
      const name = t.name.trim();
      if (!name) continue;
      const w = profile.get(norm(name));
      const weight = profile.size ? (w !== undefined ? Math.max(w, minProfile) : minProfile) : conceptWeight(t);
      raw.push({
        weight,
        topic: {
          key: `${p.id}:${norm(name)}`,
          name,
          packId: p.id,
          share: 0,
          sharePct: w !== undefined ? Math.round(w * 100) : null,
          status: statusOf(lookup, name),
        },
      });
    }
  }
  const total = raw.reduce((a, r) => a + r.weight, 0);
  return raw
    .map((r) => ({ ...r.topic, share: total > 0 ? r.weight / total : 0 }))
    .sort((a, b) => b.share - a.share || a.name.localeCompare(b.name, "de"));
}

/** Heaviest topic that is not yet sicher; "arbeit" wins ties against "offen". */
export function pickNextStep(topics: MapTopic[]): MapTopic | null {
  const open = topics.filter((t) => t.status !== "sicher");
  if (open.length === 0) return null;
  return open.reduce((best, t) => {
    if (t.share > best.share + 1e-9) return t;
    if (Math.abs(t.share - best.share) <= 1e-9 && t.status === "arbeit" && best.status === "offen") return t;
    return best;
  });
}

/** Grid spans for a topic tile: heavier topics are wider, never taller. */
export function tileSpans(shares: number[]): { col: 1 | 2; row: 1 | 2 }[] {
  return shares.map((s) => (s >= 0.15 ? { col: 2, row: 1 } : { col: 1, row: 1 }));
}

/** Whole days from `today` to `examDate` (both YYYY-MM-DD); null if unset or past. */
export function daysLeft(examDate: string | null, today: string): number | null {
  if (!examDate) return null;
  const ms = Date.parse(`${examDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 86_400_000);
}
