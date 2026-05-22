# API Robustness — Smarter Retries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Survive transient Anthropic failures (connection drops, 429, 529, malformed JSON) with classified, budget-aware retries that never exceed Vercel's 300s `maxDuration`, while failing fast on non-retryable errors (`max_tokens`).

**Architecture:** A new pure module `src/lib/retry.ts` provides `classifyError` (transient vs fatal) and `retryWithBudget` (an injectable-clock retry loop that sizes each attempt to the remaining budget and backs off with jitter). `route.ts` throws typed errors from `runTaskOnce` and wraps tasks with `retryWithBudget` sharing one request-wide deadline.

**Tech Stack:** TypeScript, `@anthropic-ai/sdk`, `tsx` + `node:test`.

Spec: `docs/superpowers/specs/2026-05-22-api-robustness-retries-design.md`

---

## File Structure

- **Create** `src/lib/retry.ts` — typed errors (`MaxTokensError`, `ModelJsonError`, `TaskTimeoutError`), `classifyError`, `retryWithBudget`. Pure, no app deps.
- **Create** `src/lib/retry.test.ts` — node:test unit tests.
- **Modify** `src/app/api/generate/route.ts` — constants; `runTaskOnce` takes a per-attempt timeout and throws typed errors; `runTask` uses `retryWithBudget`; POST computes a deadline and threads it through the orchestration.

---

## Task 1: Retry module + tests

**Files:**
- Create: `src/lib/retry.ts`
- Test: `src/lib/retry.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/retry.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyError,
  retryWithBudget,
  MaxTokensError,
  ModelJsonError,
  TaskTimeoutError,
  type RetryOpts,
} from "./retry";

test("classifyError: connection drops are transient", () => {
  assert.equal(classifyError(new Error("terminated")), "transient");
  assert.equal(classifyError(new Error("fetch failed")), "transient");
  assert.equal(classifyError({ cause: { code: "ECONNRESET" } }), "transient");
});

test("classifyError: retryable HTTP statuses are transient", () => {
  assert.equal(classifyError({ status: 429 }), "transient");
  assert.equal(classifyError({ status: 529 }), "transient");
  assert.equal(classifyError({ status: 503 }), "transient");
});

test("classifyError: typed errors", () => {
  assert.equal(classifyError(new MaxTokensError("x")), "fatal");
  assert.equal(classifyError(new ModelJsonError("x")), "transient");
  assert.equal(classifyError(new TaskTimeoutError("x")), "transient");
});

test("classifyError: unknown errors are fatal", () => {
  assert.equal(classifyError(new Error("something weird")), "fatal");
  assert.equal(classifyError({ status: 400 }), "fatal");
});

function opts(over: Partial<RetryOpts> = {}): RetryOpts {
  let t = 0;
  return {
    classify: classifyError,
    deadlineMs: 100_000,
    maxAttempts: 3,
    maxAttemptMs: 180_000,
    minAttemptMs: 20_000,
    safetyMs: 2_000,
    baseBackoffMs: 800,
    maxBackoffMs: 5_000,
    now: () => t,
    sleep: async (ms: number) => {
      t += ms;
    },
    random: () => 0.5,
    ...over,
  };
}

test("returns on first success without sleeping", async () => {
  let sleeps = 0;
  const r = await retryWithBudget(async () => "ok", opts({ sleep: async () => { sleeps++; } }));
  assert.equal(r, "ok");
  assert.equal(sleeps, 0);
});

test("retries a transient failure then succeeds", async () => {
  let n = 0;
  const r = await retryWithBudget(async () => {
    n++;
    if (n < 2) throw new Error("terminated");
    return "ok";
  }, opts());
  assert.equal(r, "ok");
  assert.equal(n, 2);
});

test("does not retry a fatal error", async () => {
  let n = 0;
  await assert.rejects(
    retryWithBudget(async () => {
      n++;
      throw new MaxTokensError("too big");
    }, opts()),
    /too big/,
  );
  assert.equal(n, 1);
});

test("stops after maxAttempts", async () => {
  let n = 0;
  await assert.rejects(
    retryWithBudget(async () => {
      n++;
      throw new Error("terminated");
    }, opts({ sleep: async () => {} })),
  );
  assert.equal(n, 3);
});

test("starts no attempt when budget is below minAttemptMs", async () => {
  let n = 0;
  await assert.rejects(
    retryWithBudget(async () => {
      n++;
      return "ok";
    }, opts({ now: () => 90_000 })),
  );
  assert.equal(n, 0);
});

test("passes a shrinking attemptTimeout as budget decreases", async () => {
  const seen: number[] = [];
  let t = 0;
  await assert.rejects(
    retryWithBudget(
      async (timeout: number) => {
        seen.push(timeout);
        t += 30_000;
        throw new Error("terminated");
      },
      opts({ now: () => t, sleep: async (ms: number) => { t += ms; } }),
    ),
  );
  assert.equal(seen[0], 98_000);
  assert.ok(seen[1] < seen[0]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node_modules/.bin/tsx --test src/lib/retry.test.ts`
Expected: FAIL (Cannot find module './retry').

- [ ] **Step 3: Implement `src/lib/retry.ts`**

```ts
export class MaxTokensError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MaxTokensError";
  }
}
export class ModelJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelJsonError";
  }
}
export class TaskTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskTimeoutError";
  }
}

export type ErrorClass = "transient" | "fatal";

const TRANSIENT_TEXT =
  /terminated|ECONNRESET|ECONNREFUSED|EPIPE|ETIMEDOUT|UND_ERR|fetch failed|socket hang up|network/i;
const TRANSIENT_STATUS = new Set([408, 409, 429, 500, 502, 503, 529]);

export function classifyError(err: unknown): ErrorClass {
  if (err instanceof MaxTokensError) return "fatal";
  if (err instanceof ModelJsonError || err instanceof TaskTimeoutError) {
    return "transient";
  }

  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status === "number" && TRANSIENT_STATUS.has(status)) return "transient";

  const msg = err instanceof Error ? err.message : String(err);
  if (TRANSIENT_TEXT.test(msg)) return "transient";

  const cause = (err as { cause?: { code?: unknown } } | null)?.cause;
  const code = cause && typeof cause.code === "string" ? cause.code : "";
  if (code && TRANSIENT_TEXT.test(code)) return "transient";

  return "fatal";
}

export type RetryOpts = {
  classify: (err: unknown) => ErrorClass;
  deadlineMs: number; // absolute Date.now()-based timestamp
  maxAttempts: number;
  maxAttemptMs: number; // hard cap per attempt
  minAttemptMs: number; // skip an attempt if remaining budget < this
  safetyMs: number; // shaved off each attempt timeout
  baseBackoffMs: number;
  maxBackoffMs: number;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
};

// Calls attemptFn, passing the per-attempt timeout it must honor. Retries only
// transient errors, backs off with jitter, and never starts an attempt that
// can't finish before deadlineMs.
export async function retryWithBudget<T>(
  attemptFn: (attemptTimeoutMs: number) => Promise<T>,
  opts: RetryOpts,
): Promise<T> {
  let lastErr: unknown = new Error("no attempts made");
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    const remaining = opts.deadlineMs - opts.now();
    if (remaining < opts.minAttemptMs) break;
    const attemptTimeoutMs = Math.min(opts.maxAttemptMs, remaining - opts.safetyMs);
    try {
      return await attemptFn(attemptTimeoutMs);
    } catch (e) {
      lastErr = e;
      if (opts.classify(e) === "fatal") throw e;
      if (attempt === opts.maxAttempts) break;
      const base = Math.min(opts.maxBackoffMs, opts.baseBackoffMs * 2 ** (attempt - 1));
      const backoff = base * (0.5 + opts.random());
      if (opts.deadlineMs - opts.now() - backoff < opts.minAttemptMs) break;
      await opts.sleep(backoff);
    }
  }
  throw lastErr;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node_modules/.bin/tsx --test src/lib/retry.test.ts`
Expected: PASS — 9 tests, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add src/lib/retry.ts src/lib/retry.test.ts
git commit -m "feat(generate): classified, budget-aware retry helper"
```

---

## Task 2: Wire retries into the generation route

**Files:**
- Modify: `src/app/api/generate/route.ts`

- [ ] **Step 1: Imports + constants**

Add the import near the other `@/lib` imports:

```ts
import {
  classifyError,
  retryWithBudget,
  MaxTokensError,
  ModelJsonError,
  TaskTimeoutError,
} from "@/lib/retry";
```

Replace the line `const PER_TASK_TIMEOUT_MS = 180_000;` with this block:

```ts
const GENERATION_BUDGET_MS = 280_000; // 20s buffer under maxDuration (300)
const PER_ATTEMPT_TIMEOUT_MS = 180_000;
const MAX_ATTEMPTS = 3;
const MIN_ATTEMPT_MS = 20_000;
const SAFETY_MS = 2_000;
const BASE_BACKOFF_MS = 800;
const MAX_BACKOFF_MS = 5_000;
```

- [ ] **Step 2: `runTaskOnce` — take a per-attempt timeout and throw typed errors**

Change the signature to add the timeout parameter:

```ts
async function runTaskOnce(
  client: Anthropic,
  key: TaskKey,
  materialText: string,
  attemptTimeoutMs: number,
): Promise<unknown> {
```

Change the timeout setup line from `setTimeout(() => controller.abort(), PER_TASK_TIMEOUT_MS)` to:

```ts
  const timeoutId = setTimeout(() => controller.abort(), attemptTimeoutMs);
```

In the `catch (e)` block, change the abort branch to throw a typed error:

```ts
  } catch (e) {
    if (controller.signal.aborted) {
      throw new TaskTimeoutError(
        `Sub-Task ${key} hat länger als ${Math.round(attemptTimeoutMs / 1000)}s gedauert.`,
      );
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
```

Change the `max_tokens` throw to:

```ts
  if (final.stop_reason === "max_tokens") {
    throw new MaxTokensError(
      `Sub-Task ${key} hat das Token-Budget gesprengt (${usage.output_tokens} tokens). Bitte weniger Material hochladen.`,
    );
  }
```

Change the JSON-parse `catch` throw to:

```ts
  try {
    return parseModelJson(raw);
  } catch (e) {
    console.error(
      `[/api/generate] task=${key} JSON parse failed:`,
      e,
      "raw (first 400):",
      raw.slice(0, 400),
    );
    throw new ModelJsonError(`Sub-Task ${key} hat kein valides JSON zurückgegeben.`);
  }
```

- [ ] **Step 3: Replace the `runTask` wrapper with the budget-aware retry**

Replace the entire current `runTask` function (the one-shot try/catch retry) with:

```ts
// Retry transient API failures within the request's time budget; never retry
// fatal errors (max_tokens); never start an attempt that can't finish in time.
async function runTask(
  client: Anthropic,
  key: TaskKey,
  materialText: string,
  deadlineMs: number,
): Promise<unknown> {
  return retryWithBudget(
    (attemptTimeoutMs) => runTaskOnce(client, key, materialText, attemptTimeoutMs),
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

- [ ] **Step 4: Compute the deadline in POST and thread it through the orchestration**

In the `POST` handler, the request start `const t0 = Date.now();` already exists near the top. Immediately after it, add:

```ts
  const deadline = t0 + GENERATION_BUDGET_MS;
```

Find the `runOne` closure in the orchestration (it calls `runTask(client, k, materialText)` twice — once in the `visualMap` branch, once in the else branch). Add `deadline` to both calls:

```ts
    const runOne = (k: GenTaskKey): Promise<unknown> =>
      k === "visualMap"
        ? runTask(client, k, materialText, deadline)
            .then((r) => (r as { visualMap?: unknown }).visualMap ?? null)
            .catch((e) => {
              console.error("[/api/generate] visualMap soft-failed", e);
              return null;
            })
        : runTask(client, k, materialText, deadline);
```

(There are no other `runTask(` call sites — the warmup `runOne(warmKey)` and `restKeys.map(runOne)` both go through this closure.)

- [ ] **Step 5: Verify**

Run: `node_modules/.bin/tsc --noEmit` → 0 errors.
Run: `npm test` → all pass (including the 9 new retry tests).
Confirm no dangling `PER_TASK_TIMEOUT_MS` references: `grep -rn "PER_TASK_TIMEOUT_MS" src/` → nothing.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat(generate): budget-aware retries with backoff; typed task errors"
```

---

## Verification (end of plan)

- `npm test` — all suites pass, including `retry.test.ts` (9).
- `node_modules/.bin/tsc --noEmit` — 0 errors.
- `npm run lint` — no new errors in changed files.
- **Happy path:** with the dev server running, generate a pack via `/dashboard/new`; it should succeed normally (no behavior change when nothing fails). The retry/backoff/budget/classification logic is covered by the unit tests (it can't be reliably triggered against the live API on demand).

---

## Self-Review

**Spec coverage:**
- `classifyError` (transient/fatal sets, typed errors) → Task 1. ✓
- `retryWithBudget` (budget guard, backoff+jitter, injectable clock/sleep/random) → Task 1. ✓
- Constants (budget 280s, 3 attempts, etc.) → Task 2 Step 1. ✓
- `runTaskOnce` typed errors + per-attempt timeout param → Task 2 Step 2. ✓
- `runTask` via `retryWithBudget` + shared deadline threaded through orchestration → Task 2 Steps 3–4. ✓
- visualMap stays best-effort → preserved in Task 2 Step 4. ✓
- Verification (unit + happy path) → Task 1 Step 4, final Verification. ✓
- Out of scope (partial-success, progress streaming, maxDuration/warmup) → not present. ✓

**Placeholder scan:** none. Every step has complete code and exact commands.

**Type consistency:** `RetryOpts` fields used in Task 1 tests match the type and `retryWithBudget` usage in Task 2 Step 3 (`maxAttemptMs`, `minAttemptMs`, `safetyMs`, `baseBackoffMs`, `maxBackoffMs`, `now`, `sleep`, `random`). Typed error names (`MaxTokensError`/`ModelJsonError`/`TaskTimeoutError`) consistent between Task 1 and Task 2. `runTaskOnce` 4-arg signature matches the `attemptFn` call in `runTask`.
