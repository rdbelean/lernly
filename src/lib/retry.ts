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
