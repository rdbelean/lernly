import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  evaluateDrillField,
  formatTrainerInlineHtml,
  importTrainerBundle,
  sanitizeTrainerSvg,
} from "./importer";

test("importTrainerBundle loads kurs.json and real beispiel-dcf.json", () => {
  const kursJson = JSON.stringify({
    schema: "lernly.kurs/1",
    id: "cf",
    title: "Corporate Finance",
    exam: { totalPoints: 60, fidelity: "strict" },
    topics: [{ id: "dcf", title: "Discounted Cashflow", expectedPoints: 15, tier: 1 }],
  });
  const dcfJson = readFileSync(
    join(
      process.cwd(),
      "plugin/lernly/skills/lernly-trainer-bauen/references/beispiel-dcf.json",
    ),
    "utf-8",
  );

  const res = importTrainerBundle([
    { name: "_lernly/kurs.json", content: kursJson },
    { name: "_lernly/themen/dcf.json", content: dcfJson },
  ]);

  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.sourceKind, "mcp-folder");
  assert.equal(res.summary.topics, 1);
  assert.equal(res.summary.hydratedTopics, 1);
  assert.equal(res.summary.tasks, 4);
  assert.equal(res.summary.cards, 4);
  assert.ok(res.bundle.topics.dcf.theory.length >= 6);
});

test("importTrainerBundle extracts JSON embedded inside built Lernly-Trainer.html", () => {
  const html = `<html><body><script type="application/json" id="lernly-data">${JSON.stringify({
    course: {
      schema: "lernly.kurs/1",
      title: "Finanzierung",
      topics: [{ id: "t1", title: "Investition", expectedPoints: 20 }],
    },
    topics: {
      t1: {
        schema: "lernly.thema/1",
        id: "t1",
        theory: [{ type: "simple", md: "Kapitalwert = Barwert minus A0." }],
        tasks: [],
        cards: [{ id: "t1-c1", front: "NPV?", back: "Kapitalwert" }],
      },
    },
  })}</script></body></html>`;

  const res = importTrainerBundle([
    { name: "Lernly-Trainer.html", content: html },
  ]);
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.sourceKind, "trainer-html");
  assert.equal(res.bundle.course.title, "Finanzierung");
  assert.equal(res.summary.cards, 1);
});

test("evaluateDrillField honors German decimals, rel tolerance, and abs tol", () => {
  assert.equal(
    evaluateDrillField("150,52", { answer: 150.52, rel: 0.005 }).kind,
    "correct",
  );
  assert.equal(
    evaluateDrillField("150.10", { answer: 150.52, rel: 0.005 }).kind,
    "correct",
  );
  assert.equal(
    evaluateDrillField("145", { answer: 150.52, rel: 0.005 }).kind,
    "wrong",
  );
  assert.equal(
    evaluateDrillField("8,39", { answer: 8.38, tol: 0.02 }).kind,
    "correct",
  );
  assert.equal(
    evaluateDrillField("abc", { answer: 8.38, tol: 0.02 }).kind,
    "invalid",
  );
});

test("formatTrainerInlineHtml converts highlights, bold, math and escapes raw HTML", () => {
  const out = formatTrainerInlineHtml(
    "**Test** mit ==Schlüsselwort== und \\(TV_3\\) sowie <script>alert(1)</script>",
  );
  assert.match(out, /<strong>Test<\/strong>/);
  assert.match(out, /<mark>Schlüsselwort<\/mark>/);
  assert.match(out, /katex/);
  assert.doesNotMatch(out, /<script>/);
});

test("sanitizeTrainerSvg strips scripts and inline event handlers", () => {
  const dirty =
    '<svg onload="alert(1)"><script>evil()</script><rect width="10" height="10"/></svg>';
  const clean = sanitizeTrainerSvg(dirty);
  assert.doesNotMatch(clean, /<script>/);
  assert.doesNotMatch(clean, /onload=/);
  assert.match(clean, /<rect/);
});

test("importTrainerBundle imports standalone Claude HTML artifacts without #lernly-data", () => {
  const artifact = `<!doctype html><html><head><title>Corporate Finance · Klausurtrainer</title></head><body><h1>Corporate Finance · Klausurtrainer</h1><h2>Market efficiency</h2><h2>DCF (entity method)</h2><script>console.log("ok")</script></body></html>`;
  const res = importTrainerBundle([
    { name: "Corporate Finance Klausurtrainer.html", content: artifact },
  ]);
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.sourceKind, "html-artifact");
  assert.equal(res.bundle.course.title, "Corporate Finance · Klausurtrainer");
  assert.equal(res.bundle.course.topics.length, 2);
  assert.equal(res.bundle.artifactHtml, artifact);
});

test("importTrainerBundle loads all 6 CF topics from sample-data/corporate-finance-trainer.html", () => {
  const html = readFileSync(
    join(process.cwd(), "sample-data/corporate-finance-trainer.html"),
    "utf-8",
  );
  const res = importTrainerBundle([
    { name: "corporate-finance-trainer.html", content: html },
  ]);

  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.sourceKind, "trainer-html");
  assert.equal(res.summary.topics, 6);
  assert.equal(res.summary.hydratedTopics, 6);

  for (const id of ["dcf", "mm", "emh", "agency", "ethics", "ratings"]) {
    const topic = res.bundle.topics[id];
    assert.ok(topic, `Missing topic ${id}`);
    assert.ok(topic.theory.length > 0, `Empty theory for ${id}`);
    assert.ok(topic.tasks.length > 0, `Empty tasks for ${id}`);
    assert.ok(topic.cards.length > 0, `Empty cards for ${id}`);
  }
});

test("importTrainerBundle backfills missing CF topics in older partial Lernly-Trainer.html", () => {
  const partialHtml = `<!doctype html><html><body><script type="application/json" id="lernly-data">${JSON.stringify({
    course: {
      schema: "lernly.kurs/1",
      id: "corporate-finance",
      title: "Corporate Finance & Valuation",
      topics: [
        { id: "dcf", title: "DCF", tier: 1 },
        { id: "mm", title: "Leverage & MM", tier: 1 },
        { id: "emh", title: "EMH", tier: 1 },
        { id: "agency", title: "Agency", tier: 2 },
        { id: "ethics", title: "Ethics", tier: 2 },
        { id: "ratings", title: "Ratings", tier: 3 },
      ],
    },
    topics: {
      emh: {
        schema: "lernly.thema/1",
        id: "emh",
        theory: [{ type: "simple", md: "Existing EMH" }],
        tasks: [],
        cards: [],
      },
    },
  })}</script></body></html>`;

  const res = importTrainerBundle([
    { name: "Lernly-Trainer.html", content: partialHtml },
  ]);
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.summary.topics, 6);
  assert.equal(res.summary.hydratedTopics, 6);
  assert.equal(res.bundle.topics.emh.theory[0]?.md, "Existing EMH");
  assert.ok(res.bundle.topics.mm.tasks.length > 0);
  assert.ok(res.bundle.topics.ethics.cards.length > 0);
});

test("importTrainerBundle guards against lernly-0.1.0 plugin folder and empty assets/trainer.html", () => {
  const templateHtml = readFileSync(
    join(
      process.cwd(),
      "plugin/lernly/skills/lernly-trainer-bauen/assets/trainer.html",
    ),
    "utf-8",
  );
  const dcfJson = readFileSync(
    join(
      process.cwd(),
      "plugin/lernly/skills/lernly-trainer-bauen/references/beispiel-dcf.json",
    ),
    "utf-8",
  );
  const pluginJson = readFileSync(
    join(process.cwd(), "plugin/lernly/.claude-plugin/plugin.json"),
    "utf-8",
  );

  const pluginUpload = importTrainerBundle([
    { name: "lernly-0.1.0/.claude-plugin/plugin.json", content: pluginJson },
    {
      name: "lernly-0.1.0/skills/lernly-trainer-bauen/assets/trainer.html",
      content: templateHtml,
    },
    {
      name: "lernly-0.1.0/skills/lernly-trainer-bauen/references/beispiel-dcf.json",
      content: dcfJson,
    },
  ]);
  assert.equal(pluginUpload.ok, false);
  if (!pluginUpload.ok) {
    assert.match(pluginUpload.error, /Plugin-Ordner/i);
  }

  const singleTemplate = importTrainerBundle([
    { name: "assets/trainer.html", content: templateHtml },
  ]);
  assert.equal(singleTemplate.ok, false);
  if (!singleTemplate.ok) {
    assert.match(singleTemplate.error, /Vorlage/i);
  }

  const kursJson = JSON.stringify({
    schema: "lernly.kurs/1",
    id: "cf",
    title: "Corporate Finance",
    topics: [{ id: "dcf", title: "DCF", expectedPoints: 15, tier: 1 }],
  });
  const skippedAlongsideCourse = importTrainerBundle([
    { name: "assets/trainer.html", content: templateHtml },
    { name: "_lernly/kurs.json", content: kursJson },
    { name: "_lernly/themen/dcf.json", content: dcfJson },
  ]);
  assert.equal(skippedAlongsideCourse.ok, true);
  if (skippedAlongsideCourse.ok) {
    assert.equal(skippedAlongsideCourse.sourceKind, "mcp-folder");
    assert.equal(skippedAlongsideCourse.summary.hydratedTopics, 1);
  }
});
