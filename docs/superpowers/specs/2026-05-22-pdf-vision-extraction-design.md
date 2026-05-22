# PDF Vision Extraction — Capture Diagrams from Image-Heavy PDFs

**Date:** 2026-05-22
**Status:** Design — approved, pending spec review

## Context

Generation extracts only **text** from PDFs (`unpdf`). Lecture slides are
image-heavy: ER diagrams, schema figures, flow charts, the "Verstehen" cartoon —
all images, all lost. For the test material (Datenbanksysteme decks) this is the
single biggest content-quality gap: a 64-page deck yields ~16k chars (~255
chars/page) because most content is visual.

Fix: for image-heavy PDFs, send the PDF itself to Claude as a native
**`document` content block** (base64). Claude (Sonnet 4.6, multimodal) then reads
both the page text and its visuals, so diagrams flow into the cards / overview /
visual map. Document blocks are cacheable, so the existing cache-warmup and
budget-aware retries keep working.

Vision costs tokens per page (~1.5–3k/page), so it's applied **selectively** — only
to PDFs that are actually image-heavy, and never to anonymous (lead-magnet)
generations (protecting Lernly's API bill).

## Scope

Selective PDF vision via native document blocks, gated by text-density, with
cost guards. Plus a prompt note so Claude uses the visuals.

## Out of scope

- Rendering pages to images ourselves (native PDF document blocks do text+vision).
- OCR of scanned text-only PDFs (a separate concern).
- Vision for anonymous generations (always text-only).
- Changing the existing per-task gating, retries, or caching mechanics.

## Design

### A. Per-file decision: vision vs text (`route.ts` file loop)

For each uploaded file, after `extractPdfText` gives `{ text, pages }`:
- Compute `charsPerPage = text.length / Math.max(pages, 1)`.
- Use **vision** (send the PDF as a `document` block) when ALL hold:
  - the file is a PDF,
  - the request is **not anonymous** (`!isAnonymous`),
  - `charsPerPage < VISION_CHARS_PER_PAGE` (image-heavy),
  - `pages <= VISION_MAX_PAGES` (Anthropic's per-PDF limit),
  - the running vision-page total + `pages <= VISION_MAX_TOTAL_PAGES` (cost cap).
- Otherwise use **text** (current behavior: extracted text, with the existing
  `PDF_CHAR_BUDGET` truncation). TXT/MD are always text.

Keep `extractPdfText` for every PDF regardless — the density check, anon
page/char limits, and logging all need the extracted text and page count.

Constants (in `route.ts`):
- `VISION_CHARS_PER_PAGE = 800` (below → image-heavy; tuned via eval),
- `VISION_MAX_PAGES = 100`, `VISION_MAX_TOTAL_PAGES = 150`.

### B. Material as content blocks (`route.ts`)

Replace the single `materialText` string with a `materialBlocks: ContentBlock[]`
array built in the file loop:
- A leading text block with the exam format + optional extra info.
- Per file: either a **document** block
  `{ type: "document", source: { type: "base64", media_type: "application/pdf", data: <base64> } }`
  (vision) or a **text** block `--- name (N Seiten) ---\n<text>` (text path).
- Put the cache breakpoint `cache_control: { type: "ephemeral" }` on the **last**
  material block so the whole material prefix (system + exam text + all files) is
  cached, and the per-task instruction (appended after) is not.

`runTaskOnce` takes `materialBlocks` instead of `materialText` and builds the
message content as `[...materialBlocks, { type: "text", text: instruction }]`.
The orchestration assembles `materialBlocks` once and passes it to every task
(so all share the cache), exactly as `materialText` is passed today.

### C. Limits / cost guards

- Anonymous: vision is off entirely (the `!isAnonymous` gate in A). Existing anon
  page/char limits unchanged.
- Logged-in: a PDF over `VISION_MAX_PAGES` falls back to text (can't vision it).
- `VISION_MAX_TOTAL_PAGES` caps total vision pages per generation; once exceeded,
  remaining image-heavy PDFs fall back to text. Bounds worst-case cost.
- Log per generation which files went vision vs text, and total vision pages.

### D. Prompt note (`src/lib/prompts.ts`)

Add one line to `BASE_SYSTEM_PROMPT`: the material may contain diagrams/figures
(e.g. ER diagrams, schemas, charts) — use them for concepts and especially the
Visual Map. So Claude actively leverages the visuals it now sees.

### E. Eval harness (`scripts/eval-pack.ts`)

Mirror the per-file vision/text decision and document-block assembly, so we can
measure real cost and quality on the DB decks. The harness already logs token
usage and a content summary.

## Verification

- **Measure on real material (the point of the eval harness):** run
  `scripts/eval-pack.ts` on the DB PDFs and confirm (a) the image-heavy decks are
  sent as vision, (b) generated content now references diagram content (e.g. ER
  notation, the design-phase figure) that was previously missing, (c) the cost
  delta vs text-only is acceptable, and tune `VISION_CHARS_PER_PAGE` accordingly.
- **Text-rich path unchanged:** a text-rich PDF (high chars/page) still goes the
  text route — verify via a TXT/MD or a dense PDF (vision NOT triggered).
- **Anon stays text-only:** an anonymous request never sends a document block.
- **Type/lint:** `tsc --noEmit` clean; `npm test` passes (no unit-testable core
  here beyond the density predicate — extract `shouldUseVision(...)` as a pure,
  tested helper).
