import { test } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { MaxTokensError } from "@/lib/retry";
// The route module can't be imported under `tsx --test` (it transitively pulls
// next-only `server-only` via @/lib/dal). The cap/overload logic it runs lives
// in this Next-free module, imported by route.ts — so testing it here gives the
// exact same coverage, money-safe (no Anthropic, no DB).
import {
  isTransientOverload,
  slotGateOutcome,
  BUSY_MSG,
  GENERATION_MAX_CONCURRENCY,
} from "@/lib/generationGate";

// =========================================================================
// /api/generate — concurrency-cap + overload-handling logic.
// =========================================================================
// Pure, money-safe coverage: NO Anthropic calls, NO DB. We exercise the exact
// decision functions the route runs so the "529 → friendly German 503" mapping
// and the slot gate can never silently regress.
// =========================================================================

function apiError(status: number): InstanceType<typeof Anthropic.APIError> {
  // Anthropic.APIError(status, error, message, headers)
  return new Anthropic.APIError(status, undefined, `http ${status}`, undefined);
}

// ---- Overload classification (drives the friendly 503) -------------------

test("isTransientOverload: Anthropic 429 (rate limit) is transient", () => {
  assert.equal(isTransientOverload(apiError(429)), true);
});

test("isTransientOverload: Anthropic 529 (overloaded) is transient", () => {
  assert.equal(isTransientOverload(apiError(529)), true);
});

test("isTransientOverload: Anthropic 500/502/503 are transient", () => {
  assert.equal(isTransientOverload(apiError(500)), true);
  assert.equal(isTransientOverload(apiError(502)), true);
  assert.equal(isTransientOverload(apiError(503)), true);
});

test("isTransientOverload: client errors (400/401) are NOT transient", () => {
  assert.equal(isTransientOverload(apiError(400)), false);
  assert.equal(isTransientOverload(apiError(401)), false);
});

test("isTransientOverload: non-Anthropic errors are NOT transient", () => {
  assert.equal(isTransientOverload(new Error("boom")), false);
  assert.equal(isTransientOverload(new MaxTokensError("too big")), false);
  assert.equal(isTransientOverload(null), false);
  assert.equal(isTransientOverload({ status: 529 }), false); // not an APIError instance
});

// ---- The friendly message itself ----------------------------------------

test("BUSY_MSG is the warm German retry copy (no raw English / no 'null')", () => {
  assert.match(BUSY_MSG, /viel los/);
  assert.match(BUSY_MSG, /Lernpaket/);
  assert.ok(!/error|exception|null|undefined/i.test(BUSY_MSG));
});

// ---- Concurrency gate decision ------------------------------------------

test("slotGateOutcome: BYOK always bypasses the shared cap", () => {
  assert.equal(slotGateOutcome({ usesByok: true, acquired: false }), "bypass");
  assert.equal(slotGateOutcome({ usesByok: true, acquired: true }), "bypass");
  assert.equal(slotGateOutcome({ usesByok: true, acquired: null }), "bypass");
});

test("slotGateOutcome: slot reserved (true) → proceed", () => {
  assert.equal(slotGateOutcome({ usesByok: false, acquired: true }), "proceed");
});

test("slotGateOutcome: cap full (false) → busy (friendly 503)", () => {
  assert.equal(slotGateOutcome({ usesByok: false, acquired: false }), "busy");
});

test("slotGateOutcome: limiter errored (null) → proceed (fail open)", () => {
  assert.equal(slotGateOutcome({ usesByok: false, acquired: null }), "proceed");
});

// ---- Cap default ---------------------------------------------------------

test("GENERATION_MAX_CONCURRENCY defaults to 3 when env unset", () => {
  // Tier-2 sizing: keeps worst-case Sonnet output under 90K OTPM.
  if (process.env.GENERATION_MAX_CONCURRENCY === undefined) {
    assert.equal(GENERATION_MAX_CONCURRENCY, 3);
  } else {
    assert.equal(
      GENERATION_MAX_CONCURRENCY,
      Number(process.env.GENERATION_MAX_CONCURRENCY),
    );
  }
});
