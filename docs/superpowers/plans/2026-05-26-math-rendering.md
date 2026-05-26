# Study-Pack Math Rendering (KaTeX) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render math/formulas in newly generated study packs as clean typeset KaTeX instead of messy plain-text pseudo-math, without breaking currency (`$`) or prose.

**Architecture:** All pack content already passes through `toSafeInlineHtml()` (`src/lib/richText.ts`, a tag-whitelist sanitizer). Add a `renderMathInHtml()` helper (KaTeX on `\(…\)`/`\[…\]`) and a combined `renderRichText() = renderMathInHtml(toSafeInlineHtml())`. Swap the existing `toSafeInlineHtml(` call sites in the 6 pack views to `renderRichText(` — minimal diff, no JSX restructure. Instruct the model (in `BASE_SYSTEM_PROMPT`) to emit LaTeX delimited `\(…\)`/`\[…\]` (never `$`).

**Tech Stack:** Next.js, `katex` (new), `node:test` via `tsx --test`, Tailwind v4 CSS.

**Spec:** `docs/superpowers/specs/2026-05-26-math-rendering-design.md`. (Spec mentioned a `<RichText>` component; this plan refines that to the lower-risk `renderRichText()` function-swap — same outcome.)

**Scope note:** Only newly generated packs improve (stored content of old packs is already plain text). Other quality workstreams (visual polish, exam-type routing) are separate.

---

## File Structure

**Create:**
- `src/lib/renderMath.ts` — `renderMathInHtml(html)`: KaTeX-render `\(…\)`/`\[…\]`.
- `src/lib/renderMath.test.ts` — unit tests.

**Modify:**
- `src/lib/richText.ts` — add `renderRichText()` (sanitize → math).
- `src/components/pack/{FlashcardDeck,OverviewView,ExamSimulator,OpenQuestionsView,EssayBlueprintView,VisualMapView}.tsx` — swap `toSafeInlineHtml(` → `renderRichText(` (import + calls).
- `src/app/globals.css` — import KaTeX stylesheet.
- `src/lib/prompts.ts` — math rule in `BASE_SYSTEM_PROMPT`.
- `package.json` — add `katex` (+ `@types/katex` if needed).

---

### Task 1: KaTeX dep + `renderMathInHtml` (+ tests) + `renderRichText` + CSS

**Files:**
- Create: `src/lib/renderMath.ts`, `src/lib/renderMath.test.ts`
- Modify: `src/lib/richText.ts`, `src/app/globals.css`, `package.json`

- [ ] **Step 1: Install KaTeX**

Run: `npm install katex && npm install -D @types/katex`
Expected: `katex` in dependencies, `@types/katex` in devDependencies.

- [ ] **Step 2: Write the failing test**

Create `src/lib/renderMath.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderMathInHtml } from "./renderMath";

test("renders inline \\( \\) to KaTeX", () => {
  const out = renderMathInHtml("Formel \\(x^2\\) hier");
  assert.match(out, /class="katex"/);
  assert.doesNotMatch(out, /\\\(/); // delimiter consumed
  assert.match(out, /Formel/); // surrounding prose kept
});

test("renders display \\[ \\] in display mode", () => {
  const out = renderMathInHtml("\\[\\sum_{i=1}^{n} i\\]");
  assert.match(out, /katex-display/);
});

test("leaves prose, currency and whitelisted tags untouched", () => {
  const input = "<strong>PV</strong> = $400 bei 2,5%";
  assert.equal(renderMathInHtml(input), input);
});

test("decodes entities inside tex so inequalities render", () => {
  // toSafeInlineHtml escapes '<' to '&lt;' before this runs
  const out = renderMathInHtml("\\(a &lt; b\\)");
  assert.match(out, /class="katex"/);
});

test("malformed latex does not throw", () => {
  assert.doesNotThrow(() => renderMathInHtml("\\(\\frac{a}\\)"));
});

test("handles multiple expressions", () => {
  const out = renderMathInHtml("\\(a\\) und \\(b\\)");
  const count = (out.match(/class="katex"/g) ?? []).length;
  assert.equal(count, 2);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx tsx --test src/lib/renderMath.test.ts`
Expected: FAIL — `Cannot find module './renderMath'`.

- [ ] **Step 4: Implement `renderMath.ts`**

Create `src/lib/renderMath.ts`:

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsx --test src/lib/renderMath.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 6: Add `renderRichText` to `richText.ts`**

In `src/lib/richText.ts`, add at the top an import and below `toSafeInlineHtml` a combined entry point:

```ts
import { renderMathInHtml } from "./renderMath";

// The single entry point for rendering study-pack content: sanitize to the tag
// whitelist, then typeset any \(…\)/\[…\] math with KaTeX.
export function renderRichText(input: string): string {
  return renderMathInHtml(toSafeInlineHtml(input));
}
```

(Keep `toSafeInlineHtml` exported — `renderRichText` calls it.)

- [ ] **Step 7: Import KaTeX CSS globally**

In `src/app/globals.css`, add the KaTeX stylesheet import alongside the other top imports (CSS `@import` must precede rules):

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "katex/dist/katex.min.css";
```

- [ ] **Step 8: Typecheck + lint + test**

Run: `npx tsc --noEmit && npx eslint src/lib/renderMath.ts src/lib/richText.ts && npm test`
Expected: tsc 0; eslint clean; tests pass (64 existing + 6 new = 70).

- [ ] **Step 9: Commit**

```bash
git add src/lib/renderMath.ts src/lib/renderMath.test.ts src/lib/richText.ts src/app/globals.css package.json package-lock.json
git commit -m "feat(pack): KaTeX math rendering helper + renderRichText + CSS"
```

---

### Task 2: Route the 6 pack views through `renderRichText`

**Files:**
- Modify: `src/components/pack/FlashcardDeck.tsx`, `OverviewView.tsx`, `ExamSimulator.tsx`, `OpenQuestionsView.tsx`, `EssayBlueprintView.tsx`, `VisualMapView.tsx`

- [ ] **Step 1: Swap the call sites**

Every pack view currently does `dangerouslySetInnerHTML={{ __html: toSafeInlineHtml(x) }}` and imports `toSafeInlineHtml` from `@/lib/richText`. Replace `toSafeInlineHtml` with `renderRichText` (both the import and every call) in those 6 files only:

Run:
```bash
grep -rl "toSafeInlineHtml" src/components/pack | xargs sed -i '' 's/toSafeInlineHtml/renderRichText/g'
```
(macOS `sed -i ''`. This rewrites the import line and all calls in the component files; it does NOT touch `src/lib/richText.ts`, which keeps defining `toSafeInlineHtml`.)

- [ ] **Step 2: Verify the swap**

Run: `grep -rn "toSafeInlineHtml" src/components/pack; echo "---"; grep -rcn "renderRichText" src/components/pack`
Expected: first grep prints nothing (no leftover `toSafeInlineHtml` in views); second shows `renderRichText` present in the 6 files.

- [ ] **Step 3: Typecheck + lint + build**

Run: `npx tsc --noEmit && npx eslint src/components/pack && npm run build`
Expected: tsc 0; no NEW eslint errors; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/pack
git commit -m "feat(pack): render math in all study-pack views via renderRichText"
```

---

### Task 3: Prompt the model to emit LaTeX

**Files:**
- Modify: `src/lib/prompts.ts`

- [ ] **Step 1: Add the math rule to `BASE_SYSTEM_PROMPT`**

In `src/lib/prompts.ts`, inside the `BASE_SYSTEM_PROMPT` template, add this block (place it after the `SPRACHREGEL` block):

```
MATHE & FORMELN
Schreibe ALLE mathematischen Ausdrücke, Formeln und Variablen mit Index/Exponent als LaTeX:
- Inline in \\( … \\), abgesetzte/größere Formeln in \\[ … \\].
- NIEMALS $ als Mathe-Trenner — $ und € sind Währung und bleiben normaler Text (z. B. "$400" bleibt "$400").
- Kein Unicode-Hoch-/Tiefstellen (kein s₃, wᵢ, Σ) — immer LaTeX: s_3, w_i, \\sum.
- Beispiele: \\(r_t\\), \\((1+\\tfrac{s_3}{2})^3\\), \\[PV = \\sum_{t=1}^{n} \\frac{CF_t}{(1+r)^t}\\].
```

(The doubled backslashes are because this is inside a JS template literal — they produce single backslashes `\( \) \frac` in the actual prompt text. Verify the rendered prompt string shows single backslashes.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/prompts.ts
git commit -m "feat(prompts): require LaTeX math output (\\(…\\)/\\[…\\]), never $"
```

---

### Task 4: Verify + manual check

**Files:** none.

- [ ] **Step 1: Full suite + build**

Run: `npm test && npm run build`
Expected: 70 tests pass; build succeeds.

- [ ] **Step 2: Deploy** (so the prompt change + renderer are live): `git push` (auto-deploys) or `vercel --prod`.

- [ ] **Step 3: Manual — fresh STEM pack**

Generate a new pack from STEM material (finance/decision-theory/CS). Verify in the rendered pack:
- formulas show as typeset math (fractions, sub/superscripts, sums, Greek) — not `r_t` / `^(1/365)` literals;
- currency like `$400` / `2,5%` is unchanged;
- a non-STEM pack (e.g. a humanities subject) renders normally with no stray math artifacts.
(Old packs stay plain — expected.)

---

## Notes

- `renderRichText` runs KaTeX synchronously at render; for content without `\(`/`\[` it's a near-no-op (early return), so non-math packs pay ~nothing.
- KaTeX `throwOnError:false` means a malformed formula shows its source in KaTeX's error color rather than breaking the view.
- LaTeX backslashes survive JSON parsing because `parseModelJson` already doubles lone invalid backslashes before `JSON.parse` (existing behavior, covered by `parseModelJson.test.ts`).
