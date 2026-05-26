import katex from "katex";

// \[ ... \] (display) and \( ... \) (inline). Non-greedy so adjacent
// expressions don't merge. [\s\S] so the math can contain anything but the
// closing delimiter (incl. newlines).
const DISPLAY_RE = /\\\[([\s\S]+?)\\\]/g;
const INLINE_RE = /\\\(([\s\S]+?)\\\)/g;

// Content reaches us already HTML-escaped by toSafeInlineHtml, so any '<', '>',
// '&' inside the TeX (e.g. inequalities) are entities — decode before KaTeX.
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function render(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(decodeEntities(tex), {
      displayMode,
      throwOnError: false, // malformed → rendered in error color, no crash
      output: "html",
    });
  } catch {
    return tex; // ultra-defensive; throwOnError:false already avoids throwing
  }
}

// Replace LaTeX delimited \(…\) / \[…\] with KaTeX HTML. Everything outside the
// delimiters (prose, whitelisted tags, $-currency) is returned untouched.
export function renderMathInHtml(html: string): string {
  if (!html || (!html.includes("\\(") && !html.includes("\\["))) return html;
  return html
    .replace(DISPLAY_RE, (_m, tex: string) => render(tex, true))
    .replace(INLINE_RE, (_m, tex: string) => render(tex, false));
}
