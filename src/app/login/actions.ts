"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { renderMagicLinkEmail } from "@/lib/email/magicLink";

export type MagicLinkState = { ok: boolean; error?: string; sentTo?: string };

function getOrigin(host: string | null, proto: string | null) {
  if (!host) return null;
  return `${proto ?? "https"}://${host}`;
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
