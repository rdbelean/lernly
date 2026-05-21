import { NextResponse } from "next/server";
import { getPriceId, getStripe, type Plan } from "@/lib/stripe";
import {
  createClient as createSupabaseServer,
  createServiceClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

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

  const validPlans: Plan[] = ["pro", "team", "pro_byok", "team_byok"];
  if (!body.plan || !validPlans.includes(body.plan as Plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  const plan = body.plan as Plan;

  const priceId = getPriceId(plan);
  if (!priceId) {
    return NextResponse.json(
      { error: `Preis für ${plan} nicht konfiguriert.` },
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

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/dashboard/settings?cancelled=1`,
    allow_promotion_codes: true,
    client_reference_id: user.id,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe gab keine Checkout-URL zurück." },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: session.url });
}
