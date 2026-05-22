# PDF Vision Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send image-heavy PDFs to Claude as native `document` blocks (so it reads diagrams/figures, not just text) — selectively, by text-density, never for anonymous requests, within cost guards.

**Architecture:** A pure `shouldUseVision()` helper decides per file. The generation route builds the material as an array of content blocks (`document` for vision PDFs, `text` otherwise) with the cache breakpoint on the last block, and threads that array through the existing retry/orchestration. The eval harness mirrors the logic to measure cost + quality on real decks.

**Tech Stack:** Next.js route handlers, TypeScript, `@anthropic-ai/sdk` (0.91 — `Anthropic.Messages.ContentBlockParam`, `DocumentBlockParam`, `Base64PDFSource`), `unpdf`, `tsx` + `node:test`.

Spec: `docs/superpowers/specs/2026-05-22-pdf-vision-extraction-design.md`

---

## File Structure

- **Create** `src/lib/pdfVision.ts` — pure `shouldUseVision(opts)` predicate. + test.
- **Modify** `src/app/api/generate/route.ts` — vision constants; file loop builds `materialBlocks: ContentBlockParam[]`; `runTaskOnce`/`runTask` thread the block array; message content assembly.
- **Modify** `src/lib/prompts.ts` — one line in `BASE_SYSTEM_PROMPT` about using diagrams.
- **Modify** `scripts/eval-pack.ts` — mirror the vision decision + block assembly for measurement.

---

## Task 1: `shouldUseVision` predicate + tests

**Files:**
- Create: `src/lib/pdfVision.ts`
- Test: `src/lib/pdfVision.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/pdfVision.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldUseVision, type VisionDecisionInput } from "./pdfVision";

function input(over: Partial<VisionDecisionInput> = {}): VisionDecisionInput {
  return {
    isPdf: true,
    isAnonymous: false,
    charsPerPage: 250, // image-heavy
    pages: 30,
    visionPagesSoFar: 0,
    charsPerPageThreshold: 800,
    maxPages: 100,
    maxTotalPages: 150,
    ...over,
  };
}

test("vision for an image-heavy logged-in PDF within limits", () => {
  assert.equal(shouldUseVision(input()), true);
});

test("no vision for anonymous requests", () => {
  assert.equal(shouldUseVision(input({ isAnonymous: true })), false);
});

test("no vision for text-rich PDFs (charsPerPage >= threshold)", () => {
  assert.equal(shouldUseVision(input({ charsPerPage: 2000 })), false);
});

test("no vision for non-PDF files", () => {
  assert.equal(shouldUseVision(input({ isPdf: false })), false);
});

test("no vision when PDF exceeds maxPages", () => {
  assert.equal(shouldUseVision(input({ pages: 120 })), false);
});

test("no vision when it would exceed the total-pages cap", () => {
  assert.equal(shouldUseVision(input({ pages: 40, visionPagesSoFar: 130 })), false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node_modules/.bin/tsx --test src/lib/pdfVision.test.ts`
Expected: FAIL (Cannot find module './pdfVision').

- [ ] **Step 3: Implement `src/lib/pdfVision.ts`**

```ts
export type VisionDecisionInput = {
  isPdf: boolean;
  isAnonymous: boolean;
  charsPerPage: number;
  pages: number;
  visionPagesSoFar: number;
  charsPerPageThreshold: number;
  maxPages: number;
  maxTotalPages: number;
};

// Use Claude vision (send the PDF as a document block) only for image-heavy
// PDFs from logged-in users, within Anthropic's per-PDF page limit and a total
// per-generation cap that bounds cost.
export function shouldUseVision(o: VisionDecisionInput): boolean {
  if (!o.isPdf) return false;
  if (o.isAnonymous) return false;
  if (o.charsPerPage >= o.charsPerPageThreshold) return false;
  if (o.pages > o.maxPages) return false;
  if (o.visionPagesSoFar + o.pages > o.maxTotalPages) return false;
  return true;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node_modules/.bin/tsx --test src/lib/pdfVision.test.ts`
Expected: 6 tests pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdfVision.ts src/lib/pdfVision.test.ts
git commit -m "feat(generate): shouldUseVision predicate for selective PDF vision"
```

---

## Task 2: Route — build material as content blocks with selective vision

**Files:**
- Modify: `src/app/api/generate/route.ts`
- Modify: `src/lib/prompts.ts`

- [ ] **Step 1: Imports + constants (`route.ts`)**

Add the import near the other `@/lib` imports:

```ts
import { shouldUseVision } from "@/lib/pdfVision";
```

Add these constants near the other generation constants (e.g. below `PDF_CHAR_BUDGET`):

```ts
const VISION_CHARS_PER_PAGE = 800; // below this (chars/page) a PDF is image-heavy
const VISION_MAX_PAGES = 100; // Anthropic per-PDF document limit
const VISION_MAX_TOTAL_PAGES = 150; // cost cap on vision pages per generation
```

- [ ] **Step 2: Replace the file loop + `materialText` assembly with content-block assembly**

Read the file loop. It currently declares `let totalChars = 0; const fileSummaries: string[] = []; const fileSections: string[] = [];`, loops files (extract text, anon page-limit check, char-budget truncation, push to `fileSummaries`/`fileSections`), then the `if (isAnonymous && totalChars > ANON_MAX_CHARS)` check, then builds `const materialText = [ ... fileSections.join("\n\n") ].filter(Boolean).join("\n");`.

Replace that entire span (from `let totalChars = 0;` through the `const materialText = [...]` assignment) with:

```ts
    let totalChars = 0;
    let visionPagesUsed = 0;
    const fileSummaries: string[] = [];
    const materialBlocks: Anthropic.Messages.ContentBlockParam[] = [];

    materialBlocks.push({
      type: "text",
      text: [
        `Prüfungsformat: ${EXAM_LABEL[examType]}`,
        extraInfo.trim() ? `Zusatzinfos zur Prüfung: ${extraInfo.trim()}` : "",
        "",
        "=== KURSMATERIAL ===",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const name = file.name;
      const lower = name.toLowerCase();
      const isPdf = lower.endsWith(".pdf");

      let text: string;
      let pageInfo = "";
      let pageCount = 0;
      if (isPdf) {
        try {
          const extracted = await extractPdfText(buffer, name);
          text = extracted.text;
          pageCount = extracted.pages;
          pageInfo = ` (${extracted.pages} Seiten)`;
        } catch (e) {
          const msg =
            e instanceof Error ? e.message : `Konnte ${name} nicht lesen.`;
          return NextResponse.json({ error: msg }, { status: 422 });
        }
      } else {
        text = buffer.toString("utf-8");
      }

      if (isAnonymous && pageCount > ANON_MAX_PAGES) {
        return NextResponse.json(
          {
            error: `Ohne Account ist max. ${ANON_MAX_PAGES} Seiten pro PDF erlaubt — ${name} hat ${pageCount}. Logge dich ein, um größere PDFs hochzuladen.`,
            reason: "anonymous_page_limit",
          },
          { status: 413 },
        );
      }

      const charsPerPage = pageCount > 0 ? text.length / pageCount : Infinity;
      const useVision = shouldUseVision({
        isPdf,
        isAnonymous,
        charsPerPage,
        pages: pageCount,
        visionPagesSoFar: visionPagesUsed,
        charsPerPageThreshold: VISION_CHARS_PER_PAGE,
        maxPages: VISION_MAX_PAGES,
        maxTotalPages: VISION_MAX_TOTAL_PAGES,
      });

      if (useVision) {
        visionPagesUsed += pageCount;
        materialBlocks.push({
          type: "text",
          text: `--- ${name}${pageInfo} (bild-lastiges PDF, als Dokument gesendet) ---`,
        });
        materialBlocks.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: buffer.toString("base64"),
          },
        });
        fileSummaries.push(`${name}${pageInfo}: VISION (${pageCount} Seiten)`);
      } else {
        let t = text;
        if (t.length > PDF_CHAR_BUDGET) {
          t =
            t.slice(0, PDF_CHAR_BUDGET) +
            `\n\n[... ${name} wurde nach ${PDF_CHAR_BUDGET.toLocaleString("de-DE")} Zeichen gekürzt ...]`;
        }
        totalChars += t.length;
        materialBlocks.push({
          type: "text",
          text: `--- ${name}${pageInfo} ---\n${t}`,
        });
        fileSummaries.push(
          `${name}${pageInfo}: ${t.length.toLocaleString("de-DE")} Zeichen`,
        );
      }
    }

    if (isAnonymous && totalChars > ANON_MAX_CHARS) {
      return NextResponse.json(
        {
          error: `Ohne Account ist max. ${ANON_MAX_CHARS.toLocaleString("de-DE")} Zeichen erlaubt — du hast ${totalChars.toLocaleString("de-DE")}. Logge dich ein für größere Pakete.`,
          reason: "anonymous_char_limit",
        },
        { status: 413 },
      );
    }

    // Cache the whole material prefix; the per-task instruction (appended later)
    // stays uncached so each task reuses the cached material.
    const lastBlock = materialBlocks[materialBlocks.length - 1];
    if (lastBlock) lastBlock.cache_control = { type: "ephemeral" };
```

- [ ] **Step 3: Update the generation log line**

The next line logs `"...total chars:", totalChars.toLocaleString("de-DE")`. Replace that `console.log(...)` with one that also reports vision usage:

```ts
    console.log(
      "[/api/generate] starting generation, files:",
      fileSummaries,
      "text chars:",
      totalChars.toLocaleString("de-DE"),
      "vision pages:",
      visionPagesUsed,
      "key:",
      keySource,
      "user:",
      user?.id ?? "anon",
    );
```

(If the existing log uses different trailing fields, keep them; just swap the data source from `materialText` to `materialBlocks`/`visionPagesUsed` so nothing references the now-removed `materialText`.)

- [ ] **Step 4: Thread `materialBlocks` through `runTaskOnce` and `runTask`**

Change `runTaskOnce`'s `materialText: string` parameter to:

```ts
  materialBlocks: Anthropic.Messages.ContentBlockParam[],
```

Inside `runTaskOnce`, the `client.messages.stream(...)` call currently builds
`content: [ { type: "text", text: materialText, cache_control: { type: "ephemeral" } }, { type: "text", text: instruction } ]`.
Replace that `content` with (the material blocks already carry the cache breakpoint):

```ts
          content: [
            ...materialBlocks,
            { type: "text", text: instruction },
          ],
```

Change `runTask`'s `materialText: string` parameter to `materialBlocks: Anthropic.Messages.ContentBlockParam[]` and pass it through to `runTaskOnce` (the `retryWithBudget` attemptFn becomes `(attemptTimeoutMs) => runTaskOnce(client, key, materialBlocks, attemptTimeoutMs)`).

- [ ] **Step 5: Update the orchestration call sites**

In the `runOne` closure, both `runTask(client, k, materialText, deadline)` calls must pass `materialBlocks` instead: `runTask(client, k, materialBlocks, deadline)`. (There are no other `runTask`/`runTaskOnce` call sites.)

- [ ] **Step 6: Prompt note (`src/lib/prompts.ts`)**

In `BASE_SYSTEM_PROMPT`, add this line to the QUALITÄTS-MESSLATTE bullet list (after the BOLD-HIGHLIGHTS bullet):

```
- DIAGRAMME NUTZEN: Das Material kann Abbildungen/Diagramme enthalten (z.B. ER-Diagramme, Schaubilder, Tabellen). Lies sie und baue ihren Inhalt in Konzepte, Karten und v.a. die Visual Map ein — nicht nur den Fließtext.
```

- [ ] **Step 7: Verify**

Run: `node_modules/.bin/tsc --noEmit` → 0 errors (confirm no dangling `materialText` reference: `grep -n "materialText" src/app/api/generate/route.ts` → nothing).
Run: `npm test` → all pass.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/generate/route.ts src/lib/prompts.ts
git commit -m "feat(generate): selective PDF vision via document blocks"
```

---

## Task 3: Eval-harness mirror + measure on real decks

**Files:**
- Modify: `scripts/eval-pack.ts`

- [ ] **Step 1: Mirror the vision logic in the harness**

In `scripts/eval-pack.ts`: import the predicate and add the constants:

```ts
import { shouldUseVision } from "../src/lib/pdfVision";
```
```ts
const VISION_CHARS_PER_PAGE = 800;
const VISION_MAX_PAGES = 100;
const VISION_MAX_TOTAL_PAGES = 150;
```

The harness builds a `materialText` string from `fileSections` and `runTask` sends it as a single text block. Change it to build a `materialBlocks: Anthropic.Messages.ContentBlockParam[]` array exactly like the route (it treats every file as logged-in — `isAnonymous: false`), set `cache_control` on the last block, and change `runTask` to send `content: [...materialBlocks, { type: "text", text: instruction }]`. Keep the per-file extraction (for the density decision) and the existing usage/cost logging. Log per file whether it went vision or text, and the total vision pages.

- [ ] **Step 2: Verify types**

Run: `node_modules/.bin/tsc --noEmit` → 0 errors.
Run: `npm test` → all pass.

- [ ] **Step 3: Commit**

```bash
git add scripts/eval-pack.ts
git commit -m "test(generate): mirror selective PDF vision in eval harness"
```

- [ ] **Step 4: Measure on the real DB decks (the point of this feature)**

Run: `node_modules/.bin/tsx scripts/eval-pack.ts multiple_choice /Users/rdb/Desktop/kapitel01.pdf /Users/rdb/Desktop/kapitel02.pdf /Users/rdb/Desktop/kapitel03.pdf --slug=vision-verify`

Confirm in the output:
- the three image-heavy decks are sent as VISION (logged the decision per file, total vision pages),
- generated content now references diagram-only content that text extraction missed (e.g. ER-diagram notation/symbols, the design-phase figure, relationship cardinalities drawn as diagrams),
- record the cost vs the earlier text-only baseline (~$0.40–0.64) so we know the real vision cost,
- `schema valid: true`, flashcards/visual map/overview populated.

If vision didn't trigger (chars/page came out above 800) or cost is unreasonable, adjust `VISION_CHARS_PER_PAGE` in BOTH `route.ts` and `eval-pack.ts` and re-run. Commit any threshold change:

```bash
git add src/app/api/generate/route.ts scripts/eval-pack.ts
git commit -m "tune(generate): adjust vision text-density threshold from measurement"
```

- [ ] **Step 5: Manual happy-path + regression**

Run: `npm run dev`. Generate from `/dashboard/new` (logged in) with the DB PDFs → confirm it completes and the visual map/overview reference diagram content. Generate a text-rich source (TXT/MD or a dense PDF) → confirm it still works (vision not triggered). Confirm `tsc --noEmit` clean and `npm run lint` has no new errors in changed files.

---

## Verification (end of plan)

- `npm test` — all suites pass (including the 6 `pdfVision` tests).
- `tsc --noEmit` — 0 errors; no dangling `materialText` reference in `route.ts`.
- Eval-harness run on the DB decks shows VISION used and diagram content captured; cost recorded; threshold tuned if needed.
- Anonymous path stays text-only (the `isAnonymous` gate in `shouldUseVision`).

---

## Self-Review

**Spec coverage:**
- A (per-file vision/text decision by density) → Task 1 (`shouldUseVision`) + Task 2 Step 2. ✓
- B (material as content blocks; cache breakpoint on last; instruction uncached) → Task 2 Steps 2, 4. ✓
- C (limits/guards: ≤100 pages, total cap, anon text-only, logging) → Task 1 + Task 2 Steps 2–3. ✓
- D (prompt note) → Task 2 Step 6. ✓
- E (eval-harness mirror) → Task 3 Steps 1–3. ✓
- Verification (measure cost+quality, tune threshold, anon text-only, text-rich unchanged) → Task 3 Steps 4–5. ✓

**Placeholder scan:** none. Every code step is complete; the document-block shape uses the verified SDK types (`Anthropic.Messages.ContentBlockParam`, `media_type: "application/pdf"`, `cache_control`).

**Type consistency:** `VisionDecisionInput` field names (Task 1) match the `shouldUseVision({...})` call in Task 2 Step 2 (`isPdf`, `isAnonymous`, `charsPerPage`, `pages`, `visionPagesSoFar`, `charsPerPageThreshold`, `maxPages`, `maxTotalPages`). `materialBlocks: Anthropic.Messages.ContentBlockParam[]` is consistent across the route loop, `runTask`, `runTaskOnce`, and the harness. The constants (`VISION_CHARS_PER_PAGE`/`VISION_MAX_PAGES`/`VISION_MAX_TOTAL_PAGES`) match between route and harness.
