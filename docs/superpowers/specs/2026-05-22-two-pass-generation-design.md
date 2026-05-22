# Phase 2 — Two-Pass Deep Generation

**Date:** 2026-05-22
**Status:** Design — approved, pending spec review

## Context

Generation is single-pass: each section task sees the raw material and writes its
output independently, with no shared sense of what's actually exam-critical. The
"quality layer" of the product vision is a **two-pass** approach: first analyze the
material into an exam-relevance brief, then generate every section with that brief
as shared guidance — so cards, the trainer, the visual map and the overview all
target the same prioritized, exam-focused content instead of paraphrasing the
whole document evenly.

Because this adds a pass (cost + latency), it is gated to **logged-in paying / BYOK
users** (consistent with the vision policy: anonymous + Free stay single-pass).

## Scope

Add an analysis pass + inject its brief into the generation tasks, gated by plan/BYOK.

## Out of scope

- Exposing the brief to users (it's internal guidance, not a saved section).
- Two-pass for anonymous or Free generations (they keep the current single pass).
- Changing the gating/vision/retry mechanics (reused as-is).

## Design

### A. The analysis pass (Pass 1)

New prompt `TASK_ANALYSIS` (in `src/lib/prompts.ts`) reuses `BASE_SYSTEM_PROMPT` and
asks for a concise **exam-relevance brief** as plain structured text (NOT JSON):
- the 5–8 most exam-critical concepts and *why* each is tested,
- common exam-question patterns / traps for this material,
- difficulty hotspots and frequently-confused pairs,
- the key authors/sources,
- cross-references between topics,
- framed for the chosen exam type (e.g. for `open_questions`, what a grader rewards).

Keep it tight (a budget of ~4000 tokens). Pass 1's output is taken as **raw text**
(no `parseModelJson`) — it's guidance, not a schema object.

### B. Injection into Pass 2

Pass 1 sends the material blocks (with `cache_control` on the last block) + the
analysis instruction → this **writes the material cache** and returns the brief.

Pass 2 tasks then send: the **same** material blocks (a cache **hit**, since Pass 1
already wrote them) + a brief text block + the per-task instruction:

```
content: [
  ...materialBlocks,                 // cache hit from Pass 1
  { type: "text", text: `=== ANALYSE — WAS IST PRÜFUNGSRELEVANT (nutze dies zum Priorisieren) ===\n${brief}` },
  { type: "text", text: instruction },
]
```

The brief + instruction sit after the cache breakpoint (uncached, but small ~3k).
Because Pass 1 already cached the material, **Pass 2 needs no warmup** — all gated
tasks run in parallel, each reading the cached material. `runTaskOnce`/`runTask`
gain an optional `brief?: string` parameter inserted between the material blocks
and the instruction.

### C. Orchestration (`src/app/api/generate/route.ts`)

- Compute `useTwoPass` (see D). 
- **If two-pass:** run Pass 1 (analysis) first — a new `runAnalysisPass(client,
  materialBlocks, deadline)` that streams `TASK_ANALYSIS` (via `retryWithBudget`).
  On success it returns the brief AND has written the material cache, so the gated
  tasks (`activeTasksFor(examType)`) then run **all in parallel**, each with the
  brief (material is a cache hit, no warmup needed). **If Pass 1 fails** after
  retries, degrade gracefully to the single-pass path below (no brief) — that path
  has its own warmup, so the material still gets cached.
- **If single-pass:** the current path unchanged (warmup cheapest task → parallel).
- Both share the existing `deadline` (`t0 + GENERATION_BUDGET_MS`) and retry. Pass 1
  consumes part of the budget; the budget guard already prevents overruns.

### D. Gate — `src/lib/twoPass.ts` (pure, unit-tested)

```ts
export function shouldUseTwoPass(o: {
  isAnonymous: boolean;
  usesByok: boolean;
  plan: string | null; // user's plan when known (else null)
}): boolean;
```
Returns true when `!isAnonymous && (usesByok || plan === "pro" || plan === "team")`.
Anonymous, and logged-in Free, → false (single-pass). The route already computes
`usesByok` (stored/transient key) and gets the plan from the `check_pack_quota`
result for non-BYOK users; capture the plan so it's available for this gate.

### E. Cost / latency

Only on gated generations: +1 analysis call (output ~2–4k tokens) + a small
uncached brief on each Pass-2 task. Estimate +~$0.05–0.10/pack and +~30–90s. Fits
the 800s budget. No schema change; the brief is never persisted.

## Verification

- **Unit (`src/lib/twoPass.test.ts`):** anonymous → false; logged-in Free → false;
  BYOK → true; Pro/Team → true; logged-in with `plan: null` and no BYOK → false.
- **Type/lint:** `tsc --noEmit` clean; no new lint errors.
- **A/B depth check (one eval run, with explicit cost OK first):** extend
  `scripts/eval-pack.ts` with a `--two-pass` flag mirroring the route, generate the
  same DB chapter single-pass vs two-pass, and compare: does the two-pass output
  prioritize exam-critical concepts / sharper question framing? Record the cost
  delta. This is the only real-API spend and is gated on the user's go-ahead.
