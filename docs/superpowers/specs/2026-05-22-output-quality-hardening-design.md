# Lernly — Output-Quality & Generation Hardening

**Date:** 2026-05-22
**Status:** Design — approved scope, pending spec review

## Context

The goal was to "focus on the main product and perfect it," specifically **output
quality**. The working hypothesis was that the generation prompts are BWL-biased
and might need per-subject variants plus a subject picker.

We tested this by generating a baseline pack from real, deliberately off-domain
material — three TUM **Datenbanksysteme** lecture chapters (Kemper/Eickler) — via a
new throwaway eval harness (`scripts/eval-pack.ts`) that mirrors `/api/generate`'s
extraction + prompt assembly without the web/auth/quota layer.

The result inverted the hypothesis:

- **Content quality generalized to CS well.** Simulator scenarios were domain-
  appropriate (server crash, concurrent writes), Visual Map mnemonics/2x2/cross-
  references were real and accurate, Overview was exam-relevant, authors correctly
  attributed (Codd, Chen, Kemper/Eickler). BWL bias appeared only as occasional,
  mostly-harmless company analogies. → **Per-subject prompts + a subject picker are
  not justified and are explicitly out of scope.**
- **A critical, subject-triggered bug surfaced:** relational-algebra notation
  (`\` difference operator, division formulas like `π(R1\R2)`) emits raw
  backslashes inside JSON strings → invalid escape sequences → `JSON.parse` throws
  → **0 flashcards**. In production, `Promise.all` rejects on this → the *entire*
  generation returns 500 and the user gets nothing. Affects any notation-heavy
  subject (math, theoretical CS, logic, physics/LaTeX).
- Secondary issues: one failing task kills the whole pack; ~176s vs the UI's
  promised "~30–60 Sekunden"; ~$0.64/pack with wasted prompt caching (5× cache
  write, 0 reads).

A pair-aware backslash sanitizer was prototyped offline and recovered all 27
flashcards from the failing output, confirming the fix.

## Scope (approved)

1. Backslash/JSON robustness fix (critical)
2. Pipeline robustness (one task must not kill the pack)
3. Cost via prompt-cache reuse + honest speed expectations
4. Light prompt de-bias (single adaptive prompt, no picker)

## Out of scope

- Per-subject prompt variants and a subject picker (evidence does not support the
  need; high maintenance, adds funnel friction).
- Actively cutting content volume for speed (user prioritizes richness).
- Multimodal/image extraction for slide diagrams (real but separate effort; noted
  as a future lever for image-heavy slide decks).

## Design

### 1. Shared, hardened JSON parser

`parseJsonResponse` is currently duplicated in `src/app/api/generate/route.ts`
(lines ~93–119) and `scripts/generate-demo-pack.ts`. Extract to a single module:

- New file `src/lib/parseModelJson.ts` exporting `parseModelJson(raw: string): unknown`.
- Carry over the existing cleaning (strip code fences, slice to outer braces, trailing-
  comma removal, newline-in-string fallback).
- Add a **pair-aware backslash sanitizer** applied before `JSON.parse`: walk the
  string left-to-right; keep valid escape pairs (`\" \\ \/ \b \f \n \r \t \u`)
  untouched; double any other lone backslash. (A naive global regex breaks valid
  `\\` pairs — must be the stateful walk proven in the spike.)
- Update `route.ts`, `generate-demo-pack.ts`, and `eval-pack.ts` to import it.

### 2. Pipeline robustness

In `src/app/api/generate/route.ts`:

- Add **one retry** inside `runTask` when JSON parsing fails or on a transient/abort
  error (re-issue the same task once before throwing). With the sanitizer, this makes
  hard failures rare.
- **No silent-empty packs:** treat `flashcards.length === 0` after generation as a
  hard error (clear message), instead of saving a schema-"valid" empty pack.
  (`StudyPackSchema.flashcards` has no min-length — see `src/lib/schema.ts:185`.)
- Keep `visualMap` best-effort (`.optional()` in schema, already `.catch`-wrapped).
  `simulator`, `overview`, `authors`, `schedule`, `essayBlueprint` remain required;
  the retry covers their transient failures.

### 3. Cost — prompt-cache reuse + honest speed

In `src/app/api/generate/route.ts`:

- Replace the all-parallel `Promise.all` with a **cache warmup**: run the cheapest
  task (`blueprint`, ~11s, ~0.6k out) first so it writes the material cache, then run
  the remaining four in parallel — they hit `cache_read` instead of each doing a
  `cache_write`. Expected: ~$0.24/pack saved (~38%); +~11s latency (noise on a ~3-min
  op). Verify via the `cacheR/cacheW` counters the eval harness already logs.

Honest speed expectations (no content cuts):

- Update the upload UI copy in `src/app/dashboard/new/page.tsx` ("Generierung dauert
  ~30–60 Sekunden", line ~350) and any equivalent landing-page/anonymous copy to
  "~1–3 Minuten". The existing `GenerationProgress` component covers the wait.

### 4. Prompt de-bias (single adaptive prompt)

In `src/lib/prompts.ts`:

- `BASE_SYSTEM_PROMPT`: persona "21-jährigen BWL-Studenten" → subject-neutral
  "Uni-Studenten (ADHS, 3–7 Tage vor der Klausur, visueller Lerner)".
- Replace the hardcoded "ECHTE FIRMEN als Beispiele: Netflix, Apple, …" rule with a
  domain-adaptive rule: "KONKRETE, zur Domäne des Materials passende Beispiele —
  Wirtschaft → echte Firmen; Informatik → reale Systeme/Datensätze/Algorithmen;
  Naturwissenschaft → konkrete Phänomene/Experimente. Nie generische Platzhalter."
- Soften the same company-example phrasing where it repeats in `TASK_CARDS`,
  `TASK_SIMULATOR`, `TASK_VISUAL_MAP` to "domänen-passende konkrete Beispiele". Keep
  the illustrative anti-pattern examples and the already-conditional framework rules
  ("matrix2x2 wenn das Material eine 2x2-Logik hat").

## Verification

- **Unit:** test `parseModelJson` against the captured failing card output
  (`scripts/eval-output/raw/cards.txt`) — must parse and yield 27 cards. Add small
  fixtures: valid `\\` preserved, lone `\R`/`\)`/`\=` doubled, trailing commas, code
  fences.
- **End-to-end (eval harness):** re-run
  `npx tsx scripts/eval-pack.ts multiple_choice ~/Desktop/kapitel0{1,2,3}.pdf`
  → flashcards > 0, schema valid, and confirm `cacheR > 0` on the four post-warmup
  tasks (caching fix). Compare reported cost vs the ~$0.64 baseline.
- **Manual:** run the dev server, generate from the DB PDFs through `/dashboard/new`,
  open the pack, confirm flashcards render and the math notation displays correctly.
- **Type/lint:** `tsc` + eslint clean.
