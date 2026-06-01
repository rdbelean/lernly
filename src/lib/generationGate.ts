import Anthropic from "@anthropic-ai/sdk";

// =========================================================================
// Generation gate — pure, dependency-light logic for /api/generate's
// concurrency cap + transient-overload handling. Kept Next-free (no
// "server-only", no next/server) so it's unit-testable under `tsx --test`.
// =========================================================================

// Global concurrency cap on simultaneous Anthropic generations, enforced via a
// DB slot counter (acquire_generation_slot / release_generation_slot). Sized to
// keep worst-case Sonnet output under the Tier-2 90K OTPM limit; raise once
// dashboards show headroom. The slot TTL (in the RPC) exceeds the route's
// maxDuration so in-flight requests never expire early.
export const GENERATION_MAX_CONCURRENCY = Number(
  process.env.GENERATION_MAX_CONCURRENCY ?? 3,
);

// Warm, German "we're busy, your pack is coming" message for transient overload
// (Anthropic 429/529, or our own slot cap). The client shows this + offers retry
// instead of a raw English error or a 500.
export const BUSY_MSG =
  "Gerade ist viel los — dein Lernpaket kommt gleich. Bitte versuch es in einem Moment nochmal.";

// True when an error is a transient overload we want the user to simply retry:
// Anthropic rate-limit (429) / overloaded (529) / 5xx. Maps to a friendly 503 +
// retryable flag rather than leaking the raw error.
export function isTransientOverload(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    const s = err.status ?? 0;
    return s === 429 || s === 529 || s === 503 || s === 500 || s === 502;
  }
  return false;
}

// Pure decision for the concurrency gate. `acquired` is the result of
// acquire_generation_slot: true = slot reserved, false = cap full, null = RPC
// errored (fail open).
// - BYOK users bypass the shared cap entirely (own Anthropic bill).
// - cap full (false) → busy (friendly 503, no model call).
// - slot reserved (true) or limiter errored (null) → proceed.
export function slotGateOutcome(opts: {
  usesByok: boolean;
  acquired: boolean | null;
}): "bypass" | "proceed" | "busy" {
  if (opts.usesByok) return "bypass";
  if (opts.acquired === false) return "busy";
  return "proceed";
}
