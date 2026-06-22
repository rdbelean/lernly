import "server-only";

// Server-side Cloudflare Turnstile verification. Returns ok:true when the token
// is valid. When TURNSTILE_SECRET_KEY isn't configured we fail OPEN in dev/
// preview (so the app keeps working without Cloudflare set up — the widget
// no-ops client-side too) but fail CLOSED in production, where a missing secret
// would silently remove the only bot gate on the cost-bearing anonymous path.
// Mirrors the inline verifier in /api/generate.
export async function verifyTurnstile(
  token: string | null,
  clientIp: string | null,
): Promise<{ ok: boolean; reason?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.VERCEL_ENV === "production") {
      console.error("[turnstile] TURNSTILE_SECRET_KEY missing in production — failing closed");
      return { ok: false, reason: "not_configured" };
    }
    return { ok: true, reason: "not_configured" };
  }
  if (!token) return { ok: false, reason: "missing_token" };

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (clientIp) body.set("remoteip", clientIp);
    const resp = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    );
    const data = (await resp.json()) as { success: boolean };
    return data.success ? { ok: true } : { ok: false, reason: "rejected" };
  } catch (e) {
    console.error("[turnstile] verify threw", e);
    return { ok: false, reason: "verify_threw" };
  }
}
