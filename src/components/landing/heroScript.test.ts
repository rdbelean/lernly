import { test } from "node:test";
import assert from "node:assert/strict";
import { SCENES, TOTAL_MS, sceneAt, typed } from "./heroScript";

test("scenes run in the agreed order and total is their sum", () => {
  assert.deepEqual(
    SCENES.map((s) => s.id),
    ["dashboard", "verstehen", "ueben", "merken", "ki", "karte"],
  );
  assert.equal(TOTAL_MS, SCENES.reduce((a, s) => a + s.ms, 0));
});

test("sceneAt maps time to scene and local offset", () => {
  assert.deepEqual(sceneAt(0), { index: 0, id: "dashboard", local: 0 });
  const second = SCENES[0].ms;
  assert.deepEqual(sceneAt(second + 250), { index: 1, id: "verstehen", local: 250 });
});

test("sceneAt loops after the last scene and clamps negatives", () => {
  assert.equal(sceneAt(TOTAL_MS).id, "dashboard");
  assert.equal(sceneAt(TOTAL_MS + 100).local, 100);
  assert.deepEqual(sceneAt(-40), { index: 0, id: "dashboard", local: 0 });
});

test("typed reveals one character per charMs after the start delay", () => {
  assert.equal(typed("751,31", 0, 500), "");
  assert.equal(typed("751,31", 499, 500), "");
  assert.equal(typed("751,31", 500 + 45 * 3, 500), "751");
  assert.equal(typed("751,31", 10_000, 500), "751,31");
  assert.equal(typed("abc", 100, 0, 50), "ab");
});
