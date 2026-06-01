// Founder-only gate for /admin. Pure logic (no secrets) so it's unit-testable
// outside the Next bundler — the real security boundary is the service-role
// client (createServiceClient, which IS server-only), not this email compare.
//
// ADMIN_EMAIL overrides the hardcoded default so the allowed address can change
// without a code deploy; the fallback keeps the page locked to the founder even
// if the env var is never set.
export const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ?? "beleanrd@gmail.com"
)
  .trim()
  .toLowerCase();

export function isFounder(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}
