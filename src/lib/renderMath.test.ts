import { test } from "node:test";
import assert from "node:assert/strict";
import { renderMathInHtml } from "./renderMath";

test("renders inline \\( \\) to KaTeX", () => {
  const out = renderMathInHtml("Formel \\(x^2\\) hier");
  assert.match(out, /class="katex"/);
  assert.doesNotMatch(out, /\\\(/); // delimiter consumed
  assert.match(out, /Formel/); // surrounding prose kept
});

test("renders display \\[ \\] in display mode", () => {
  const out = renderMathInHtml("\\[\\sum_{i=1}^{n} i\\]");
  assert.match(out, /katex-display/);
});

test("leaves prose, currency and whitelisted tags untouched", () => {
  const input = "<strong>PV</strong> = $400 bei 2,5%";
  assert.equal(renderMathInHtml(input), input);
});

test("decodes entities inside tex so inequalities render", () => {
  // toSafeInlineHtml escapes '<' to '&lt;' before this runs
  const out = renderMathInHtml("\\(a &lt; b\\)");
  assert.match(out, /class="katex"/);
});

test("malformed latex does not throw", () => {
  assert.doesNotThrow(() => renderMathInHtml("\\(\\frac{a}\\)"));
});

test("handles multiple expressions", () => {
  const out = renderMathInHtml("\\(a\\) und \\(b\\)");
  const count = (out.match(/class="katex"/g) ?? []).length;
  assert.equal(count, 2);
});
