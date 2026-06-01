import "server-only";

// Server-side Cloudflare Turnstile verification. Returns ok:true when the token
// is valid OR when TURNSTILE_SECRET_KEY isn't configured (so the app keeps
// working in environments without Cloudflare set up — the widget also no-ops
// client-side in that case). Mirrors the inline verifier in /api/generate.
export async function verifyTurnstile(
  token: string | null,
  clientIp: string | null,
): Promise<{ ok: boolean; reason?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, reason: "not_configured" };
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
