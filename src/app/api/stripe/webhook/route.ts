import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, planFromPriceId } from "@/lib/stripe";
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

  async function applySubscriptionToUser(sub: Stripe.Subscription) {
    const customerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const priceId = sub.items.data[0]?.price?.id;
    const plan = planFromPriceId(priceId);
    const status = sub.status;
    const active = status === "active" || status === "trialing";
    const sub_with_period = sub as Stripe.Subscription & {
      current_period_end?: number;
    };
    const periodEndIso = sub_with_period.current_period_end
      ? new Date(sub_with_period.current_period_end * 1000).toISOString()
      : null;

    const newPlan = active && plan ? plan : "free";

    const { error } = await service
      .from("users")
      .update({
        plan: newPlan,
        stripe_subscription_id: sub.id,
        current_period_end: periodEndIso,
      })
      .eq("stripe_customer_id", customerId);

    if (error) {
      console.error("[stripe webhook] user update failed", error);
    }
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription && session.customer) {
        const sub = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );
        await applySubscriptionToUser(sub);
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
