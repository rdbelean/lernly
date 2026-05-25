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
export type CreditProduct = "sprint" | "payg" | "payg_pro";

// One-time credit products (Pricing v2). Each entry tracks how many
// pack_credits rows the Stripe webhook should insert + whether the credit has
// a hard expiry (Sprint: 7 days, PAYG: no expiry).
export const CREDIT_PRODUCTS: Record<
  CreditProduct,
  { quantity: number; expiresAfterDays: number | null; kind: "sprint" | "payg" | "pro_topup" }
> = {
  sprint: { quantity: 5, expiresAfterDays: 7, kind: "sprint" },
  payg: { quantity: 1, expiresAfterDays: null, kind: "payg" },
  payg_pro: { quantity: 1, expiresAfterDays: null, kind: "pro_topup" },
};

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

export function getCreditPriceId(product: CreditProduct): string | null {
  switch (product) {
    case "sprint":
      return process.env.STRIPE_PRICE_SPRINT_PACK ?? null;
    case "payg":
      return process.env.STRIPE_PRICE_PAYG_PACK ?? null;
    case "payg_pro":
      return process.env.STRIPE_PRICE_PAYG_PACK_PRO ?? null;
    default:
      return null;
  }
}

// Cram-mode is a one-time premium upcharge — NOT a pack_credit. It triggers
// background job processing, so it has its own price + the webhook keys off the
// cram_job_id metadata (not off a credit product).
export const CRAM_PRICE_EUR = 6.99;

export function getCramPriceId(): string | null {
  return process.env.STRIPE_PRICE_CRAM ?? null;
}

export function creditProductFromPriceId(
  priceId: string | undefined | null,
): CreditProduct | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_SPRINT_PACK) return "sprint";
  if (priceId === process.env.STRIPE_PRICE_PAYG_PACK) return "payg";
  if (priceId === process.env.STRIPE_PRICE_PAYG_PACK_PRO) return "payg_pro";
  return null;
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
