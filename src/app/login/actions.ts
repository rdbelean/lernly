"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { renderMagicLinkEmail, renderMagicLinkText } from "@/lib/email/magicLink";
import { verifyTurnstile } from "@/lib/turnstile";

export type MagicLinkState = { ok: boolean; error?: string; sentTo?: string };

function getOrigin(host: string | null, proto: string | null) {
  if (!host) return null;
  return `${proto ?? "https"}://${host}`;
}

function clientIpFrom(h: Headers): string | null {
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip");
}

// Magic-link abuse limits. Generous enough for real users (typos, "didn't get
// it, resend"), tight enough to stop enumeration / inbox-spam. Checked via the
// check_rate_limit RPC (sliding window, service-role only).
const MAGICLINK_IP_MAX = 8; // per IP
const MAGICLINK_EMAIL_MAX = 4; // per email address
const MAGICLINK_WINDOW_SECONDS = 3600; // 1 hour

async function magicLinkAllowed(
  ip: string | null,
  email: string,
): Promise<boolean> {
  const service = createServiceClient();
  try {
    // Per-email always; per-IP only when we have one. Both must pass.
    const buckets: { bucket: string; max: number }[] = [
      { bucket: `magiclink:email:${email.toLowerCase()}`, max: MAGICLINK_EMAIL_MAX },
    ];
    if (ip) buckets.push({ bucket: `magiclink:ip:${ip}`, max: MAGICLINK_IP_MAX });

    const results = await Promise.all(
      buckets.map(async ({ bucket, max }) => {
        const { data } = await service.rpc("check_rate_limit", {
          p_bucket: bucket,
          p_max: max,
          p_window_seconds: MAGICLINK_WINDOW_SECONDS,
        });
        return data === true;
      }),
    );
    return results.every(Boolean);
  } catch (e) {
    // Fail OPEN on limiter error — don't lock real users out if the RPC hiccups.
    console.error("[login] rate-limit check threw", e);
    return true;
  }
}

function sanitizeNext(raw: string | null | undefined): string {
  if (typeof raw !== "string") return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function loginWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const h = await headers();
  const origin =
    h.get("origin") ?? getOrigin(h.get("host"), h.get("x-forwarded-proto"));
  const next = sanitizeNext(formData.get("next") as string | null);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  if (data?.url) {
    redirect(data.url);
  }
  redirect("/login?error=unknown");
}

// Send the magic-link ourselves via Resend (NOT Supabase SMTP, which hangs).
// useActionState-compatible: returns a result the client renders, never redirects.
export async function requestMagicLink(
  _prev: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.includes("@")) {
    return { ok: false, error: "Bitte gib eine gültige E-Mail-Adresse ein." };
  }
  const h = await headers();
  const ip = clientIpFrom(h);

  // CAPTCHA gate (no-ops if TURNSTILE_SECRET_KEY isn't set). Stops bots from
  // automating link requests / enumerating emails.
  const turnstileToken = formData.get("turnstileToken");
  const captcha = await verifyTurnstile(
    typeof turnstileToken === "string" ? turnstileToken : null,
    ip,
  );
  if (!captcha.ok) {
    return {
      ok: false,
      error: "Bitte bestätige kurz, dass du kein Bot bist, und versuch es erneut.",
    };
  }

  // Sliding-window rate limit per IP + per email.
  const allowed = await magicLinkAllowed(ip, email);
  if (!allowed) {
    return {
      ok: false,
      error:
        "Zu viele Anfragen. Warte einen Moment und versuch es dann erneut — oder nutz den Google-Login.",
    };
  }

  const origin =
    h.get("origin") ?? getOrigin(h.get("host"), h.get("x-forwarded-proto"));
  const next = sanitizeNext(formData.get("next") as string | null);
  // redirect_to embedded in Supabase's action_link (which we don't use); our own
  // confirm URL is built below from the returned hashed_token.
  const redirectTo = `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;

  const service = createServiceClient();
  try {
    let { data, error } = await service.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    // Brand-new user → generateLink('magiclink') has no user yet. Create a
    // passwordless account, then generate (replicates old shouldCreateUser).
    if (error && /not.*found|no.*user|does not exist/i.test(error.message)) {
      const { error: createErr } = await service.auth.admin.createUser({
        email,
        email_confirm: false,
      });
      if (createErr) {
        console.error("[login] createUser failed", createErr);
        return { ok: false, error: "Konnte das Konto nicht anlegen — versuch's per Google." };
      }
      ({ data, error } = await service.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      }));
    }
    // generateLink hands us BOTH a hashed_token (for a device-independent
    // confirm link) and the raw 6-digit email_otp (for typing into the PWA).
    const props = data?.properties;
    const tokenHash = props?.hashed_token;
    const code = props?.email_otp;
    const vtype = props?.verification_type ?? "magiclink";
    if (error || !tokenHash || !code) {
      console.error("[login] generateLink missing token/otp", error);
      return { ok: false, error: "Konnte den Login-Code nicht erstellen." };
    }
    // Our own confirm link → /auth/confirm runs verifyOtp({ token_hash }),
    // which is NOT bound to the requesting device (no PKCE) → works anywhere.
    const confirmUrl = `${origin}/auth/confirm?token_hash=${encodeURIComponent(
      tokenHash,
    )}&type=${encodeURIComponent(vtype)}&next=${encodeURIComponent(next)}`;
    const sent = await sendEmail({
      to: email,
      subject: "Dein Login-Code für Lernly",
      html: renderMagicLinkEmail({ url: confirmUrl, code }),
      text: renderMagicLinkText({ url: confirmUrl, code }),
    });
    if (!sent.ok) {
      return { ok: false, error: "E-Mail konnte nicht gesendet werden — versuch's gleich nochmal." };
    }
    return { ok: true, sentTo: email };
  } catch (e) {
    console.error("[login] requestMagicLink threw", e);
    return { ok: false, error: "Unerwarteter Fehler — versuch's per Google." };
  }
}

// Per-email/per-IP limiter for the 6-digit code verification — defence-in-depth
// against brute force on top of Supabase's own per-token attempt cap.
const OTP_VERIFY_IP_MAX = 20;
const OTP_VERIFY_EMAIL_MAX = 10;
const OTP_VERIFY_WINDOW_SECONDS = 900; // 15 min

async function otpVerifyAllowed(
  ip: string | null,
  email: string,
): Promise<boolean> {
  const service = createServiceClient();
  try {
    const buckets: { bucket: string; max: number }[] = [
      { bucket: `otpverify:email:${email.toLowerCase()}`, max: OTP_VERIFY_EMAIL_MAX },
    ];
    if (ip) buckets.push({ bucket: `otpverify:ip:${ip}`, max: OTP_VERIFY_IP_MAX });
    const results = await Promise.all(
      buckets.map(async ({ bucket, max }) => {
        const { data } = await service.rpc("check_rate_limit", {
          p_bucket: bucket,
          p_max: max,
          p_window_seconds: OTP_VERIFY_WINDOW_SECONDS,
        });
        return data === true;
      }),
    );
    return results.every(Boolean);
  } catch (e) {
    console.error("[login] otp-verify rate-limit threw", e);
    return true; // fail open — same posture as the request limiter
  }
}

// Verify the 6-digit code the user typed (the PWA-friendly path — no link
// hopping). verifyOtp({ email, token }) sets the session cookies on THIS device,
// so the installed app ends up logged in. useActionState-compatible: redirects
// on success, returns an error state otherwise.
export async function verifyMagicCode(
  _prev: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.includes("@")) {
    return { ok: false, error: "Etwas ist schiefgelaufen — fordere einen neuen Code an." };
  }
  const codeRaw = formData.get("code");
  const code = typeof codeRaw === "string" ? codeRaw.replace(/\s/g, "") : "";
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Bitte gib den 6-stelligen Code aus der E-Mail ein." };
  }

  const h = await headers();
  const ip = clientIpFrom(h);
  const allowed = await otpVerifyAllowed(ip, email);
  if (!allowed) {
    return { ok: false, error: "Zu viele Versuche. Fordere einen neuen Code an." };
  }

  const next = sanitizeNext(formData.get("next") as string | null);
  const supabase = await createClient();
  let failed = false;
  try {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "magiclink",
    });
    if (error) failed = true;
  } catch (e) {
    console.error("[login] verifyOtp threw", e);
    return { ok: false, error: "Unerwarteter Fehler — versuch's gleich nochmal." };
  }
  if (failed) {
    return {
      ok: false,
      error: "Code ist falsch oder abgelaufen. Prüf die Zahl oder fordere einen neuen an.",
    };
  }
  // Session cookies are set; leave the login page.
  redirect(next);
}
