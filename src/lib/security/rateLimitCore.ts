/**
 * Pure in-memory sliding-window rate limiter + request body size guard.
 * Zero Next/Supabase server-only imports so it runs directly in `tsx --test`
 * and composes cleanly inside server route wrappers.
 */

export type RateLimitCheck = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const MAX_BUCKETS = 5_000;
const buckets = new Map<string, number[]>();

export function extractClientIp(h: Headers): string {
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = h.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}

export function checkMemoryRateLimit(
  bucket: string,
  max: number,
  windowSeconds: number,
  nowMs: number = Date.now(),
): RateLimitCheck {
  const windowMs = windowSeconds * 1000;
  const cutoff = nowMs - windowMs;

  if (buckets.size > MAX_BUCKETS) {
    for (const [k, stamps] of buckets) {
      if (stamps.every((t) => t <= cutoff)) {
        buckets.delete(k);
      }
    }
  }

  const recent = (buckets.get(bucket) ?? []).filter((t) => t > cutoff);
  if (recent.length >= max) {
    const oldest = recent[0] ?? nowMs;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - nowMs) / 1000),
    );
    buckets.set(bucket, recent);
    return { allowed: false, retryAfterSeconds };
  }

  recent.push(nowMs);
  buckets.set(bucket, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearMemoryRateLimitBucketsForTest(): void {
  buckets.clear();
}

export type BoundedJsonResult =
  | { ok: true; data: unknown; bytes: number }
  | { ok: false; status: 400 | 413; error: string };

/**
 * Reads a JSON request body while strictly enforcing a UTF-8 byte ceiling
 * before JSON.parse to prevent oversized-payload memory/token exploits.
 */
export async function readJsonBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<BoundedJsonResult> {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const declared = Number(contentLengthHeader);
    if (Number.isFinite(declared) && declared > maxBytes) {
      return {
        ok: false,
        status: 413,
        error: "Anfrage-Daten sind zu groß.",
      };
    }
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return {
      ok: false,
      status: 400,
      error: "Anfrage konnte nicht gelesen werden.",
    };
  }

  const bytes = Buffer.byteLength(raw, "utf-8");
  if (bytes > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: "Anfrage-Daten überschreiten das erlaubte Limit.",
    };
  }

  try {
    return { ok: true, data: JSON.parse(raw), bytes };
  } catch {
    return { ok: false, status: 400, error: "Ungültiges JSON." };
  }
}
