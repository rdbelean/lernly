import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  CREDIT_PRODUCTS,
  creditProductFromPriceId,
  getStripe,
  planFromPriceId,
  type CreditProduct,
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
      })
      .eq("stripe_customer_id", customerId);

    if (error) {
      console.error("[stripe webhook] user update failed", error);
    }
  }

  async function activateCramJob(session: Stripe.Checkout.Session): Promise<void> {
    const jobId = session.metadata?.cram_job_id;
    if (!jobId) return;

    // Idempotent: only materialize from an awaiting_payment job. A re-delivered
    // webhook finds the job already 'queued' and does nothing.
    const { data: job } = await service
      .from("cram_jobs")
      .select("id, user_id, status, chunk_plan")
      .eq("id", jobId)
      .single();
    if (!job || job.status !== "awaiting_payment") return;

    const plan = (job.chunk_plan ?? []) as {
      source_path: string;
      label: string;
      page_start: number | null;
      page_end: number | null;
    }[];

    const rows = plan.map((c) => ({
      user_id: job.user_id,
      cram_job_id: job.id,
      status: "queued",
      source_path: c.source_path,
      page_start: c.page_start,
      page_end: c.page_end,
      chunk_label: c.label,
      title: "wird erstellt …",
      exam_type: "essay", // overwritten by the worker with the real pack
      pack_data: {},
    }));

    const { error: insErr } = await service.from("study_packs").insert(rows);
    if (insErr) {
      console.error("[stripe webhook] cram chunk insert failed", insErr);
      return;
    }
    await service.from("cram_jobs").update({ status: "queued", updated_at: new Date().toISOString() }).eq("id", job.id);
  }

  async function grantCreditsFromSession(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    // Pricing v2: one-time credit purchase (Sprint / PAYG / PAYG-Pro).
    // Insert one pack_credits row per credit so the table doubles as an audit
    // log. Sprint expires 7 days from purchase, PAYG never expires.
    let product: CreditProduct | null = null;
    if (session.metadata?.credit_product) {
      product = session.metadata.credit_product as CreditProduct;
    }
    if (!product && stripe) {
      const items = await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 5,
      });
      for (const li of items.data) {
        product = creditProductFromPriceId(li.price?.id);
        if (product) break;
      }
    }
    if (!product) {
      console.warn(
        "[stripe webhook] one-time session without recognized credit product",
        { sessionId: session.id },
      );
      return;
    }

    const userId =
      (session.metadata?.user_id as string | undefined) ??
      (session.client_reference_id ?? null);
    if (!userId) {
      console.error(
        "[stripe webhook] credit session missing user_id metadata",
        { sessionId: session.id },
      );
      return;
    }

    const spec = CREDIT_PRODUCTS[product];
    const expiresAt = spec.expiresAfterDays
      ? new Date(
          Date.now() + spec.expiresAfterDays * 24 * 60 * 60 * 1000,
        ).toISOString()
      : null;

    const rows = Array.from({ length: spec.quantity }, () => ({
      user_id: userId,
      kind: spec.kind,
      stripe_session_id: session.id,
      expires_at: expiresAt,
    }));

    const { error } = await service.from("pack_credits").insert(rows);
    if (error) {
      console.error("[stripe webhook] pack_credits insert failed", error);
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
        if (session.metadata?.cram_job_id) {
          await activateCramJob(session);
        } else {
          await grantCreditsFromSession(session);
        }
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
