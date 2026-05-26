import { test } from "node:test";
import assert from "node:assert/strict";
import { renderEmail } from "./layout";

test("renderEmail includes heading, preheader, body and logo", () => {
  const html = renderEmail({
    preheader: "Vorschautext",
    heading: "Hallo Welt",
    bodyHtml: "<p>Inhalt hier</p>",
  });
  assert.match(html, /Vorschautext/);
  assert.match(html, /Hallo Welt/);
  assert.match(html, /Inhalt hier/);
  assert.match(html, /lernly-logo-2048\.png/);
  assert.match(html, /<!doctype html>/i);
});

test("renderEmail renders a CTA button only when ctaUrl is given", () => {
  const withCta = renderEmail({
    preheader: "p",
    heading: "h",
    bodyHtml: "b",
    ctaText: "Los geht's",
    ctaUrl: "https://www.lernly-app.de/dashboard",
  });
  assert.match(withCta, /https:\/\/www\.lernly-app\.de\/dashboard/);
  assert.match(withCta, /Los geht's/);

  const noCta = renderEmail({ preheader: "p", heading: "h", bodyHtml: "b" });
  assert.doesNotMatch(noCta, /Los geht's/);
});

test("renderEmail escapes nothing in bodyHtml (caller supplies safe HTML)", () => {
  const html = renderEmail({ preheader: "p", heading: "h", bodyHtml: "<strong>fett</strong>" });
  assert.match(html, /<strong>fett<\/strong>/);
});
