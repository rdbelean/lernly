# Phase 2 — Two-Pass Deep Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** For logged-in paying/BYOK users, run an analysis pass that builds an exam-relevance brief, then generate every section with that brief as shared guidance (gated; anonymous + Free stay single-pass).

**Architecture:** A pure `shouldUseTwoPass` gate decides per request. When on, an analysis pass (`TASK_ANALYSIS`) runs first — it caches the material and returns a free-text brief; the gated generation tasks then run all-in-parallel with the brief injected. When off (or if the analysis fails), the existing single-pass warmup→parallel path runs unchanged.

**Tech Stack:** Next.js route handler, TypeScript, `@anthropic-ai/sdk`, `tsx` + `node:test`.

Spec: `docs/superpowers/specs/2026-05-22-two-pass-generation-design.md`

---

## File Structure

- **Create** `src/lib/twoPass.ts` — pure `shouldUseTwoPass(...)` gate. + test.
- **Modify** `src/lib/prompts.ts` — add `TASK_ANALYSIS`.
- **Modify** `src/app/api/generate/route.ts` — analysis pass, brief injection, `runGatedTasks` helper, gate wiring.
- **Modify** `scripts/eval-pack.ts` — `--two-pass` flag for the A/B verification.

---

## Task 1: `shouldUseTwoPass` gate + tests

**Files:**
- Create: `src/lib/twoPass.ts`
- Test: `src/lib/twoPass.test.ts`

- [ ] **Step 1: Write the failing tests** — create `src/lib/twoPass.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldUseTwoPass } from "./twoPass";

test("anonymous → single-pass", () => {
  assert.equal(shouldUseTwoPass({ isAnonymous: true, usesByok: false, plan: null }), false);
});
test("logged-in Free → single-pass", () => {
  assert.equal(shouldUseTwoPass({ isAnonymous: false, usesByok: false, plan: "free" }), false);
});
test("BYOK → two-pass", () => {
  assert.equal(shouldUseTwoPass({ isAnonymous: false, usesByok: true, plan: null }), true);
});
test("Pro and Team → two-pass", () => {
  assert.equal(shouldUseTwoPass({ isAnonymous: false, usesByok: false, plan: "pro" }), true);
  assert.equal(shouldUseTwoPass({ isAnonymous: false, usesByok: false, plan: "team" }), true);
});
test("logged-in unknown plan, no BYOK → single-pass", () => {
  assert.equal(shouldUseTwoPass({ isAnonymous: false, usesByok: false, plan: null }), false);
});
```

- [ ] **Step 2: Run, confirm fail**

Run: `node_modules/.bin/tsx --test src/lib/twoPass.test.ts`
Expected: FAIL (Cannot find module './twoPass').

- [ ] **Step 3: Implement `src/lib/twoPass.ts`**

```ts
// Two-pass deep generation is gated to paying users: BYOK (own API cost) or a
// paid plan. Anonymous and Free generations stay single-pass.
export function shouldUseTwoPass(o: {
  isAnonymous: boolean;
  usesByok: boolean;
  plan: string | null;
}): boolean {
  if (o.isAnonymous) return false;
  if (o.usesByok) return true;
  return o.plan === "pro" || o.plan === "team";
}
```

- [ ] **Step 4: Run, confirm pass**

Run: `node_modules/.bin/tsx --test src/lib/twoPass.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/twoPass.ts src/lib/twoPass.test.ts
git commit -m "feat(generate): shouldUseTwoPass gate (BYOK or paid plan)"
```

---

## Task 2: `TASK_ANALYSIS` prompt

**Files:**
- Modify: `src/lib/prompts.ts`

- [ ] **Step 1: Append `TASK_ANALYSIS`** to `src/lib/prompts.ts`:

```ts
export const TASK_ANALYSIS = `AUFGABE: Analysiere das Kursmaterial und erstelle ein kompaktes PRÜFUNGS-BRIEFING — eine interne Analyse, die anschließend genutzt wird, um Karteikarten, Trainer, Visual Map und Übersicht prüfungsfokussiert zu erstellen. Das ist KEIN Endprodukt für den Studenten, sondern Steuerungs-Input für die Generierung.

Schreibe knappen, strukturierten FLIESSTEXT (KEIN JSON, keine Markdown-Codeblöcke). Decke ab:
1. KERN-KONZEPTE (5-8): die prüfungskritischsten Begriffe — je mit einem Satz, WARUM es geprüft wird.
2. FRAGE-MUSTER & FALLEN: wie dieser Stoff typischerweise abgefragt wird; häufig verwechselte Begriffspaare.
3. SCHWIERIGKEITS-HOTSPOTS: was Studenten erfahrungsgemäß falsch machen.
4. SCHLÜSSEL-AUTOREN/QUELLEN: wer/was zitiert werden muss.
5. QUERVERWEISE: welche Themen zusammenhängen und wie.
6. PRÜFUNGSTYP-FOKUS: was beim oben genannten Prüfungsformat besonders zählt.

Maximal ~400 Wörter. Priorisiere hart — lieber wenige scharfe Punkte als eine Aufzählung von allem.`;
```

- [ ] **Step 2: Verify + commit**

Run: `node_modules/.bin/tsc --noEmit` → 0 errors.

```bash
git add src/lib/prompts.ts
git commit -m "feat(prompts): exam-relevance analysis prompt for two-pass generation"
```

---

## Task 3: Route — analysis pass + brief injection + gate

**Files:**
- Modify: `src/app/api/generate/route.ts`

Read the file first. Relevant anchors: `runTaskOnce` (~123), `runTask` (~192), the `const usesByok = ...` + quota block (~409-460), and the inline orchestration `const active = activeTasksFor(examType); … const warmResult … restResults … byKey …` (~611-636) followed by `const cards = (byKey.cards as …)`.

- [ ] **Step 1: Imports + analysis constants**

Add imports near the other `@/lib` imports:
```ts
import { shouldUseTwoPass } from "@/lib/twoPass";
import { TASK_ANALYSIS } from "@/lib/prompts";
```
(`TASK_ANALYSIS` can be added to the existing `@/lib/prompts` import list instead.)

Add constants near the other generation constants:
```ts
const ANALYSIS_MAX_TOKENS = 4000;
const ANALYSIS_HEADER =
  "=== ANALYSE — WAS IST PRÜFUNGSRELEVANT (nutze dies zum Priorisieren) ===\n";
```

- [ ] **Step 2: Add a `brief` parameter to `runTaskOnce` and `runTask`**

In `runTaskOnce`, add a 5th parameter `brief?: string` and inject it between the material and the instruction:
```ts
async function runTaskOnce(
  client: Anthropic,
  key: TaskKey,
  materialBlocks: Anthropic.Messages.ContentBlockParam[],
  attemptTimeoutMs: number,
  brief?: string,
): Promise<unknown> {
```
Change the message `content` to:
```ts
          content: [
            ...materialBlocks,
            ...(brief
              ? [{ type: "text" as const, text: ANALYSIS_HEADER + brief }]
              : []),
            { type: "text", text: instruction },
          ],
```
In `runTask`, add `brief?: string` as a 5th param and forward it:
```ts
async function runTask(
  client: Anthropic,
  key: TaskKey,
  materialBlocks: Anthropic.Messages.ContentBlockParam[],
  deadlineMs: number,
  brief?: string,
): Promise<unknown> {
  return retryWithBudget(
    (attemptTimeoutMs) =>
      runTaskOnce(client, key, materialBlocks, attemptTimeoutMs, brief),
    { /* ...unchanged opts... */ },
  );
}
```
(Leave the `retryWithBudget` options object exactly as it is.)

- [ ] **Step 3: Add the analysis pass functions**

After `runTask`, add:
```ts
// Pass 1: free-text exam-relevance brief. Returns raw text (no JSON parse, no
// max_tokens throw — a truncated brief is still useful). Caches the material.
async function runAnalysisOnce(
  client: Anthropic,
  materialBlocks: Anthropic.Messages.ContentBlockParam[],
  attemptTimeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), attemptTimeoutMs);
  let final;
  try {
    const stream = client.messages.stream(
      {
        model: MODEL,
        max_tokens: ANALYSIS_MAX_TOKENS,
        thinking: { type: "disabled" },
        system: BASE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [...materialBlocks, { type: "text", text: TASK_ANALYSIS }],
          },
        ],
      },
      { signal: controller.signal },
    );
    final = await stream.finalMessage();
  } catch (e) {
    if (controller.signal.aborted)
      throw new TaskTimeoutError("Analyse-Pass timed out");
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
  const tb = final.content.find((b) => b.type === "text");
  return tb && "text" in tb ? tb.text.trim() : "";
}

async function runAnalysisPass(
  client: Anthropic,
  materialBlocks: Anthropic.Messages.ContentBlockParam[],
  deadlineMs: number,
): Promise<string> {
  return retryWithBudget(
    (attemptTimeoutMs) =>
      runAnalysisOnce(client, materialBlocks, attemptTimeoutMs),
    {
      classify: classifyError,
      deadlineMs,
      maxAttempts: MAX_ATTEMPTS,
      maxAttemptMs: PER_ATTEMPT_TIMEOUT_MS,
      minAttemptMs: MIN_ATTEMPT_MS,
      safetyMs: SAFETY_MS,
      baseBackoffMs: BASE_BACKOFF_MS,
      maxBackoffMs: MAX_BACKOFF_MS,
      now: Date.now,
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      random: Math.random,
    },
  );
}
```

- [ ] **Step 4: Add the `runGatedTasks` helper**

After `runAnalysisPass`, add the helper that encapsulates both orchestration modes:
```ts
// When a brief is present, the material is already cached by the analysis pass,
// so all gated tasks run in parallel. Otherwise (single-pass) warm the cache with
// the cheapest required task first, then run the rest in parallel.
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

  if (brief) {
    const results = await Promise.all(active.map(runOne));
    const byKey: Partial<Record<GenTaskKey, unknown>> = {};
    active.forEach((k, i) => {
      byKey[k] = results[i];
    });
    return byKey;
  }

  const required = active.filter((k) => k !== "visualMap");
  const warmKey = [...required].sort(
    (a, b) => TASKS[a].maxTokens - TASKS[b].maxTokens,
  )[0];
  const warmResult = await runOne(warmKey);
  const restKeys = active.filter((k) => k !== warmKey);
  const restResults = await Promise.all(restKeys.map(runOne));
  const byKey: Partial<Record<GenTaskKey, unknown>> = { [warmKey]: warmResult };
  restKeys.forEach((k, i) => {
    byKey[k] = restResults[i];
  });
  return byKey;
}
```
(`ExamType` is already imported in the file via `@/lib/schema`. If not, add it to that import.)

- [ ] **Step 5: Capture the user's plan for the gate**

Near `let creditKindConsumed: string | null = null;` (~414), add:
```ts
    let userPlan: string | null = null;
```
Inside the `if (user && !usesByok)` block, right after `const { data: quota, error: qErr } = await supabase.rpc("check_pack_quota");`, add:
```ts
      if (quota?.plan) userPlan = quota.plan as string;
```

- [ ] **Step 6: Replace the inline orchestration with the gated two-pass flow**

Replace the inline orchestration span — from `const active = activeTasksFor(examType);` through the construction of `byKey` (the `const warmKey … warmResult … restResults … byKey …`, i.e. everything up to but NOT including `const cards = (byKey.cards as …)`) — with:
```ts
    const useTwoPass = shouldUseTwoPass({ isAnonymous, usesByok, plan: userPlan });
    let brief = "";
    if (useTwoPass) {
      brief = await runAnalysisPass(client, materialBlocks, deadline).catch(
        (e) => {
          console.error(
            "[/api/generate] analysis pass failed, falling back to single-pass",
            e,
          );
          return "";
        },
      );
    }
    console.log(
      `[/api/generate] two-pass=${useTwoPass} brief=${brief.length} chars`,
    );

    const byKey = await runGatedTasks(
      client,
      materialBlocks,
      deadline,
      examType,
      brief || undefined,
    );
```
Everything after (`const cards = (byKey.cards as …)`, `meta`, `visualMap`, the `merged` object, validation, save) stays unchanged — it reads `byKey`.

- [ ] **Step 7: Verify**

Run: `node_modules/.bin/tsc --noEmit` → 0 errors.
Run: `npm test` → all pass.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat(generate): two-pass analysis + brief injection (gated to paid/BYOK)"
```

---

## Task 4: Eval-harness `--two-pass` flag

**Files:**
- Modify: `scripts/eval-pack.ts`

- [ ] **Step 1: Mirror the analysis pass in the harness**

In `scripts/eval-pack.ts`: import `TASK_ANALYSIS` from `../src/lib/prompts`. Add an `ANALYSIS_HEADER` const and a `runAnalysis(client, materialBlocks)` that streams `TASK_ANALYSIS` (max_tokens 4000) and returns the raw text (mirror `runAnalysisOnce` but without the route's retry wrapper — a single call is fine for the harness). Parse a `--two-pass` flag in `main()` (like the existing `--slug=`/`--only=` parsing). When set: `const brief = await runAnalysis(client, materialBlocks)`, log its length, and pass `brief` into the task runs by appending `{ type: "text", text: ANALYSIS_HEADER + brief }` before the instruction in the harness's `runTask` (give `runTask`/`runTaskSettled` an optional `brief?: string` param mirroring the route). When not set, behaves exactly as today.

- [ ] **Step 2: Verify + commit**

Run: `node_modules/.bin/tsc --noEmit` → 0 errors. (Do NOT run it — costs API; the controller runs the A/B.)
```bash
git add scripts/eval-pack.ts
git commit -m "test(generate): --two-pass flag in eval harness for A/B"
```

---

## Task 5: Verification

- [ ] **Step 1: Static**

Run: `npm test` → all pass (incl. the 5 `twoPass` tests).
Run: `node_modules/.bin/tsc --noEmit` → 0 errors.
Run: `npm run lint` → no new errors in changed files.

- [ ] **Step 2: A/B depth check (real API — controller-run, only with explicit cost OK)**

Generate the same chapter single-pass vs two-pass and compare depth/exam-focus:
```bash
node_modules/.bin/tsx scripts/eval-pack.ts open_questions /Users/rdb/Desktop/kapitel02.pdf --slug=ab-single
node_modules/.bin/tsx scripts/eval-pack.ts open_questions /Users/rdb/Desktop/kapitel02.pdf --slug=ab-twopass --two-pass
```
Compare the two outputs: does two-pass prioritize exam-critical concepts and produce sharper question framing? Record the cost delta. (~$1–2 for the pair; vision is on for this deck.)

- [ ] **Step 3: Manual happy-path**

With the dev server, generate as a BYOK or Pro user → confirm it completes (logs `two-pass=true`) and produces a valid pack; generate as anon/Free → logs `two-pass=false`, behaves as before.

---

## Self-Review

**Spec coverage:**
- A (analysis pass, free text, ~4k budget) → Task 2 (prompt) + Task 3 Step 3 (`runAnalysisPass`). ✓
- B (brief injection; material cache hit; no Pass-2 warmup) → Task 3 Steps 2, 4 (`runGatedTasks` parallel-when-brief). ✓
- C (orchestration; Pass-1 failure → single-pass fallback) → Task 3 Step 6 (`.catch(() => "")` → `brief || undefined` → `runGatedTasks` warmup path). ✓
- D (gate: BYOK or pro/team; capture plan) → Task 1 + Task 3 Step 5. ✓
- E (cost/latency, no schema change) → inherent; no schema touched. ✓
- Verification (unit gate; A/B with cost OK) → Task 1 + Task 5. ✓

**Placeholder scan:** No TBD/TODO. Task 4 describes the harness mirror prose-precisely (the harness's runTask differs from the route's), pointing at the route's `runAnalysisOnce`/brief-injection as the reference — acceptable since it's a dev tool and the exact route code is given in Task 3.

**Type consistency:** `shouldUseTwoPass({ isAnonymous, usesByok, plan })` arg shape matches Task 1 and the Task 3 Step 6 call (`plan: userPlan`). `brief?: string` threaded consistently through `runTaskOnce`/`runTask`/`runGatedTasks`. `GenTaskKey`/`ExamType`/`activeTasksFor`/`retryWithBudget`/`TaskTimeoutError` reused from their modules. `byKey` shape unchanged downstream.
