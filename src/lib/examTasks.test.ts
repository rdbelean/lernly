import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activeTasksFor,
  TRAINER_FOR,
  isRequiredTask,
  type GenTaskKey,
} from "./examTasks";

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

test("only cards + meta are required; trainers + visualMap are optional", () => {
  // Required tasks are fatal to a pack; everything else soft-fails so one slow
  // or broken sub-task (e.g. a simulator that blows the per-attempt timeout on
  // large material) can't discard the whole pack.
  assert.equal(isRequiredTask("cards"), true);
  assert.equal(isRequiredTask("meta"), true);
  const optional: GenTaskKey[] = [
    "simulator",
    "quiz",
    "blueprint",
    "essayPredictions",
    "visualMap",
  ];
  for (const k of optional) {
    assert.equal(isRequiredTask(k), false, `${k} should be optional`);
  }
});
