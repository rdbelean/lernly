# Regenerate Demo Packs from DB Material (gated + vision)

**Date:** 2026-05-22
**Status:** Design — approved, pending spec review

## Context

The 3 landing-page demo packs (`public/demo-packs/{strategic-mgmt,global-strategy,
diversification}.json`) are stale: they were made with the old generator and
contain **all 5 sections** ("everything at once"), which no longer matches the
shipped product (exam-type gating → core + one trainer; selective PDF vision).
The original strategy source PDFs are gone, but we have the **Datenbanksysteme
decks** (kapitel01–03) — image-heavy, perfect for showcasing the new vision +
gating. So we regenerate the demos from the DB material and re-theme the landing
section accordingly.

## Scope

Update the demo generator to the new pipeline, regenerate 3 DB demos with varied
exam types, and re-theme `DemoPacksSection`.

## Out of scope

- Keeping the strategy theme (no source PDFs).
- Changing the production route or the live generation pipeline (already shipped).

## Design

### A. Update the generator (`scripts/generate-demo-pack.ts`)

It currently runs all 5 tasks in parallel with text-only material (the pre-gating
generator). Bring it to parity with the production route (`src/app/api/generate/
route.ts`):
- **Gating:** use `activeTasksFor(examType)` from `src/lib/examTasks.ts` — generate
  only the core (`cards`, `meta`, `visualMap`) + the one matching trainer.
- **Vision:** mirror the route's per-file `shouldUseVision` (`src/lib/pdfVision.ts`)
  + content-block assembly (`document` block for image-heavy PDFs, cache breakpoint
  on the last block). The demo generator treats input as logged-in (`isAnonymous:
  false`), so the DB decks trigger vision.
- **Robustness:** wrap each task in `retryWithBudget` (`src/lib/retry.ts`) with a
  generous local deadline (this is a CLI script, not Vercel — e.g. `now + 600_000`),
  since vision generations are slow and the API has been dropping connections.
- Merge conditionally (only the generated trainer present), validate with
  `StudyPackSchema`, write to `public/demo-packs/<slug>.json`.
- **Carry over the buffer-detach fix:** this file has its own `extractPdfText`
  with the `new Uint8Array(buffer.buffer, …)` view pattern that pdf.js detaches —
  same bug fixed in the route. Change it to `new Uint8Array(buffer)` (copy) so the
  buffer survives for the vision base64.

### B. The 3 demos (chapter → exam type)

| Source | slug | examType | trainer |
|---|---|---|---|
| kapitel01.pdf (Einführung) | `db-grundlagen` | `multiple_choice` | Simulator |
| kapitel02.pdf (Datenbankentwurf/ER) | `db-entwurf` | `open_questions` | Open-Questions Trainer |
| kapitel03.pdf (Relationales Modell) | `db-relational` | `open_book` | Blueprint |

All get the universal core + vision (image-heavy → diagrams captured). This shows
all three trainer types plus the new diagram capability.

### C. Re-theme `DemoPacksSection.tsx`

Replace the 3 `DEMOS` entries with DB-themed ones. Each `DemoEntry` needs:
`slug` (new DB slugs above), `exam` + `examLabel` (match the new exam types),
`title`/`subtitle`/`origin` (DB themes, e.g. "Datenbanksysteme", "Datenbankentwurf",
"Relationales Modell"; origin "TU München · Kemper/Eickler · DE"), `stats` (read
the real `cards`/questions/`topics` counts from each generated JSON), `preview`
snippets (rewrite to DB content matching each demo's trainer), and `featured`
(keep one featured — the `db-entwurf` open-questions one, to spotlight the new
trainer + diagrams).

The `db-entwurf` demo is `open_questions`, but the current `PreviewKind` only has
`flashcard`/`quiz`/`blueprint`. Add an **`openQuestion`** preview kind + a small
render branch (question + a "Musterlösung"/keypoints teaser) so its card preview is
honest. The other two reuse existing kinds (flashcard + quiz for MC; flashcard +
blueprint for open_book).

Delete the 3 old strategy JSONs from `public/demo-packs/`.

### D. Run + verify

- Run the updated generator 3× (one per chapter/exam type). Real API + vision —
  ~$2–3 total, several minutes, possibly flaky (re-run a failed one; the retry
  wrapper should mostly handle it).
- Confirm each JSON: gated sections present (core + the one trainer, no others),
  schema valid, and diagram-derived content present (e.g. kapitel02 shows ER
  notation / the design-phase figure from vision).
- Update the `DemoPacksSection` `stats` to the real counts.
- Review live: the 3 demo cards render with DB themes + correct previews; opening
  a demo shows only its gated tabs and the diagram content.

## Verification

- `tsc --noEmit` clean; `npm run lint` no new errors in changed files.
- Each generated demo JSON validates against `StudyPackSchema` and contains only
  its gated sections.
- Manual: dev server → landing demo section shows the 3 DB demos; open each →
  correct tabs (e.g. `db-entwurf` shows Offene Fragen, not a simulator), diagrams
  reflected in visual map / overview.
- No leftover references to the old slugs (`strategic-mgmt`/`global-strategy`/
  `diversification`) in `src/` or `public/demo-packs/`.
