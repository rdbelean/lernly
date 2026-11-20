import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_PREFIX = "lny1";

export type TrainerSyncTokenPayload = {
  v: 1;
  uid: string;
  email: string | null;
};

export type VerifiedTrainerSyncToken = {
  userId: string;
  email: string | null;
};

function resolveSyncSecret(env: Record<string, string | undefined> = process.env): string {
  return (
    env.TRAINER_SYNC_SECRET ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.ENCRYPTION_KEY ||
    env.ADMIN_PASSWORD ||
    "lernly-dev-sync-secret"
  );
}

function deriveHmacKey(secret: string): Buffer {
  return createHmac("sha256", secret).update("lernly.trainer.sync.v1").digest();
}

function signSegment(unsignedToken: string, key: Buffer): string {
  return createHmac("sha256", key).update(unsignedToken).digest("base64url");
}

/**
 * Generates a stateless HMAC-SHA256 sync token so a user can authorize
 * `lernly_sync_web_course` from Claude Desktop without needing a DB migration.
 */
export function createTrainerSyncToken(
  user: { id: string; email?: string | null },
  secretOverride?: string,
): string {
  const uid = user.id.trim();
  if (!uid) {
    throw new Error("Cannot create sync token without user id.");
  }

  const payload: TrainerSyncTokenPayload = {
    v: 1,
    uid,
    email: user.email?.trim() || null,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const unsigned = `${TOKEN_PREFIX}.${encodedPayload}`;
  const key = deriveHmacKey(secretOverride ?? resolveSyncSecret());
  const sig = signSegment(unsigned, key);
  return `${unsigned}.${sig}`;
}

/**
 * Verifies a `lny1.<payload>.<sig>` token using constant-time HMAC comparison.
 */
export function verifyTrainerSyncToken(
  rawToken: string | null | undefined,
  secretOverride?: string,
): VerifiedTrainerSyncToken | null {
  if (!rawToken || typeof rawToken !== "string") return null;
  const token = rawToken.trim();
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return null;

  const [, encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  const unsigned = `${TOKEN_PREFIX}.${encodedPayload}`;
  const key = deriveHmacKey(secretOverride ?? resolveSyncSecret());
  const expectedSig = signSegment(unsigned, key);

  const providedBuf = Buffer.from(providedSig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (providedBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(providedBuf, expectedBuf)) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!decoded || typeof decoded !== "object") return null;
  const candidate = decoded as Partial<TrainerSyncTokenPayload>;
  if (candidate.v !== 1) return null;
  if (typeof candidate.uid !== "string" || candidate.uid.trim().length === 0) return null;
  if (candidate.email !== null && candidate.email !== undefined && typeof candidate.email !== "string") {
    return null;
  }

  return {
    userId: candidate.uid.trim(),
    email: candidate.email ?? null,
  };
}
