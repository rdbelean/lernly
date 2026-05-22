# Haiku Tiering — Per-Task Model Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route the extractive generation tasks (cards, meta, the analysis pass) to the cheaper Claude Haiku 4.5, keep the quality-critical ones on Sonnet 4.6 — via a shared, testable model map and a per-model-grouped cache warmup.

**Architecture:** A pure `MODEL_FOR` map in `src/lib/taskModels.ts` decides each task's model. The route's `runTaskOnce` uses `MODEL_FOR[key]`; the analysis pass uses Haiku. Because Anthropic prompt caching is per-model, `runGatedTasks` groups active tasks by model and warms each model's material cache separately (the two-pass Haiku analysis pre-warms the Haiku tier).

**Tech Stack:** Next.js route handler, TypeScript, `@anthropic-ai/sdk`, `tsx` + `node:test`.

Spec: `docs/superpowers/specs/2026-05-22-haiku-tiering-design.md`

---

## File Structure

- **Create** `src/lib/taskModels.ts` — `SONNET`/`HAIKU` + `MODEL_FOR` map. + test.
- **Modify** `src/app/api/generate/route.ts` — use `MODEL_FOR[key]`, Haiku analysis, grouped per-model warmup, drop the now-unused `MODEL` const.
- **Modify** `scripts/eval-pack.ts` — honor `MODEL_FOR` + an `--all-sonnet` flag for the A/B.

---

## Task 1: `taskModels.ts` map + tests

**Files:**
- Create: `src/lib/taskModels.ts`
- Test: `src/lib/taskModels.test.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/taskModels.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { MODEL_FOR, SONNET, HAIKU } from "./taskModels";

test("extractive tasks route to Haiku", () => {
  assert.equal(MODEL_FOR.cards, HAIKU);
  assert.equal(MODEL_FOR.meta, HAIKU);
});

test("quality-critical tasks stay on Sonnet", () => {
  for (const k of ["simulator", "blueprint", "visualMap", "openQuestions"] as const) {
    assert.equal(MODEL_FOR[k], SONNET);
  }
});

test("SONNET and HAIKU are distinct model ids", () => {
  assert.notEqual(SONNET, HAIKU);
});
```

- [ ] **Step 2: Run, confirm fail**

Run: `node_modules/.bin/tsx --test src/lib/taskModels.test.ts`
Expected: FAIL (Cannot find module './taskModels').

- [ ] **Step 3: Implement `src/lib/taskModels.ts`**

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

- [ ] **Step 4: Run, confirm pass**

Run: `node_modules/.bin/tsx --test src/lib/taskModels.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/taskModels.ts src/lib/taskModels.test.ts
git commit -m "feat(generate): per-task model map (Haiku for cards/meta)"
```

---

## Task 2: Route — per-task model + grouped per-model warmup

**Files:**
- Modify: `src/app/api/generate/route.ts`

- [ ] **Step 1: Import the map**

Add to the `@/lib` imports:
```ts
import { MODEL_FOR, HAIKU } from "@/lib/taskModels";
```

- [ ] **Step 2: Use the per-task model in `runTaskOnce`**

In `runTaskOnce`'s `client.messages.stream({ ... })`, change `model: MODEL,` to:
```ts
        model: MODEL_FOR[key],
```

- [ ] **Step 3: Analysis pass uses Haiku**

In `runAnalysisOnce`'s stream call, change `model: MODEL,` to:
```ts
        model: HAIKU,
```

- [ ] **Step 4: Drop the now-unused `MODEL` constant**

`MODEL` (the `const MODEL = "claude-sonnet-4-6";` line) is no longer referenced in `route.ts` after Steps 2–3. Delete that line. (Confirm with `grep -n "\bMODEL\b" src/app/api/generate/route.ts` → only `MODEL_FOR` should remain.)

- [ ] **Step 5: Replace `runGatedTasks` with the model-grouped version**

Replace the entire `runGatedTasks` function with:
```ts
async function runGatedTasks(
  client: Anthropic,
  materialBlocks: Anthropic.Messages.ContentBlockParam[],
  deadlineMs: number,
  examType: ExamType,
  brief?: string,
): Promise<Partial<Record<GenTaskKey, unknown>>> {
  const active = activeTasksFor(examType);
  const runOne = (k: GenTaskKey): Promise<unknown> =>
    k === "visualMap"
      ? runTask(client, k, materialBlocks, deadlineMs, brief)
          .then((r) => (r as { visualMap?: unknown }).visualMap ?? null)
          .catch((e) => {
            console.error("[/api/generate] visualMap soft-failed", e);
            return null;
          })
      : runTask(client, k, materialBlocks, deadlineMs, brief);

  // Anthropic prompt caching is per-model, so each model tier caches the
  // material independently — group the active tasks by model and warm each
  // group's cache separately.
  const groups = new Map<string, GenTaskKey[]>();
  for (const k of active) {
    const m = MODEL_FOR[k];
    const arr = groups.get(m);
    if (arr) arr.push(k);
    else groups.set(m, [k]);
  }

  const byKey: Partial<Record<GenTaskKey, unknown>> = {};
  await Promise.all(
    [...groups].map(async ([model, keys]) => {
      // In two-pass the analysis pass (Haiku) already warmed the Haiku cache.
      const preCached = Boolean(brief) && model === HAIKU;
      if (preCached || keys.length === 1) {
        const results = await Promise.all(keys.map(runOne));
        keys.forEach((k, i) => {
          byKey[k] = results[i];
        });
        return;
      }
      // Warm this model's material cache with the cheapest required task
      // (never visualMap — it's best-effort), then run the rest in parallel.
      const required = keys.filter((k) => k !== "visualMap");
      const warmPool = required.length ? required : keys;
      const warmKey = [...warmPool].sort(
        (a, b) => TASKS[a].maxTokens - TASKS[b].maxTokens,
      )[0];
      byKey[warmKey] = await runOne(warmKey);
      const restKeys = keys.filter((k) => k !== warmKey);
      const restResults = await Promise.all(restKeys.map(runOne));
      restKeys.forEach((k, i) => {
        byKey[k] = restResults[i];
      });
    }),
  );
  return byKey;
}
```

- [ ] **Step 6: Verify**

Run: `node_modules/.bin/tsc --noEmit` → 0 errors.
Run: `npm test` → all pass.
Run: `grep -n "model: MODEL\b" src/app/api/generate/route.ts` → nothing (no bare `MODEL` left).

- [ ] **Step 7: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat(generate): route cards/meta to Haiku; per-model grouped warmup"
```

---

## Task 3: Eval-harness per-task model + `--all-sonnet`

**Files:**
- Modify: `scripts/eval-pack.ts`

- [ ] **Step 1: Honor the model map + add the flag**

In `scripts/eval-pack.ts`: import the map — `import { MODEL_FOR, SONNET, HAIKU } from "../src/lib/taskModels";`. Add a module-level `let allSonnet = false;` near the other consts. In `main()`, parse the flag: `allSonnet = args.includes("--all-sonnet");` (it starts with `--`, so it's already excluded from positional args).

Change the harness's `runTask` to use the per-task model: replace its `model: MODEL,` with
```ts
    model: allSonnet ? SONNET : MODEL_FOR[key],
```
Change `runAnalysis`'s `model: MODEL,` to
```ts
    model: allSonnet ? SONNET : HAIKU,
```
(The harness keeps its own orchestration; the cost report is computed from actual per-call usage, so it stays accurate even though the harness doesn't replicate the route's grouped warmup exactly.)

- [ ] **Step 2: Verify + commit**

Run: `node_modules/.bin/tsc --noEmit` → 0 errors. (Do NOT run — costs API; the controller runs the A/B.)
```bash
git add scripts/eval-pack.ts
git commit -m "test(generate): per-task model + --all-sonnet flag in eval harness"
```

---

## Task 4: Verification

- [ ] **Step 1: Static**

Run: `npm test` → all pass (incl. the 3 `taskModels` tests).
Run: `node_modules/.bin/tsc --noEmit` → 0 errors.
Run: `npm run lint` → no new errors in changed files.

- [ ] **Step 2: A/B quality + cost (real API — controller-run, only with explicit cost OK)**

Generate the same chapter tiered vs all-Sonnet and compare flashcard quality + cost. Use a smaller/text-ish run to keep cost down (single PDF):
```bash
node_modules/.bin/tsx scripts/eval-pack.ts multiple_choice /Users/rdb/Desktop/kapitel01.pdf --slug=ht-tiered
node_modules/.bin/tsx scripts/eval-pack.ts multiple_choice /Users/rdb/Desktop/kapitel01.pdf --slug=ht-allsonnet --all-sonnet
```
Compare: do the Haiku-generated flashcards (`ht-tiered`) hold up against the all-Sonnet ones (`ht-allsonnet`) — exam-relevant Q/A, examples, mnemonics? Record the cost delta. If Haiku cards are clearly weaker, set `MODEL_FOR.cards = SONNET` (one line in `taskModels.ts`) and keep only `meta` + analysis on Haiku.

- [ ] **Step 3: Manual happy-path**

With the dev server, generate a pack (logged-in) → confirm it completes; the per-task logs show `cards`/`meta` on the Haiku model id and the trainer/visual map on the Sonnet id.

---

## Self-Review

**Spec coverage:**
- A (per-task model in a testable `MODEL_FOR`; route + analysis use it; drop `MODEL`) → Task 1 + Task 2 Steps 1–4. ✓
- B (grouped per-model warmup; two-pass Haiku pre-cached) → Task 2 Step 5. ✓
- C (cards quality safeguard + one-line fallback) → Task 4 Step 2. ✓
- Verification (unit map, A/B with cost OK, manual) → Task 1 + Task 4. ✓
- Cost reality (text vs vision) → inherent in the per-model grouping; no separate task needed. ✓

**Placeholder scan:** No TBD/TODO; complete code in every code step. Task 3 references the harness's existing `runTask`/`runAnalysis` (per Phase 2) and changes only the `model:` line + flag — concrete.

**Type consistency:** `MODEL_FOR`/`SONNET`/`HAIKU` names match across Task 1 (definition), Task 2 (`MODEL_FOR[key]`, `HAIKU`), and Task 3 (`MODEL_FOR[key]`, `SONNET`, `HAIKU`). `GenTaskKey` keys in `MODEL_FOR` match `activeTasksFor`/`TASKS`. The grouped `runGatedTasks` keeps the same `Partial<Record<GenTaskKey, unknown>>` return shape, so the downstream `byKey` reads are unchanged.
