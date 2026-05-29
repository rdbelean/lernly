import { test } from "node:test";
import assert from "node:assert/strict";
import { activeTasksFor, TRAINER_FOR } from "./examTasks";

test("essay -> core + essayPredictions", () => {
  assert.deepEqual(activeTasksFor("essay"), ["cards", "meta", "visualMap", "essayPredictions"]);
});

test("multiple_choice -> simulator", () => {
  assert.equal(TRAINER_FOR.multiple_choice, "simulator");
});

test("open_questions and oral -> quiz", () => {
  assert.equal(TRAINER_FOR.open_questions, "quiz");
  assert.equal(TRAINER_FOR.oral, "quiz");
});

test("open_book -> blueprint", () => {
  assert.equal(TRAINER_FOR.open_book, "blueprint");
});
