// Tiny "markdown light" → HTML normalizer for the KI-Hilfe tutor. Haiku
// sometimes emits markdown (**bold**, *italic*, raw newlines) even when asked
// for HTML; renderRichText only re-enables bare HTML tags and never parses
// markdown, so those would render literally. This converts the few markdown
// tokens we allow into the bare tags renderRichText re-enables (<strong>,
// <em>, <br>), then renderRichText sanitizes the result. Pure + idempotent:
// content that already uses <strong>/<em>/<br> passes through unchanged.
export function markdownLightToHtml(input: string): string {
  if (!input) return "";
  let s = input;

  // **bold** / __bold__ → <strong>. Non-greedy, must contain a non-marker char.
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // *italic* / _italic_ → <em>. Run AFTER bold so the bold markers are gone.
  // Require the content to start/end with a non-space so we don't eat stray
  // asterisks (e.g. "2 * 3") or list-ish "* " bullets.
  s = s.replace(/\*(?!\s)([^*\n]+?)(?<!\s)\*/g, "<em>$1</em>");
  s = s.replace(/(?<![A-Za-z0-9])_(?!\s)([^_\n]+?)(?<!\s)_(?![A-Za-z0-9])/g, "<em>$1</em>");

  // Newlines → <br>. Collapse 3+ blank lines to a single paragraph break.
  s = s.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  s = s.replace(/\n\n/g, "<br><br>").replace(/\n/g, "<br>");

  return s;
}
