import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { ensureUserAndGetLoginToken } from "@/lib/auth/provision";

export const runtime = "nodejs";

// Post-checkout AUTO-LOGIN. The guest success_url points here with the Stripe
// Checkout session id. We confirm the session is PAID and RECENT, then log the
// buyer in server-side (verifyOtp on a freshly-minted token_hash — a route
// handler can set cookies). No code typing: the emailed code/link is only a
// fallback, and is fragile anyway (any later code-generation rotates it).
//
// Security: the session id is an unguessable Stripe token tied to one paid
// session + one email. We additionally require the session to be < 30 min old
// so a stale/leaked link can't act as a permanent login key. Any failure falls
// back to /checkout/success (code entry + email link), so nothing dead-ends.

const MAX_SESSION_AGE_SECONDS = 30 * 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  const fallback = new URL(
    `/checkout/success${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""}`,
    url.origin,
  );

  const stripe = getStripe();
  if (!stripe || !sessionId) return NextResponse.redirect(fallback);

  let email: string | null = null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid =
      session.payment_status === "paid" || session.status === "complete";
    const ageOk =
      typeof session.created === "number" &&
      Date.now() / 1000 - session.created < MAX_SESSION_AGE_SECONDS;
    if (!paid || !ageOk) return NextResponse.redirect(fallback);
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

  // Logged in — the webhook applies the plan idempotently in parallel.
  return NextResponse.redirect(new URL("/dashboard?upgraded=1", url.origin));
}
