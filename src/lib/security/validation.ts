/**
 * Edge-case-safe input normalizers for emails (Apple Private Relay, mixed case,
 * subaddressing), human names (apostrophes, hyphens, umlauts/diacritics), and
 * UUID / idempotency identifiers.
 */

// Pragmatic RFC-compatible email check that permits `+` tags, subdomains,
// hyphens, and Apple Private Relay addresses (`...@privaterelay.appleid.com`).
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"']+@[^\s@<>()[\]\\,;:"']+\.[^\s@<>()[\]\\,;:"']{2,}$/;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_.:-]{8,128}$/;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned || cleaned.length > 254) return null;
  if (!EMAIL_RE.test(cleaned)) return null;
  return cleaned;
}

export function normalizeDisplayName(
  raw: unknown,
  maxLength = 80,
): string | null {
  if (typeof raw !== "string") return null;
  // Normalize Unicode (umlauts / accented chars), drop control chars & angle brackets
  // to neutralize HTML injection while preserving O'Connor, Jean-Luc, Müller, René.
  const cleaned = raw
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength).trim() : cleaned;
}

export function isUuid(raw: unknown): raw is string {
  return typeof raw === "string" && UUID_RE.test(raw);
}

export function sanitizeIdempotencyKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return IDEMPOTENCY_KEY_RE.test(trimmed) ? trimmed : null;
}
