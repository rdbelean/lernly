# API Robustness — Smarter Retries

**Date:** 2026-05-22
**Status:** Design — approved, pending spec review

## Context

Study-pack generation fans out to several Anthropic API tasks. When the API is
transiently degraded, tasks fail with mid-stream connection drops (`terminated`),
429s, or 529 (overloaded). The current handling is too weak:

- `runTask` retries **once, immediately, on ANY error** — no backoff (an overloaded
  API gets hit again instantly), and it even retries `max_tokens` (regenerating
  produces the same over-long output, wasting a full slow call).
- A single `runTaskOnce` aborts at **180s** (`PER_TASK_TIMEOUT_MS`). One timeout
  (180s) + its retry (another 180s) = 360s, but the route's Vercel `maxDuration`
  is **300s** — so the current retry can be killed mid-flight, leaving the user
  with a 500.

Observed live: with a degraded API, a `meta` task took 172s and three parallel
tasks `terminated`; the immediate retry hit the same degradation and also failed.

Goal: survive transient API failures via **classified, budget-aware retries with
backoff**, strictly within the 300s budget, without retrying non-retryable errors.

## Scope

Smarter retry logic only.

## Out of scope

- Graceful partial-success (shipping a pack with a failed non-core section).
- Real progress streaming to the client (the progress UI stays a timed animation).
- Raising Vercel `maxDuration` / restructuring the cache warmup. (Noted risk: under
  extreme API slowness the sequential warmup alone can approach 300s; the budget
  guard ensures retries never make this worse, but a `maxDuration` bump is a
  separate future option if generations keep hitting the ceiling.)

## Design

### New module `src/lib/retry.ts` (pure, unit-testable)

**Typed errors** so classification is unambiguous:

```ts
export class MaxTokensError extends Error {}     // model hit max_tokens
export class ModelJsonError extends Error {}     // response wasn't valid JSON
export class TaskTimeoutError extends Error {}   // per-attempt abort fired
```

**`classifyError(err): "transient" | "fatal"`**
- `transient`: `ModelJsonError`, `TaskTimeoutError`; connection/socket errors
  (message or `cause.code` matching `terminated|ECONNRESET|ECONNREFUSED|fetch failed|socket hang up|UND_ERR|ETIMEDOUT`);
  Anthropic `APIError` with `status ∈ {408, 409, 429, 500, 502, 503, 529}`.
- `fatal`: `MaxTokensError`, and anything else (unknown → don't retry).

**`retryWithBudget(attemptFn, opts)`** — budget-aware retry loop:

```ts
export type RetryOpts = {
  classify: (err: unknown) => "transient" | "fatal";
  deadlineMs: number;        // absolute timestamp (Date.now()-based)
  maxAttempts: number;
  maxAttemptMs: number;      // hard cap per attempt
  minAttemptMs: number;      // skip an attempt if remaining budget < this
  safetyMs: number;          // shave off the attempt timeout
  baseBackoffMs: number;
  maxBackoffMs: number;
  now: () => number;         // injectable clock (tests)
  sleep: (ms: number) => Promise<void>;  // injectable (tests)
  random: () => number;      // injectable jitter source (tests)
};

// attemptFn receives the per-attempt timeout it must honor (size its AbortController to it).
export async function retryWithBudget<T>(
  attemptFn: (attemptTimeoutMs: number) => Promise<T>,
  opts: RetryOpts,
): Promise<T>;
```

Behavior:
1. For each attempt up to `maxAttempts`: compute `remaining = deadlineMs - now()`.
   If `remaining < minAttemptMs` → stop, throw the last error.
2. `attemptTimeout = min(maxAttemptMs, remaining - safetyMs)`; call
   `attemptFn(attemptTimeout)`. On success → return.
3. On error: if `classify(err) === "fatal"` → throw immediately. If this was the
   last attempt → throw. Else compute backoff
   `min(maxBackoffMs, baseBackoffMs * 2^(attempt-1))` with ±50% jitter
   (`backoff * (0.5 + random())`); if sleeping that long would leave
   `< minAttemptMs` before the deadline → stop and throw; otherwise `sleep` and loop.

This guarantees no attempt is started that can't finish before the deadline, so
Vercel never kills a generation mid-attempt.

### Constants (in `route.ts`)

- `GENERATION_BUDGET_MS = 280_000` (20s buffer under `maxDuration = 300`).
- `MAX_ATTEMPTS = 3`, `PER_ATTEMPT_TIMEOUT_MS = 180_000` (→ `maxAttemptMs`),
  `MIN_ATTEMPT_MS = 20_000`, `SAFETY_MS = 2_000`,
  `BASE_BACKOFF_MS = 800`, `MAX_BACKOFF_MS = 5_000`.

### Integration in `src/app/api/generate/route.ts`

- `runTaskOnce(client, key, materialText, attemptTimeoutMs)` — take the per-attempt
  timeout as a parameter (replacing the fixed `PER_TASK_TIMEOUT_MS` for its
  `AbortController`). Throw the typed errors: `MaxTokensError` on
  `stop_reason === "max_tokens"`, `TaskTimeoutError` on abort, `ModelJsonError`
  when `parseModelJson` throws.
- Replace the current `runTask` wrapper with one that calls `retryWithBudget`,
  passing a `deadline` derived from the request start (`t0 + GENERATION_BUDGET_MS`)
  and `classifyError`, with `now: Date.now`, real `sleep`, `random: Math.random`.
- Thread `deadline` through to every `runTask(...)` call in the orchestration
  (warmup + parallel) so all tasks share the one budget. `runTask` keeps returning
  `Promise<unknown>`; callers/`merged` are unchanged.
- The existing best-effort `visualMap` `.catch` stays (a fatal/budget-exhausted
  visualMap still degrades gracefully to `null`).

## Verification

- **Unit (`src/lib/retry.test.ts`, node:test):**
  - `classifyError`: `terminated` message → transient; `{status:529}` → transient;
    `MaxTokensError` → fatal; `ModelJsonError` → transient; plain `Error("nope")` → fatal.
  - `retryWithBudget` with injected `now`/`sleep`/`random`:
    (a) returns on first success (no sleep); (b) retries a transient failure then
    succeeds; (c) throws immediately on a fatal error (no retry); (d) stops at
    `maxAttempts`; (e) starts no attempt when `remaining < minAttemptMs`;
    (f) never sleeps past the deadline; (g) passes a shrinking `attemptTimeoutMs`
    as the budget decreases.
- **Regression:** `npm test` (existing suites) + `tsc --noEmit` clean.
- **End-to-end:** the retry logic lives in the route (the eval harness has its own
  `runTask` and is unchanged). Verify the happy path is unaffected by generating a
  pack via the dev server (`/dashboard/new`) — it should still succeed normally.
  The retry/backoff/budget/classification behavior itself is covered by the unit
  tests above (it can't be reliably exercised against the live API on demand).
