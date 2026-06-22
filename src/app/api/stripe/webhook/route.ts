import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import type Stripe from "stripe";
import {
  EINZELKLAUSUR_ACCESS_DAYS,
  getStripe,
  planFromPriceId,
} from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { provisionUserAndSendLogin } from "@/lib/auth/provision";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook not configured" },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[/api/stripe/webhook] signature verification failed", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  // Idempotency: Stripe delivers at least once and retries on any non-2xx, so
  // skip events we've already handled (prevents double provisioning / double
  // plan grants). Fail-open if the ledger table isn't present yet (the window
  // before the additive migration is applied) — provisioning is near-idempotent.
  try {
    const { data: seen } = await service
      .from("processed_stripe_events")
      .select("event_id")
      .eq("event_id", event.id)
      .maybeSingle();
    if (seen) {
      return NextResponse.json({ received: true, deduped: true });
    }
  } catch (e) {
    console.error("[stripe webhook] dedup check failed (continuing)", e);
  }

  // Subscriptions (Semester / Monatlich). plan_expires_at = the current period
  // end; an inactive/cancelled sub drops the user back to free.
  async function applySubscriptionToUser(sub: Stripe.Subscription) {
    const customerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const priceId = sub.items.data[0]?.price?.id;
    const plan = planFromPriceId(priceId);
    const status = sub.status;
    const active = status === "active" || status === "trialing";
    // Recent Stripe API versions moved current_period_end off the Subscription
    // onto each subscription item; read the item first, fall back to legacy.
    const item = sub.items.data[0] as
      | (Stripe.SubscriptionItem & { current_period_end?: number })
      | undefined;
    const periodEndUnix =
      item?.current_period_end ??
      (sub as Stripe.Subscription & { current_period_end?: number })
        .current_period_end;
    const periodEndIso = periodEndUnix
      ? new Date(periodEndUnix * 1000).toISOString()
      : null;

    const newPlan = active && plan ? plan : "free";

    const { error } = await service
      .from("users")
      .update({
        plan: newPlan,
        stripe_subscription_id: sub.id,
        current_period_end: periodEndIso,
        plan_expires_at: newPlan === "free" ? null : periodEndIso,
      })
      .eq("stripe_customer_id", customerId);

    if (error) {
      console.error("[stripe webhook] user update failed", error);
      Sentry.captureException(error, { tags: { route: "stripe/webhook", op: "subscription_update" } });
    }
  }

  // One-time Einzelklausur. Grants 14 days of access + a fresh 5-pack budget
  // (reset the monthly counter so a free user who already used their 2 packs
  // gets the full Einzelklausur allowance). Updates by user id — the caller
  // resolves it (logged-in metadata or guest-provisioned by email).
  async function grantEinzelklausur(userId: string): Promise<void> {
    const expiresAt = new Date(
      Date.now() + EINZELKLAUSUR_ACCESS_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { error } = await service
      .from("users")
      .update({
        plan: "einzelklausur",
        plan_expires_at: expiresAt,
        current_period_end: null,
        packs_used_this_month: 0,
        last_quota_reset_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("[stripe webhook] einzelklausur grant failed", error);
      Sentry.captureException(error, { tags: { route: "stripe/webhook", op: "einzelklausur_grant" } });
    }
  }

  // Resolve the buyer for a completed checkout: a logged-in user (id in
  // metadata / client_reference_id) or a GUEST we provision from the email
  // Stripe collected. Returns null only on unrecoverable failure.
  async function resolveUserForSession(
    session: Stripe.Checkout.Session,
  ): Promise<string | null> {
    const existing =
      (session.metadata?.user_id as string | undefined) ??
      session.client_reference_id ??
      null;
    if (existing) return existing;

    const email =
      session.customer_details?.email ?? session.customer_email ?? null;
    if (!email) {
      console.error(
        "[stripe webhook] completed session has no email — cannot provision",
        { sessionId: session.id },
      );
      return null;
    }
    // Guest: create-or-find the account and email them a login code + link.
    const { userId } = await provisionUserAndSendLogin({
      email,
      next: "/dashboard",
    });
    return userId;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = await resolveUserForSession(session);
      if (!userId) {
        // Payment succeeded but we couldn't attach it to an account. Surface
        // loudly and return 500 so Stripe retries (covers a transient Supabase
        // failure); do NOT mark the event processed.
        console.error(
          "[stripe webhook] could not resolve/provision user for paid session",
          { sessionId: session.id },
        );
        return NextResponse.json(
          { error: "provisioning failed" },
          { status: 500 },
        );
      }

      // Link the Stripe customer so future subscription events (renewals,
      // cancellations) resolve by stripe_customer_id.
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : (session.customer?.id ?? null);
      if (customerId) {
        await service
          .from("users")
          .update({ stripe_customer_id: customerId })
          .eq("id", userId);
      }

      if (session.mode === "subscription" && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );
        await applySubscriptionToUser(sub);
      } else if (session.mode === "payment") {
        // The only one-time product in v3 is Einzelklausur.
        await grantEinzelklausur(userId);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await applySubscriptionToUser(event.data.object as Stripe.Subscription);
      break;
    }
    default:
      break;
  }

  // Record as processed (idempotency ledger). Fail-open if the table isn't
  // applied yet; ignore duplicates from a racing concurrent delivery.
  try {
    await service
      .from("processed_stripe_events")
      .upsert(
        { event_id: event.id, type: event.type },
        { onConflict: "event_id", ignoreDuplicates: true },
      );
  } catch (e) {
    console.error(
      "[stripe webhook] failed to record processed event (continuing)",
      e,
    );
  }

  return NextResponse.json({ received: true });
}
