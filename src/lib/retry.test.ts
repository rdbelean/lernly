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
