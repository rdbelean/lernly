import { NextResponse } from "next/server";
import {
  CREDIT_PRODUCTS,
  creditProductFromPriceId,
  getCreditPriceId,
  getPriceId,
  getStripe,
  type CreditProduct,
  type Plan,
} from "@/lib/stripe";
import {
  createClient as createSupabaseServer,
  createServiceClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

const VALID_PLANS: Plan[] = ["pro", "team", "pro_byok", "team_byok"];
const VALID_CREDITS: CreditProduct[] = ["sprint", "payg", "payg_pro"];

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Billing ist noch nicht konfiguriert." },
      { status: 503 },
    );
  }

  let body: { plan?: string; credit?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Decide whether this is a subscription checkout or a one-time credit
  // purchase. Exactly one of plan/credit must be present.
  const isSubscription =
    body.plan && VALID_PLANS.includes(body.plan as Plan);
  const isCredit =
    body.credit && VALID_CREDITS.includes(body.credit as CreditProduct);

  if (!isSubscription && !isCredit) {
    return NextResponse.json(
      { error: "plan oder credit muss gesetzt sein" },
      { status: 400 },
    );
  }

  const priceId = isSubscription
    ? getPriceId(body.plan as Plan)
    : getCreditPriceId(body.credit as CreditProduct);
  if (!priceId) {
    return NextResponse.json(
      { error: "Preis nicht konfiguriert." },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Defense: only Pro users get the discounted PAYG. We don't trust the
  // frontend to pick the right product.
  if (body.credit === "payg_pro") {
    const service = createServiceClient();
    const { data: profile } = await service
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();
    if (profile?.plan !== "pro" && profile?.plan !== "team") {
      return NextResponse.json(
        {
          error:
            "PAYG-Pro-Preis ist nur für Pro/Team-Mitglieder verfügbar — bitte 'payg' nutzen.",
        },
        { status: 403 },
      );
    }
  }

  const service = createServiceClient();
  const { data: profile } = await service
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id as string | null | undefined;
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

  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;

  // Subscriptions stay in subscription mode; credit purchases use payment mode
  // and never auto-renew.
  const session = await stripe.checkout.sessions.create(
    isSubscription
      ? {
          mode: "subscription",
          customer: customerId,
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${origin}/dashboard?upgraded=1`,
          cancel_url: `${origin}/dashboard/settings?cancelled=1`,
          allow_promotion_codes: true,
          client_reference_id: user.id,
        }
      : {
          mode: "payment",
          customer: customerId,
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${origin}/dashboard?credit_purchased=1`,
          cancel_url: `${origin}/dashboard?credit_cancelled=1`,
          client_reference_id: user.id,
          // The webhook reads this to know which credit product was purchased.
          metadata: {
            user_id: user.id,
            credit_product: body.credit as CreditProduct,
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

// Reference the helpers so unused-import warnings stay quiet when this file
// is rebuilt in isolation.
void CREDIT_PRODUCTS;
void creditProductFromPriceId;
