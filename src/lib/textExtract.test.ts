import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeExtractedText } from "./textExtract";
import { detectMaterialLanguage } from "./detectLanguage";

// Regression guard for the bug where extraction did `.replace(/ /g, "")` and
// deleted EVERY space, smashing words together and breaking language detection.

test("preserves single spaces between words", () => {
  assert.equal(
    normalizeExtractedText("Was ist ein DBS und warum"),
    "Was ist ein DBS und warum",
  );
});

test("collapses runs of spaces/tabs to a single space", () => {
  assert.equal(normalizeExtractedText("a    b\tc"), "a b c");
});

test("normalizes non-breaking spaces to regular spaces", () => {
  assert.equal(normalizeExtractedText("der Markt"), "der Markt");
});

test("trims trailing spaces before newlines and collapses blank-line runs", () => {
  assert.equal(normalizeExtractedText("a   \n\n\n\nb"), "a\n\nb");
});

test("umlaut-free German still detects as German after normalization", () => {
  // Before the fix, spaces were stripped so the space-delimited markers
  // (" der ", " ist ", ...) matched nothing → defaulted to English.
  const raw = "Der Markt und die Nachfrage ist ein zentrales Konzept der Wirtschaft.";
  const cleaned = normalizeExtractedText(raw);
  assert.equal(detectMaterialLanguage(cleaned).lang, "de");
});

test("English material still detects as English after normalization", () => {
  const raw = "The market and the demand is a central concept of the economy.";
  assert.equal(detectMaterialLanguage(normalizeExtractedText(raw)).lang, "en");
});
