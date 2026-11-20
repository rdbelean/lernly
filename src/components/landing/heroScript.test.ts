import { test } from "node:test";
import assert from "node:assert/strict";
import { STORY, STORY_TOTAL_MS, focusAt, sceneStart, storyAt, typed } from "./heroScript";

test("story runs plan, verstehen, ueben, karten in ~22 seconds", () => {
  assert.deepEqual(STORY.map((s) => s.id), ["plan", "verstehen", "ueben", "karten"]);
  assert.equal(STORY_TOTAL_MS, STORY.reduce((a, s) => a + s.ms, 0));
  assert.ok(STORY_TOTAL_MS >= 21_000 && STORY_TOTAL_MS <= 23_000);
});

test("storyAt maps time to scene and local offset, and loops", () => {
  assert.deepEqual(storyAt(0), { index: 0, id: "plan", local: 0 });
  assert.deepEqual(storyAt(STORY[0].ms + 300), { index: 1, id: "verstehen", local: 300 });
  assert.equal(storyAt(STORY_TOTAL_MS + 10).id, "plan");
  assert.equal(storyAt(-5).local, 0);
});

test("sceneStart returns the absolute start of each scene", () => {
  assert.equal(sceneStart(0), 0);
  assert.equal(sceneStart(1), STORY[0].ms);
  assert.equal(sceneStart(3), STORY[0].ms + STORY[1].ms + STORY[2].ms);
});

test("focusAt follows each scene's camera schedule", () => {
  assert.equal(focusAt(0, 100), null);
  assert.equal(focusAt(0, 2000), "points");
  assert.equal(focusAt(0, 3800), "next");
  assert.equal(focusAt(1, 3500), "trap");
  assert.equal(focusAt(1, 5200), "muster");
  assert.equal(focusAt(2, 3500), "woher");
  assert.equal(focusAt(3, 2600), "rates");
});

test("typed reveals one character per charMs after the start delay", () => {
  assert.equal(typed("8.456", 0, 500), "");
  assert.equal(typed("8.456", 500 + 45 * 2, 500), "8.");
  assert.equal(typed("8.456", 99_999, 500), "8.456");
});
