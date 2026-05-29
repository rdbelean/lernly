import { test } from "node:test";
import assert from "node:assert/strict";
import { MODEL_FOR, SONNET, HAIKU } from "./taskModels";

test("extractive tasks route to Haiku", () => {
  assert.equal(MODEL_FOR.cards, HAIKU);
  assert.equal(MODEL_FOR.meta, HAIKU);
});

test("quality-critical tasks stay on Sonnet", () => {
  for (const k of ["simulator", "blueprint", "visualMap", "quiz", "essayPredictions"] as const) {
    assert.equal(MODEL_FOR[k], SONNET);
  }
});

test("SONNET and HAIKU are distinct model ids", () => {
  assert.notEqual(SONNET, HAIKU);
});
