import "server-only";
import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  cached = new Stripe(key);
  return cached;
}

export type Plan = "pro" | "team" | "pro_byok" | "team_byok";

export function getPriceId(plan: Plan): string | null {
  switch (plan) {
    case "pro":
      return process.env.STRIPE_PRICE_PRO_MONTHLY ?? null;
    case "team":
      return process.env.STRIPE_PRICE_TEAM_MONTHLY ?? null;
    case "pro_byok":
      return process.env.STRIPE_PRICE_PRO_BYOK_MONTHLY ?? null;
    case "team_byok":
      return process.env.STRIPE_PRICE_TEAM_BYOK_MONTHLY ?? null;
    default:
      return null;
  }
}

export function planFromPriceId(priceId: string | undefined | null):
  | "pro"
  | "team"
  | null {
  if (!priceId) return null;
  if (
    priceId === process.env.STRIPE_PRICE_PRO_MONTHLY ||
    priceId === process.env.STRIPE_PRICE_PRO_BYOK_MONTHLY
  ) {
    return "pro";
  }
  if (
    priceId === process.env.STRIPE_PRICE_TEAM_MONTHLY ||
    priceId === process.env.STRIPE_PRICE_TEAM_BYOK_MONTHLY
  ) {
    return "team";
  }
  return null;
}
