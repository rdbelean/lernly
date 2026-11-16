import { test } from "node:test";
import assert from "node:assert/strict";
import { findColorLiterals } from "./colorLiterals";

test("finds hex and rgba literals", () => {
  const hits = findColorLiterals(
    "a{color:#3646D6;b:rgba(255,255,255,.06)} c{color:var(--x)}",
  );
  assert.equal(hits.length, 2);
  assert.equal(hits[0].match, "#3646D6");
});

test("ignores token references", () => {
  assert.deepEqual(findColorLiterals("color: var(--color-ink)"), []);
});

test("ignores literals inside line and block comments", () => {
  assert.deepEqual(
    findColorLiterals("// old #2B3499\n/* rgba(0,0,0,.5) */\nconst a = 1;"),
    [],
  );
});

test("does not treat url fragments or ids as colors", () => {
  assert.deepEqual(findColorLiterals('href="/a#section" id="#abc-hash"'), []);
});
