import { test } from "node:test";
import assert from "node:assert/strict";
import { parseModelJson, sanitizeBackslashes } from "./parseModelJson";

test("sanitizeBackslashes leaves valid escape pairs untouched", () => {
  // \\ (set-difference operator) and \n are valid JSON escapes.
  assert.equal(sanitizeBackslashes('a \\\\ b \\n c'), 'a \\\\ b \\n c');
});

test("sanitizeBackslashes doubles lone invalid backslashes", () => {
  // \R \) \= are invalid JSON escapes -> must be doubled.
  assert.equal(sanitizeBackslashes("p(R1\\R2)"), "p(R1\\\\R2)");
  assert.equal(sanitizeBackslashes("x \\= y"), "x \\\\= y");
});

test("parseModelJson recovers relational-algebra notation that broke JSON.parse", () => {
  // Mix of valid \\ (difference) and invalid \R (division) inside a string.
  const raw = '{"a": "Division: pi(R1\\R2)(R1) \\\\ R1 = result"}';
  const out = parseModelJson(raw) as { a: string };
  assert.equal(out.a, "Division: pi(R1\\R2)(R1) \\ R1 = result");
});

test("parseModelJson strips code fences", () => {
  const raw = '```json\n{"x": 1}\n```';
  assert.deepEqual(parseModelJson(raw), { x: 1 });
});

test("parseModelJson removes trailing commas", () => {
  assert.deepEqual(parseModelJson('{"a": [1, 2,], }'), { a: [1, 2] });
});

test("parseModelJson throws when no JSON object present", () => {
  assert.throws(() => parseModelJson("no json here"));
});
