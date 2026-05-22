# Haiku Tiering — Per-Task Model Routing

**Date:** 2026-05-22
**Status:** Design — approved, pending spec review

## Context

All generation runs on Claude Sonnet 4.6 ($3/$15 per 1M). Output tokens dominate
cost. The simpler / more-extractive tasks don't need Sonnet-tier quality, so
routing them to Haiku 4.5 ($1/$5) cuts cost. Haiku is ~3× cheaper on output.

Tasks split by quality sensitivity:
- **Haiku** (extractive / internal): `cards` (flashcards), `meta`
  (overview/authors/schedule/courseTitle), and the Phase-2 analysis pass.
- **Sonnet** (quality-critical, stay): `simulator`, `blueprint`, `visualMap`,
  `openQuestions`.

**Honest cost reality:** Anthropic prompt caching is **per model**, so the (shared)
material must be cached once per model tier. On **text** packs the second
(Haiku) material cache-write is tiny → tiering saves clearly (~$0.15–0.18, ~30%).
On **large vision** packs (~109k-token material) the second cache-write (~$0.14)
nearly cancels the output savings → only marginal there. Net positive overall
(most packs aren't 64-page image decks).

## Scope

Per-task model routing (Haiku for cards/meta/analysis), the grouped per-model
caching orchestration it requires, and an A/B to validate Haiku flashcard quality.

## Out of scope

- Multi-provider (Gemini/OpenAI) — separate analysis concluded it's not a clean win.
- The visual-map large-output fix (#2) — separate, model-agnostic.
- Changing which sections generate / the gate / retries / vision (reused as-is).

## Design

### A. Per-task model (testable shared map)

The routing decision lives in a small, unit-testable module
`src/lib/taskModels.ts` (shared by the route and the eval harness):

```ts
import type { GenTaskKey } from "./examTasks";

export const SONNET = "claude-sonnet-4-6";
export const HAIKU = "claude-haiku-4-5-20251001";

// Cheaper Haiku for extractive tasks; Sonnet for the quality-critical ones.
export const MODEL_FOR: Record<GenTaskKey, string> = {
  cards: HAIKU,
  meta: HAIKU,
  simulator: SONNET,
  blueprint: SONNET,
  visualMap: SONNET,
  openQuestions: SONNET,
};
```

`route.ts` imports `MODEL_FOR`/`HAIKU`: `runTaskOnce` streams with
`model: MODEL_FOR[key]` (replacing the global `MODEL` in that call), and
`runAnalysisOnce` streams with `model: HAIKU` (the analysis brief is internal
guidance — Haiku is adequate, and it only runs for paid/BYOK two-pass). The
existing `MODEL` constant can be removed if no longer referenced. `TASKS` keeps
its `{ instruction, maxTokens }` shape (no model field — the model comes from
`MODEL_FOR`).

### B. Grouped per-model orchestration (`runGatedTasks`)

Because cache is per-model, the existing single-warmup logic must become
**per-model-group**. `runGatedTasks` groups the active tasks by their model, and
for each group runs warmup-then-parallel (the cheapest **required** task — never
`visualMap`, which is best-effort — writes that model's material cache, the rest
read it). The groups run concurrently (`Promise.all` over groups), and all results
merge into the one `byKey` object (each group writes its own keys — no collision).

Two-pass interaction: the analysis pass is Haiku, so it pre-warms the **Haiku**
material cache. Therefore the Haiku group is `preCached` in two-pass mode and skips
its warmup (its tasks read the analysis-written cache); the Sonnet group always
warms itself (the analysis didn't touch Sonnet's cache). Condition:
`preCached = Boolean(brief) && groupModel === HAIKU`. A group with `preCached` or a
single task runs all-parallel; otherwise warmup-then-parallel.

The `brief` (two-pass) is still injected into **all** tasks (Haiku and Sonnet
groups), as today.

### C. Quality safeguard

Moving `cards` to Haiku is the one real quality risk (flashcards are user-facing).
Validate via the A/B below. If Haiku flashcards underperform, the fallback is a
one-line change: set `cards` back to `SONNET` in `TASKS`.

## Verification

- **Unit (`route` model map):** since the map lives in `route.ts` (server-only),
  extract the model assignment into a tiny pure helper or a typed const that a unit
  test can import — e.g. a `MODEL_FOR: Record<GenTaskKey, "sonnet-id" | "haiku-id">`
  in a small `src/lib/taskModels.ts`, unit-tested that cards/meta → Haiku and
  simulator/blueprint/visualMap/openQuestions → Sonnet. `route.ts` and the eval
  harness import it. (This keeps the routing decision testable and shared.)
- **Type/lint:** `tsc --noEmit` clean; no new lint errors.
- **A/B quality + cost (one run, explicit cost OK first):** extend
  `scripts/eval-pack.ts` to honor the per-task model map (and a flag to force
  all-Sonnet), then generate the same chapter once tiered and once all-Sonnet;
  compare flashcard quality (do Haiku cards hold up?) and record the cost delta on
  a text-ish input (where tiering should win most). Only run with the user's go-ahead.
- **Manual:** dev server generation completes and logs show cards/meta on Haiku,
  the trainer + visual map on Sonnet.
