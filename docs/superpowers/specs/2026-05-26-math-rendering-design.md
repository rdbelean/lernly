# Study-Pack Math Rendering — Design Spec

**Date:** 2026-05-26
**Status:** Approved (brainstorming) — ready for implementation planning
**Context:** First of three quality workstreams (math rendering → visual polish → exam-type-driven output). This one only addresses math/formula rendering.

---

## 1. Problem (grounded in real pack data)

Generated packs render formulas as **inconsistent plain-text pseudo-math**, not LaTeX and not encoding garbage. Examples pulled from a live pack (`BSc Finance — Time Value of Money`):
- literal carets/underscores: `(1,224)^(1/365)`, `r_t`, `(1 + s₃/2)^3`
- mixed Unicode sub/superscripts: `s₃`, `C₁`, `wᵢ`, operators `Σ`, `−`, `×`, `→`

Because nothing renders math, `^`/`_` show literally and Unicode is inconsistent → it looks "hingerotzt." **Critically, `$` is used for currency** in the content (`$400`, `$250.000`, `$1.500/Monat`), so `$...$` **must not** be used as a math delimiter.

## 2. Goal

Formulas in newly generated packs render as clean typeset math (fractions, sub/superscripts, sums, Greek), without breaking currency or prose.

## 3. Non-Goals

- Retroactively fixing already-generated packs (their stored content is plain text; only new generations improve).
- Visual/component polish (separate workstream) and exam-type routing (separate workstream).
- A WYSIWYG math editor or user-entered math.

## 4. Fix — two halves

### 4a. Generation: emit real LaTeX (prompt change)
Add a math rule to `BASE_SYSTEM_PROMPT` (`src/lib/prompts.ts`) so every task emits consistent LaTeX:
- All math/formulas/indexed variables as LaTeX, delimited **`\( … \)`** (inline) and **`\[ … \]`** (display).
- **Never `$` as a math delimiter** — `$`/`€` stay plain currency text (`$400` bleibt normaler Text).
- No Unicode sub/superscripts (`s₃`, `wᵢ`) — use LaTeX (`s_3`, `w_i`).
- Examples in the rule: `\(r_t\)`, `\((1+\tfrac{s_3}{2})^3\)`, `\[PV = \sum_{t=1}^{n} \frac{CF_t}{(1+r)^t}\]`.

**JSON-escaping interaction:** LaTeX backslashes (`\frac`, `\(`, `\[`) are invalid JSON escapes. The existing `parseModelJson` (`src/lib/parseModelJson.ts` → `sanitizeBackslashes`) already doubles lone invalid backslashes before `JSON.parse`, so `\frac` survives parsing as the literal string `\frac`. No change needed there; this is why the delimiters arrive intact at render time. (Confirmed by the existing `parseModelJson.test.ts` relational-algebra case.)

### 4b. Rendering: KaTeX via a shared `<RichText>` component
- Add **`katex`** (fast, light, synchronous `renderToString` — right for a study app vs heavier MathJax).
- `src/lib/renderMath.ts` → `renderMathInHtml(html: string): string`:
  - Replace `\[ … \]` (display) and `\( … \)` (inline) matches with `katex.renderToString(tex, { displayMode, throwOnError: false, output: "html" })`.
  - Process display before inline. `throwOnError:false` → malformed LaTeX renders as red source text, never crashes.
  - Everything outside the delimiters (HTML tags `<strong>`/`<br>`, prose, `$`-currency) is left byte-for-byte untouched.
- `src/components/pack/RichText.tsx` (client) → `<RichText html={...} as?="div"|"span" className?=... />` renders `dangerouslySetInnerHTML={{ __html: renderMathInHtml(html) }}` (memoized on `html`). Replaces the raw `dangerouslySetInnerHTML` currently in: `FlashcardDeck.tsx`, `OverviewView.tsx`, `ExamSimulator.tsx`, `OpenQuestionsView.tsx`, `EssayBlueprintView.tsx`, `VisualMapView.tsx`.
- Load KaTeX CSS once globally (`@import "katex/dist/katex.min.css";` in `src/app/globals.css`) so the rendered spans are styled.

## 5. Data Flow

model (LaTeX in JSON, `\frac` etc.) → `parseModelJson` (backslash-safe parse) → stored `pack_data` → pack view → `<RichText html>` → `renderMathInHtml` (KaTeX on `\(…\)`/`\[…\]`) → styled math + untouched prose/currency.

## 6. Error Handling

- `renderMathInHtml` wraps each `renderToString` in the KaTeX `throwOnError:false` mode; a malformed expression shows its source in KaTeX's error color rather than breaking the page.
- Content with no math delimiters returns unchanged (cheap no-op path).
- Mixed leftover Unicode (e.g. a stray `Σ`) still displays as a valid character — graceful degradation.

## 7. Testing

Unit tests (`src/lib/renderMath.test.ts`, `node:test`):
- `\(x^2\)` → output contains `class="katex"` and not the literal `\(`.
- `\[ \sum_{i=1}^n i \]` → renders in display mode (contains `katex-display`).
- prose with `$400` and `2,5%` and `<strong>…</strong>` → returned unchanged (no `katex`, `$400` intact).
- malformed `\(\frac{a}\)` → does not throw; returns a string.
- multiple expressions in one string → all replaced.

Manual: generate a fresh STEM pack (e.g. finance/decision-theory) → formulas render typeset; currency amounts unaffected; non-STEM packs unchanged.

## 8. New Dependency / Config

- Dep: `katex` (+ `@types/katex` if needed for TS).
- `globals.css`: KaTeX stylesheet import.

## 9. Build Order

1. `katex` dep + `renderMath.ts` (+ tests) + KaTeX CSS import.
2. `RichText.tsx` + swap it into the 6 pack views.
3. `BASE_SYSTEM_PROMPT` math rule.
4. Verify (tsc/tests/build) + manual: generate a fresh STEM pack.

---

## Open Questions

None blocking. Delimiters fixed to `\(…\)`/`\[…\]` (the data showed `$` is currency). KaTeX chosen over MathJax for speed/size.
