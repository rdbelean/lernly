import { test } from "node:test";
import assert from "node:assert/strict";
import { markdownLightToHtml } from "./markdownLight";
import { renderRichText } from "./richText";

test("converts **bold** and __bold__ to <strong>", () => {
  assert.equal(markdownLightToHtml("**Statisch** vs normal"), "<strong>Statisch</strong> vs normal");
  assert.equal(markdownLightToHtml("__fett__"), "<strong>fett</strong>");
});

test("converts *italic* and _italic_ to <em> (after bold)", () => {
  assert.equal(markdownLightToHtml("ein *wenn* dann"), "ein <em>wenn</em> dann");
  assert.equal(markdownLightToHtml("a _kursiv_ b"), "a <em>kursiv</em> b");
  // bold then italic in one string
  assert.equal(
    markdownLightToHtml("**Action** dann *Response*"),
    "<strong>Action</strong> dann <em>Response</em>",
  );
});

test("does not eat stray asterisks or snake_case", () => {
  assert.equal(markdownLightToHtml("2 * 3 = 6"), "2 * 3 = 6");
  assert.equal(markdownLightToHtml("user_id and pack_id"), "user_id and pack_id");
});

test("newlines become <br>; blank line is a paragraph break", () => {
  assert.equal(markdownLightToHtml("a\nb"), "a<br>b");
  assert.equal(markdownLightToHtml("a\n\nb"), "a<br><br>b");
  assert.equal(markdownLightToHtml("a\n\n\n\nb"), "a<br><br>b");
});

test("idempotent on content that already uses <strong>/<em>/<br>", () => {
  const html = "<strong>Kernaussage</strong><br>Beispiel: Netflix";
  assert.equal(markdownLightToHtml(html), html);
});

test("composes with renderRichText to produce real bold + breaks", () => {
  const out = renderRichText(markdownLightToHtml("**Statisch**\nBeispiel: Apple"));
  assert.ok(out.includes("<strong>Statisch</strong>"));
  assert.ok(out.includes("<br")); // renderRichText normalizes <br> -> <br/>
  assert.ok(!out.includes("**"));
});

test("empty input is safe", () => {
  assert.equal(markdownLightToHtml(""), "");
});
