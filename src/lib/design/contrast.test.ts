import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { contrastRatio } from "./contrast";

const css = readFileSync("src/app/globals.css", "utf8");
const token = (name: string): string => {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(m, `token --color-${name} missing or not a hex value`);
  return m![1];
};

test("contrastRatio: black on white is 21, same color is 1", () => {
  assert.ok(Math.abs(contrastRatio("#000000", "#ffffff") - 21) < 1e-9);
  assert.equal(contrastRatio("#336699", "#336699"), 1);
});

const PAIRS: [string, string][] = [
  ["text", "surface"], ["text", "bg"], ["text-dim", "surface"], ["text-dim", "bg"],
  ["text-faint", "surface"], ["text-faint", "bg"], ["text", "surface-2"], ["text-dim", "surface-2"],
  ["on-primary", "primary"], ["on-primary", "primary-press"],
  ["ok-ink", "ok-bg"], ["work-ink", "work-bg"], ["urgent-ink", "urgent-bg"], ["err-ink", "err-bg"],
  ["primary", "surface"],
];

for (const [fg, bg] of PAIRS) {
  test(`contrast ${fg} on ${bg} is at least 4.5:1`, () => {
    const r = contrastRatio(token(fg), token(bg));
    assert.ok(r >= 4.5, `${fg} on ${bg} = ${r.toFixed(2)}`);
  });
}
