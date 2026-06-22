// Anonymous-trial device identity. The lernly_did cookie is the per-device key
// for the anonymous free-pack quota (see check_anonymous_quota). It is NOT a
// security boundary — clearing it grants another try; Turnstile + the IP
// ceiling are the real cost caps. It only stops honest co-located users (same
// campus / NAT IP) from colliding on a single IP-based quota.

export const ANON_DEVICE_COOKIE = "lernly_did";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A device id we mint is always a UUID. Reject anything else so a junk or
// tampered cookie falls back to "new device" instead of being trusted.
export function isValidDeviceId(value: string | null | undefined): boolean {
  return typeof value === "string" && UUID_RE.test(value);
}

// Pull a valid lernly_did out of a raw Cookie header, or null.
export function parseDeviceIdFromCookie(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${ANON_DEVICE_COOKIE}=([^;]+)`),
  );
  const value = match?.[1];
  return value && isValidDeviceId(value) ? value : null;
}

// Cookie options for persisting the device id (server-set, HttpOnly).
export function deviceCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  };
}
