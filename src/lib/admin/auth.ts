// Founder / closed-beta admin allowlist. Pure logic (no secrets) so it's
// unit-testable outside the Next bundler — the real security boundary is the
// server-side session & service-role client, not this email compare.
//
// `ADMIN_EMAILS` accepts comma/semicolon/whitespace-separated addresses;
// `ADMIN_EMAIL` stays supported for single-address setups. Defaults to the
// founder email if neither env var is set.
export const DEFAULT_ADMIN_EMAIL = "beleanrd@gmail.com";

export const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL
)
  .trim()
  .toLowerCase();

export const CLOSED_BETA_LOGIN_ERROR =
  "Aktuell geschlossene Beta – Zugang nur für freigeschaltete Accounts.";

export function getAllowedAdminEmails(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const combined = [env.ADMIN_EMAILS, env.ADMIN_EMAIL]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(",");

  const parsed = combined
    .split(/[\s,;]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.includes("@"));

  if (parsed.length > 0) {
    return Array.from(new Set(parsed));
  }

  return [DEFAULT_ADMIN_EMAIL];
}

export function isAllowedAdminEmail(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return getAllowedAdminEmails(env).includes(normalized);
}

export function isFounder(email: string | null | undefined): boolean {
  return isAllowedAdminEmail(email);
}
