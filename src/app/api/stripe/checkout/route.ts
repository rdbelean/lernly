import { NextResponse } from "next/server";
import {
  getEinzelklausurPriceId,
  getStripe,
  getSubscriptionPriceId,
  type SubscriptionPlan,
} from "@/lib/stripe";
import {
  createClient as createSupabaseServer,
  createServiceClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = ["semester", "monthly"];

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Billing ist noch nicht konfiguriert." },
      { status: 503 },
    );
  }

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Exactly one of three products: einzelklausur (one-time) or a subscription
  // (semester / monthly).
  const isEinzelklausur = body.plan === "einzelklausur";
  const isSubscription =
    !!body.plan && SUBSCRIPTION_PLANS.includes(body.plan as SubscriptionPlan);

  if (!isEinzelklausur && !isSubscription) {
    return NextResponse.json(
      { error: "Ungültiger Plan." },
      { status: 400 },
    );
  }

  const priceId = isEinzelklausur
    ? getEinzelklausurPriceId()
    : getSubscriptionPriceId(body.plan as SubscriptionPlan);
  if (!priceId) {
    return NextResponse.json(
      { error: "Preis nicht konfiguriert." },
      { status: 503 },
    );
  }

  // Auth is OPTIONAL. Logged-in users keep the existing flow (pre-created Stripe
  // customer + client_reference_id). Guests can buy without an account — Stripe
  // collects their email, and the webhook provisions the account after payment.
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let customerId: string | undefined;
  if (user) {
    const service = createServiceClient();
    const { data: profile } = await service
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    customerId = (profile?.stripe_customer_id as string | null) ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await service
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }
  }

  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  // Logged-in users land back in the dashboard; guests go to a success page that
  // confirms payment and hands them a login code (no account beforehand).
  const successUrl = user
    ? `${origin}/dashboard?upgraded=1`
    : `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = user
    ? `${origin}/dashboard/settings?cancelled=1`
    : `${origin}/?checkout=cancelled`;
  const plan = body.plan as string;

  // Subscriptions stay in subscription mode; Einzelklausur uses payment mode
  // and never auto-renews. For guests we omit customer/client_reference_id so
  // Stripe creates the customer and collects the email itself.
  const session = await stripe.checkout.sessions.create(
    isSubscription
      ? {
          mode: "subscription",
          ...(customerId ? { customer: customerId } : {}),
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: successUrl,
          cancel_url: cancelUrl,
          allow_promotion_codes: true,
          ...(user ? { client_reference_id: user.id } : {}),
          metadata: {
            plan,
            ...(user ? { user_id: user.id } : {}),
          },
        }
      : {
          mode: "payment",
          ...(customerId
            ? { customer: customerId }
            : { customer_creation: "always" }),
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: successUrl,
          cancel_url: cancelUrl,
          ...(user ? { client_reference_id: user.id } : {}),
          metadata: {
            product: "einzelklausur",
            plan: "einzelklausur",
            ...(user ? { user_id: user.id } : {}),
          },
        },
  );

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe gab keine Checkout-URL zurück." },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: session.url });
}
