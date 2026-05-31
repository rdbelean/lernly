import { test } from "node:test";
import assert from "node:assert/strict";
import {
  renderExamReminderEmail,
  renderExamReminderText,
} from "./examReminder";

const base = { examTitle: "Statistik I", daysLeft: 3, packId: null };

test("HTML email greets the user by name when provided", () => {
  const html = renderExamReminderEmail({ ...base, name: "Max" });
  assert.ok(html.includes("Hey Max,"), "expected 'Hey Max,' in HTML");
});

test("plaintext email greets the user by name when provided", () => {
  const text = renderExamReminderText({ ...base, name: "Max" });
  assert.ok(text.includes("Hey Max,"), "expected 'Hey Max,' in text");
});

test("HTML email uses a neutral greeting when name is empty/missing", () => {
  const html = renderExamReminderEmail({ ...base, name: "" });
  assert.ok(html.includes("Hallo,"), "expected neutral 'Hallo,' greeting");
  assert.ok(!html.includes("Hey ,"), "must not render empty 'Hey ,'");
  assert.ok(!html.toLowerCase().includes("null"), "must not contain 'null'");
});

test("name is HTML-escaped in the greeting", () => {
  const html = renderExamReminderEmail({ ...base, name: "<b>X</b>" });
  assert.ok(html.includes("&lt;b&gt;X&lt;/b&gt;"), "name must be escaped");
  assert.ok(!html.includes("<b>X</b>"), "raw HTML name must not appear");
});
