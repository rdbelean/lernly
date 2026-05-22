import { test } from "node:test";
import assert from "node:assert/strict";
import { activeTasksFor, TRAINER_FOR } from "./examTasks";

test("essay -> core + blueprint", () => {
  assert.deepEqual(activeTasksFor("essay"), ["cards", "meta", "visualMap", "blueprint"]);
});

test("multiple_choice -> simulator", () => {
  assert.equal(TRAINER_FOR.multiple_choice, "simulator");
});

test("open_questions and oral -> openQuestions", () => {
  assert.equal(TRAINER_FOR.open_questions, "openQuestions");
  assert.equal(TRAINER_FOR.oral, "openQuestions");
});

test("open_book -> blueprint", () => {
  assert.equal(TRAINER_FOR.open_book, "blueprint");
});
