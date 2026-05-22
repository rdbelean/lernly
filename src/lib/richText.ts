// Several model-generated fields are HTML with a small set of inline tags:
// <strong>/<em> for emphasis, <br> for breaks, and — for technical subjects —
// <code> for schema/SQL snippets and <sub>/<sup> for notation like the indices
// in relational algebra (σ, π). Render them safely: escape everything first —
// which neutralizes any other markup, tag attributes, and stray "<"/">" from
// material like "in-house costs < market costs" — then re-enable ONLY the bare
// allowed tags. Anything with attributes (e.g. <strong onclick=...>) stays
// escaped, so this is XSS-safe by construction.
export function toSafeInlineHtml(input: string): string {
  const escaped = input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/&lt;(\/?)(strong|em|code|sub|sup)&gt;/gi, "<$1$2>")
    .replace(/&lt;br\s*\/?&gt;/gi, "<br/>");
}
