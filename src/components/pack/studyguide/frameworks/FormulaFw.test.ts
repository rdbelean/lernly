import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import FormulaFw from "./FormulaFw";

// SSR smoke test for the study-guide formula pattern: KaTeX typesetting,
// the variable-explanation table, and the memory hook actually reach the DOM.

const fw = {
  kind: "formula" as const,
  title: "Lineare Regression",
  formula: "\\(Y = a + bX\\)",
  sub: "Die Kernformel",
  variables: [
    { symbol: "Y", meaning: "Vorhergesagter Wert" },
    { symbol: "b", meaning: "Steigung" },
  ],
  hook: "Eine Einheit mehr X → b Einheiten mehr Y.",
};

test("formula renders KaTeX markup (not raw delimiters)", () => {
  const html = renderToString(createElement(FormulaFw, { fw }));
  assert.match(html, /katex/);
  assert.doesNotMatch(html, /\\\(Y = a \+ bX\\\)/);
});

test("formula renders the variable table + hook", () => {
  const html = renderToString(createElement(FormulaFw, { fw }));
  assert.match(html, /Vorhergesagter Wert/);
  assert.match(html, /Steigung/);
  assert.match(html, /Eine Einheit mehr X/);
});

test("legacy formula without variables renders the box only", () => {
  const html = renderToString(
    createElement(FormulaFw, {
      fw: { kind: "formula" as const, formula: "E = mc^2" },
    }),
  );
  assert.match(html, /E = mc\^2/);
  assert.doesNotMatch(html, /<table/);
});
