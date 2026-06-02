import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  EINZELKLAUSUR_ACCESS_DAYS,
  getStripe,
  planFromPriceId,
} from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

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
    }
  }

  // One-time Einzelklausur. Grants 14 days of access + a fresh 5-pack budget
  // (reset the monthly counter so a free user who already used their 2 packs
  // gets the full Einzelklausur allowance).
  async function grantEinzelklausur(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const userId =
      (session.metadata?.user_id as string | undefined) ??
      (session.client_reference_id ?? null);
    if (!userId) {
      console.error(
        "[stripe webhook] einzelklausur session missing user_id",
        { sessionId: session.id },
      );
      return;
    }

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
    }
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );
        await applySubscriptionToUser(sub);
      } else if (session.mode === "payment") {
        // The only one-time product in v3 is Einzelklausur.
        await grantEinzelklausur(session);
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

  return NextResponse.json({ received: true });
}
