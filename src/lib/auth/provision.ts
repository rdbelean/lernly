import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { renderMagicLinkEmail, renderMagicLinkText } from "@/lib/email/magicLink";
import { APP_URL } from "@/lib/email/brand";

// Ensure an auth user exists for `email`, then email them a login code + link so
// they can reach their freshly-provisioned account. Used by the Stripe webhook
// for guest checkout (buy first, account after payment).
//
// Reuses the exact device-independent flow from login: generateLink gives us the
// user id, a hashed_token (→ /auth/confirm link) AND the raw 6-digit email_otp in
// one call. If the user doesn't exist yet we create them (admin) — the
// handle_new_user trigger then inserts the public.users row the webhook updates.
//
// Returns the auth user id (null only if provisioning genuinely failed — the
// caller treats that as a retryable error so Stripe re-delivers the event).
export async function provisionUserAndSendLogin(opts: {
  email: string;
  next?: string;
  // When false, skip the email (the caller already has a session, e.g. a
  // logged-in purchase) and just resolve the user id.
  sendLogin?: boolean;
}): Promise<{ userId: string | null }> {
  const email = opts.email.trim();
  const next = opts.next ?? "/dashboard";
  const sendLogin = opts.sendLogin ?? true;
  const service = createServiceClient();
  const redirectTo = `${APP_URL}/auth/confirm?next=${encodeURIComponent(next)}`;

  let { data, error } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });
  // Brand-new buyer → no auth user yet. Create one (confirmed, passwordless),
  // then generate again. Mirrors requestMagicLink in login/actions.ts.
  if (error && /not.*found|no.*user|does not exist/i.test(error.message)) {
    const { error: createErr } = await service.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createErr) {
      console.error("[provision] createUser failed", createErr);
      return { userId: null };
    }
    ({ data, error } = await service.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    }));
  }

  const userId = data?.user?.id ?? null;
  if (error || !userId) {
    console.error("[provision] generateLink failed", error);
    return { userId };
  }

  if (sendLogin) {
    const props = data?.properties;
    const tokenHash = props?.hashed_token;
    const code = props?.email_otp;
    const vtype = props?.verification_type ?? "magiclink";
    if (tokenHash && code) {
      const confirmUrl = `${APP_URL}/auth/confirm?token_hash=${encodeURIComponent(
        tokenHash,
      )}&type=${encodeURIComponent(vtype)}&next=${encodeURIComponent(next)}`;
      // Best-effort — a failed send must not fail provisioning (the plan is
      // already granted; the user can still request a fresh login link).
      await sendEmail({
        to: email,
        subject: "Dein Lernly-Zugang ist bereit — Login-Code",
        html: renderMagicLinkEmail({ url: confirmUrl, code }),
        text: renderMagicLinkText({ url: confirmUrl, code }),
      });
    } else {
      console.error("[provision] missing token_hash/email_otp for", email);
    }
  }

  return { userId };
}
