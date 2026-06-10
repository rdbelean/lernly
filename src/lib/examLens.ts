import type { ExamLens } from "@/lib/schema";

// Normalize topic names for matching generated category tags / concept terms
// against profile topic names: lowercase, trim, strip diacritics, collapse
// whitespace.
export function normalizeTopicName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// How many Altklausuren a topic appeared in. Exact normalized match first,
// then containment either way (min length 4 to avoid junk matches). Returns
// null when no match — callers render no badge (fail silent, never a wrong
// number).
export function findTopicAppearances(
  lens: ExamLens | null | undefined,
  topicName: string | null | undefined,
): number | null {
  if (!lens || !topicName) return null;
  const needle = normalizeTopicName(topicName);
  if (!needle) return null;
  for (const t of lens.topics) {
    if (normalizeTopicName(t.name) === needle) return t.appearances;
  }
  for (const t of lens.topics) {
    const hay = normalizeTopicName(t.name);
    if (hay.length < 4 || needle.length < 4) continue;
    if (hay.includes(needle) || needle.includes(hay)) return t.appearances;
  }
  return null;
}

// Verbatim provenance string — exact wording is a product requirement.
export function examLensBadgeText(
  appearances: number,
  examCount: number,
): string {
  return `Kam in ${appearances} von ${examCount} Altklausuren dran`;
}
