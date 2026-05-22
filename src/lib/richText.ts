// Several model-generated fields are HTML with a small set of inline tags
// (<strong>, <em>, <br>) — see prompts.ts (BASE_SYSTEM_PROMPT "BOLD-HIGHLIGHTS"
// and the per-field "HTML <strong>/<em> erlaubt" notes). Render them safely:
// escape everything first — which neutralizes any other markup, tag attributes,
// and stray "<"/">" from material like "in-house costs < market costs" — then
// re-enable ONLY the bare allowed tags. Anything with attributes (e.g.
// <strong onclick=...>) stays escaped, so this is XSS-safe by construction.
export function toSafeInlineHtml(input: string): string {
  const escaped = input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/&lt;(\/?)(strong|em)&gt;/gi, "<$1$2>")
    .replace(/&lt;br\s*\/?&gt;/gi, "<br/>");
}
