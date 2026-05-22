import { test } from "node:test";
import assert from "node:assert/strict";
import { toSafeInlineHtml } from "./richText";

test("keeps allowed inline tags", () => {
  assert.equal(
    toSafeInlineHtml("Die <strong>Relation</strong> ist eine <em>Menge</em>."),
    "Die <strong>Relation</strong> ist eine <em>Menge</em>.",
  );
});

test("keeps <br> in both forms, normalized", () => {
  assert.equal(toSafeInlineHtml("a<br>b<br/>c"), "a<br/>b<br/>c");
});

test("keeps <code>, <sub>, <sup> for technical notation", () => {
  assert.equal(
    toSafeInlineHtml("Tabelle <code>Student(MatrNr: integer)</code>"),
    "Tabelle <code>Student(MatrNr: integer)</code>",
  );
  // relational algebra: code with a nested subscript (from a real model answer)
  assert.equal(
    toSafeInlineHtml("<code>σ<sub>MatrNr ≤ 3</sub>(Student)</code>"),
    "<code>σ<sub>MatrNr ≤ 3</sub>(Student)</code>",
  );
  assert.equal(toSafeInlineHtml("x<sup>2</sup>"), "x<sup>2</sup>");
});

test("escapes math less-than/greater-than instead of treating as tags", () => {
  assert.equal(
    toSafeInlineHtml("if in-house costs < market costs > 0"),
    "if in-house costs &lt; market costs &gt; 0",
  );
});

test("strips disallowed tags (no script execution)", () => {
  assert.equal(
    toSafeInlineHtml('x<script>alert(1)</script>y'),
    "x&lt;script&gt;alert(1)&lt;/script&gt;y",
  );
});

test("neutralizes attributes on otherwise-allowed tags", () => {
  // <strong onclick=...> must NOT become a live tag (only bare tags re-enabled).
  assert.equal(
    toSafeInlineHtml('<strong onclick="evil()">x</strong>'),
    '&lt;strong onclick="evil()"&gt;x</strong>',
  );
});

test("escapes ampersands", () => {
  assert.equal(toSafeInlineHtml("P&G & AT&T"), "P&amp;G &amp; AT&amp;T");
});
