import { createServiceClient } from "@/lib/supabase/server";
import {
  checkMemoryRateLimit,
  extractClientIp,
  readJsonBodyWithLimit,
  type RateLimitCheck,
} from "./rateLimitCore";

export { checkMemoryRateLimit, extractClientIp, readJsonBodyWithLimit };
export type { RateLimitCheck };

export type EnforceRateLimitOptions = {
  scope: string;
  ip?: string | null;
  userId?: string | null;
  maxIp?: number;
  maxUser?: number;
  windowSeconds: number;
};

/**
 * Defense-in-depth rate limiter combining instant per-instance sliding windows
 * with Supabase's durable `check_rate_limit` RPC (`20260531220531_rate_limit.sql`).
 */
export async function enforceRateLimit(
  opts: EnforceRateLimitOptions,
): Promise<RateLimitCheck> {
  const { scope, ip, userId, maxIp, maxUser, windowSeconds } = opts;

  if (ip && maxIp && maxIp > 0) {
    const mem = checkMemoryRateLimit(
      `mem:${scope}:ip:${ip}`,
      maxIp,
      windowSeconds,
    );
    if (!mem.allowed) return mem;
  }

  if (userId && maxUser && maxUser > 0) {
    const mem = checkMemoryRateLimit(
      `mem:${scope}:user:${userId}`,
      maxUser,
      windowSeconds,
    );
    if (!mem.allowed) return mem;
  }

  try {
    const service = createServiceClient();
    const checks: { bucket: string; max: number }[] = [];
    if (ip && ip !== "unknown" && maxIp && maxIp > 0) {
      checks.push({ bucket: `${scope}:ip:${ip}`, max: maxIp });
    }
    if (userId && maxUser && maxUser > 0) {
      checks.push({ bucket: `${scope}:user:${userId}`, max: maxUser });
    }
    if (checks.length === 0) return { allowed: true, retryAfterSeconds: 0 };

    const results = await Promise.all(
      checks.map(async ({ bucket, max }) => {
        const { data, error } = await service.rpc("check_rate_limit", {
          p_bucket: bucket,
          p_max: max,
          p_window_seconds: windowSeconds,
        });
        if (error) {
          console.error(`[rateLimit] check_rate_limit failed for ${scope}`, error);
          return true; // fail open when DB limiter unavailable
        }
        return data === true;
      }),
    );

    if (results.some((ok) => !ok)) {
      return {
        allowed: false,
        retryAfterSeconds: Math.min(60, Math.max(5, Math.ceil(windowSeconds / 6))),
      };
    }
  } catch (e) {
    console.error(`[rateLimit] unexpected error in ${scope}`, e);
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
