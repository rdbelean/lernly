import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { ensureUserAndGetLoginToken } from "@/lib/auth/provision";

export const runtime = "nodejs";

// Post-checkout AUTO-LOGIN. The guest success_url points here with the Stripe
// Checkout session id. We log the buyer in server-side (verifyOtp on a freshly
// minted token_hash — a route handler can set cookies). No code typing: the
// emailed code/link is only a fallback, and is fragile anyway (any later
// code-generation rotates it).
//
// Anti login-CSRF / session-fixation: a bare cross-site GET must NOT be able to
// mint a session from an attacker-suppliable id. So we bind the login to proof
// that THIS browser started the checkout — a one-time nonce that exists in both
// a SameSite cookie (set when checkout began) AND the Stripe session metadata.
// A foreign session_id carries the attacker's nonce, which the victim's browser
// doesn't hold, so the nonces won't match and no session is minted.
//
// Defence-in-depth: require the session PAID + RECENT (<30 min); clear the nonce
// after use (single-use). Any failure → /checkout/success (code entry + link),
// so nothing dead-ends.

const MAX_SESSION_AGE_SECONDS = 30 * 60;
const NONCE_COOKIE = "lernly_co_nonce";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  const fallback = new URL(
    `/checkout/success${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""}`,
    url.origin,
  );

  const stripe = getStripe();
  if (!stripe || !sessionId) return NextResponse.redirect(fallback);

  const cookieStore = await cookies();
  const browserNonce = cookieStore.get(NONCE_COOKIE)?.value ?? null;

  let email: string | null = null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid =
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required";
    const ageOk =
      typeof session.created === "number" &&
      Date.now() / 1000 - session.created < MAX_SESSION_AGE_SECONDS;
    const metaNonce = session.metadata?.login_nonce ?? null;

    // CSRF/fixation guard: this browser must hold the same nonce we stored in
    // the session when *it* started the checkout. Missing/mismatched → no login.
    const nonceOk = Boolean(browserNonce && metaNonce && browserNonce === metaNonce);

    if (!paid || !ageOk || !nonceOk) return NextResponse.redirect(fallback);
    email = session.customer_details?.email ?? session.customer_email ?? null;
  } catch (e) {
    console.error("[auth/checkout] session retrieve failed", e);
    return NextResponse.redirect(fallback);
  }
  if (!email) return NextResponse.redirect(fallback);

  const token = await ensureUserAndGetLoginToken(email);
  if (!token) return NextResponse.redirect(fallback);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: token.tokenHash,
    type: token.type,
  });
  if (error) {
    console.error("[auth/checkout] verifyOtp failed", error.message);
    return NextResponse.redirect(fallback);
  }

  // Burn the nonce (single-use) so a leaked success URL can't be replayed.
  cookieStore.set(NONCE_COOKIE, "", { path: "/", maxAge: 0 });

  // Logged in — the webhook applies the plan idempotently in parallel.
  return NextResponse.redirect(new URL("/dashboard?upgraded=1", url.origin));
}
