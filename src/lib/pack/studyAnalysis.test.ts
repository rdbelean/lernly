import { test } from "node:test";
import assert from "node:assert/strict";
import {
  splitMnemonic,
  simulatorTopicRows,
  flashcardTopicRows,
  weakestNames,
  rowTone,
  accuracy,
} from "./studyAnalysis";

test("splitMnemonic: pulls a trailing <strong>Mnemonic block off the body", () => {
  const r = splitMnemonic(
    "<strong>Answer</strong><br>Erklärung mit Beispiel<br><strong>Mnemonic 'CARRCD'</strong>: C→…",
  );
  assert.equal(r.body, "<strong>Answer</strong><br>Erklärung mit Beispiel");
  assert.ok(r.mnemonic && r.mnemonic.startsWith("<strong>Mnemonic"));
});

test("splitMnemonic: handles <em>Mnemonic:</em> and multiple <br>", () => {
  const r = splitMnemonic("A<br>B<br><em>Mnemonic:</em> hook");
  assert.equal(r.body, "A<br>B");
  assert.equal(r.mnemonic, "<em>Mnemonic:</em> hook");
});

test("splitMnemonic: 'Merkhilfe' / 'Eselsbrücke' markers also match", () => {
  assert.ok(splitMnemonic("X<br>Merkhilfe: ...").mnemonic);
  assert.ok(splitMnemonic("X<br>Eselsbrücke: ...").mnemonic);
});

test("splitMnemonic: no mnemonic → whole thing is the body", () => {
  assert.deepEqual(splitMnemonic("Just a plain answer<br>with a break"), {
    body: "Just a plain answer<br>with a break",
    mnemonic: null,
  });
});

test("splitMnemonic: mnemonic as the only/first segment → not split", () => {
  assert.deepEqual(splitMnemonic("<strong>Mnemonic 'X'</strong>: y<br>more"), {
    body: "<strong>Mnemonic 'X'</strong>: y<br>more",
    mnemonic: null,
  });
  assert.deepEqual(splitMnemonic(""), { body: "", mnemonic: null });
});

test("simulatorTopicRows: correct/total per category, weakest first", () => {
  const questions = [
    { category: "Bilanz", correctIndex: 0 },
    { category: "Bilanz", correctIndex: 1 },
    { category: "Cashflow", correctIndex: 0 },
    { category: "Cashflow", correctIndex: 0 },
  ];
  const answers = [0, 0, null, 1]; // Bilanz 1/2, Cashflow 0/2 (one skipped, one wrong)
  const rows = simulatorTopicRows(questions, answers);
  assert.deepEqual(rows, [
    { name: "Cashflow", correct: 0, total: 2 },
    { name: "Bilanz", correct: 1, total: 2 },
  ]);
});

test("simulatorTopicRows: blank category falls back to Allgemein", () => {
  const rows = simulatorTopicRows([{ category: "  ", correctIndex: 0 }], [0]);
  assert.equal(rows[0].name, "Allgemein");
});

test("flashcardTopicRows: known = correct, weakest first", () => {
  const items = [
    { category: "A", status: "known" },
    { category: "A", status: "again" },
    { category: "B", status: "known" },
    { category: "B", status: "known" },
  ];
  assert.deepEqual(flashcardTopicRows(items), [
    { name: "A", correct: 1, total: 2 },
    { name: "B", correct: 2, total: 2 },
  ]);
});

test("weakestNames: only not-perfect topics, capped", () => {
  const rows = [
    { name: "A", correct: 0, total: 2 },
    { name: "B", correct: 1, total: 2 },
    { name: "C", correct: 2, total: 2 },
  ];
  assert.deepEqual(weakestNames(rows, 2), ["A", "B"]);
  assert.deepEqual(weakestNames([{ name: "C", correct: 2, total: 2 }]), []);
});

test("rowTone + accuracy bands", () => {
  assert.equal(accuracy({ name: "x", correct: 0, total: 0 }), 0);
  assert.equal(rowTone({ name: "x", correct: 1, total: 3 }), "weak"); // .33
  assert.equal(rowTone({ name: "x", correct: 2, total: 3 }), "warn"); // .66
  assert.equal(rowTone({ name: "x", correct: 3, total: 3 }), "strong");
});
