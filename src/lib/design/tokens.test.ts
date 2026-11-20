import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { contrastRatio } from "./contrast";

const read = (path: string) => readFileSync(path, "utf8");

// Value of a token inside the `@theme inline { ... }` block of globals.css.
function readToken(name: string): string {
  const css = read("src/app/globals.css");
  const start = css.indexOf("@theme inline {");
  const block = css.slice(start, css.indexOf("\n}\n", start));
  const m = block.match(new RegExp(`${name}:\\s*([^;]+);`));
  assert.ok(m, `token ${name} not found`);
  return m[1].trim();
}

test("palette matches the rebrand spec", () => {
  assert.equal(readToken("--color-bg"), "#F7F7F4");
  assert.equal(readToken("--color-surface"), "#FFFFFF");
  assert.equal(readToken("--color-surface-2"), "#EFEEEA");
  assert.equal(readToken("--color-text"), "#16181D");
  assert.equal(readToken("--color-primary"), "#3646D6");
});

test("text tokens meet 4.5:1 on every surface", () => {
  for (const fg of ["--color-text", "--color-text-dim", "--color-text-faint"]) {
    for (const bg of ["--color-bg", "--color-surface", "--color-surface-2"]) {
      const ratio = contrastRatio(readToken(fg), readToken(bg));
      assert.ok(ratio >= 4.5, `${fg} on ${bg} is ${ratio}`);
    }
  }
});

test("contrastRatio of black on white is 21", () => {
  assert.equal(contrastRatio("#000000", "#FFFFFF"), 21);
});
