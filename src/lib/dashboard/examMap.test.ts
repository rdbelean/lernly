import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildExamMap,
  pickNextStep,
  tileSpans,
  type MapTopic,
} from "./examMap";

const pack = (id: string, topics: { name: string; imp: ("high" | "medium" | "low")[]; tag?: boolean }[]) => ({
  id,
  topics: topics.map((t) => ({
    name: t.name,
    concepts: t.imp.map((importance) => ({
      importance,
      relevanceTag: t.tag ? "kam dran" : undefined,
    })),
  })),
});

test("exam-profile weight beats concept sum and sets sharePct", () => {
  const r = buildExamMap({
    packs: [pack("p1", [{ name: " WACC ", imp: ["low"] }, { name: "DCF", imp: ["high", "high"] }])],
    perTopicByPack: new Map(),
    profileTopics: [{ name: "wacc", weight: 0.3 }, { name: "dcf", weight: 0.1 }],
  });
  assert.equal(r[0].name, "WACC");
  assert.ok(Math.abs(r[0].share - 0.75) < 1e-9);
  assert.equal(r[0].sharePct, 30);
  assert.equal(r[1].sharePct, 10);
});

test("without profile: importance sum (+1 relevanceTag), no sharePct", () => {
  const r = buildExamMap({
    packs: [pack("p1", [
      { name: "A", imp: ["high", "medium"] },
      { name: "B", imp: ["low"], tag: true },
    ])],
    perTopicByPack: new Map(),
    profileTopics: null,
  });
  // A = 3+2 = 5, B = 1+1 = 2
  assert.equal(r[0].name, "A");
  assert.ok(Math.abs(r[0].share - 5 / 7) < 1e-9);
  assert.equal(r[0].sharePct, null);
});

test("topic without concepts gets minimum weight, shares sum to 1, no NaN", () => {
  const r = buildExamMap({
    packs: [pack("p1", [{ name: "Leer", imp: [] }, { name: "Voll", imp: ["high"] }])],
    perTopicByPack: new Map(),
    profileTopics: null,
  });
  const sum = r.reduce((a, t) => a + t.share, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  assert.ok(r.every((t) => Number.isFinite(t.share) && t.share > 0));
});

test("status: sicher / arbeit / offen from latest per_topic", () => {
  const r = buildExamMap({
    packs: [pack("p1", [
      { name: "A", imp: ["high"] },
      { name: "B", imp: ["high"] },
      { name: "C", imp: ["high"] },
    ])],
    perTopicByPack: new Map([
      ["p1", { a: { correct: 3, wrong: 0, skipped: 0 }, B: { correct: 1, wrong: 2, skipped: 0 } }],
    ]),
    profileTopics: null,
  });
  const byName = Object.fromEntries(r.map((t) => [t.name, t.status]));
  assert.deepEqual(byName, { A: "sicher", B: "arbeit", C: "offen" });
});

const t = (name: string, share: number, status: MapTopic["status"]): MapTopic => ({
  key: name,
  name,
  packId: "p",
  share,
  sharePct: null,
  status,
});

test("pickNextStep: heaviest non-sicher, arbeit before offen on tie", () => {
  assert.equal(pickNextStep([t("A", 0.5, "sicher"), t("B", 0.3, "offen"), t("C", 0.3, "arbeit")])?.name, "C");
  assert.equal(pickNextStep([t("A", 0.5, "sicher"), t("B", 0.2, "offen"), t("C", 0.1, "arbeit")])?.name, "B");
});

test("pickNextStep: all sicher or empty is null", () => {
  assert.equal(pickNextStep([t("A", 1, "sicher")]), null);
  assert.equal(pickNextStep([]), null);
});

test("tileSpans: big for >=0.2, wide for >=0.1, else single", () => {
  assert.deepEqual(tileSpans([0.25, 0.12, 0.05]), [
    { col: 2, row: 2 },
    { col: 2, row: 1 },
    { col: 1, row: 1 },
  ]);
  assert.deepEqual(tileSpans([]), []);
});

import { daysLeft } from "./examMap";

test("daysLeft: null without date, 0 today, null once past", () => {
  assert.equal(daysLeft(null, "2026-11-16"), null);
  assert.equal(daysLeft("2026-11-22", "2026-11-16"), 6);
  assert.equal(daysLeft("2026-11-16", "2026-11-16"), 0);
  assert.equal(daysLeft("2026-11-10", "2026-11-16"), null);
});
