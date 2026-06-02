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

// =========================================================================
// Pricing v3 — new tariff model
// =========================================================================
// Two recurring subscription plans + one one-time product. Team and the old
// credit/cram SKUs (Sprint / PAYG / Cram upcharge) are gone — Einzelklausur
// is the single one-time purchase and Cram is now a feature of paid access.
//
//   einzelklausur  4,99 €  one-time   → 14 days access, 5 packs
//   semester      29,99 €  sub (6 mo) → 60 packs / month
//   monthly        8,99 €  sub (1 mo) → 50 packs / month

export type SubscriptionPlan = "semester" | "monthly";
// All plan values that can land in users.plan (free is the default, never sold).
export type Plan = "free" | "einzelklausur" | SubscriptionPlan;

// One-time Einzelklausur grants this many days of full access.
export const EINZELKLAUSUR_ACCESS_DAYS = 14;

export function getSubscriptionPriceId(plan: SubscriptionPlan): string | null {
  switch (plan) {
    case "semester":
      return process.env.STRIPE_PRICE_SEMESTER ?? null;
    case "monthly":
      return process.env.STRIPE_PRICE_MONTHLY ?? null;
    default:
      return null;
  }
}

export function getEinzelklausurPriceId(): string | null {
  return process.env.STRIPE_PRICE_EINZELKLAUSUR ?? null;
}

export function planFromPriceId(
  priceId: string | undefined | null,
): SubscriptionPlan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_SEMESTER) return "semester";
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return "monthly";
  return null;
}
