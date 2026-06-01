"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { renderMagicLinkEmail } from "@/lib/email/magicLink";
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
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

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
    const actionLink = data?.properties?.action_link;
    if (error || !actionLink) {
      console.error("[login] generateLink failed", error);
      return { ok: false, error: "Konnte den Login-Link nicht erstellen." };
    }
    const sent = await sendEmail({
      to: email,
      subject: "Dein Login-Link für Lernly",
      html: renderMagicLinkEmail(actionLink),
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
