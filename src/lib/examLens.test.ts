import { test } from "node:test";
import assert from "node:assert/strict";
import {
  examLensBadgeText,
  findTopicAppearances,
  normalizeTopicName,
} from "./examLens";

const lens = {
  examCount: 3,
  topics: [
    { name: "Vertikale Integration", appearances: 3 },
    { name: "Porter's Five Forces", appearances: 2 },
    { name: "BCG-Matrix", appearances: 1 },
  ],
};

test("normalizeTopicName strips case, diacritics and extra whitespace", () => {
  // NFD + combining-mark strip folds umlauts/accents to their base letter.
  assert.equal(normalizeTopicName("  Übungs-Klausur  "), "ubungs-klausur");
  assert.equal(normalizeTopicName("Stratégie"), "strategie");
  assert.equal(normalizeTopicName("A   B\tC"), "a b c");
});

test("findTopicAppearances matches exact normalized names", () => {
  assert.equal(findTopicAppearances(lens, "vertikale integration"), 3);
  assert.equal(findTopicAppearances(lens, "BCG-MATRIX"), 1);
});

test("findTopicAppearances falls back to containment both ways", () => {
  assert.equal(findTopicAppearances(lens, "Five Forces"), 2);
  assert.equal(
    findTopicAppearances(lens, "Vertikale Integration & Outsourcing"),
    3,
  );
});

test("findTopicAppearances returns null on no match / short / missing input", () => {
  assert.equal(findTopicAppearances(lens, "Diversifikation"), null);
  assert.equal(findTopicAppearances(lens, "BCG"), null); // <4 chars, no exact hit
  assert.equal(findTopicAppearances(lens, null), null);
  assert.equal(findTopicAppearances(null, "Vertikale Integration"), null);
  assert.equal(findTopicAppearances(lens, "   "), null);
});

test("examLensBadgeText is the verbatim product string", () => {
  assert.equal(
    examLensBadgeText(2, 3),
    "Kam in 2 von 3 Altklausuren dran",
  );
});
