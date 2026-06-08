import type { DayPoint } from "./metricsShared";

// ---------------------------------------------------------------------------
// Pure money types + math for the /admin GELD row. No `server-only`, no Stripe
// SDK import — so this is unit-testable and safe to hand to client charts
// (everything here is plain numbers in minor units, no secrets).
// ---------------------------------------------------------------------------

export type MoneyMetrics = {
  // false when STRIPE_SECRET_KEY is missing → UI renders "—" instead of 0.
  available: boolean;
  currency: string; // lowercased ISO, e.g. "eur"
  mrrCents: number; // active subs normalized to one month
  arrCents: number; // mrrCents * 12
  payingCount: number; // injected from DB (effectivePlan), not Stripe
  revenueTodayCents: number;
  revenueThisMonthCents: number;
  revenueLastMonthCents: number; // for the honest MoM trend
  revenueTotalCents: number; // all-time gross paid
  netNewMrrThisMonthCents: number; // MRR from subs created this month
  revenueByDay: DayPoint[]; // last REVENUE_WINDOW_DAYS, ascending
};

// Structural subsets of the Stripe objects we read — lets tests pass plain
// literals; real Stripe.Subscription / Stripe.Price satisfy these structurally.
export type PriceLike = {
  unit_amount: number | null;
  currency: string;
  recurring: {
    interval: "day" | "week" | "month" | "year";
    interval_count: number;
  } | null;
};
export type SubLike = {
  status: string;
  created: number; // unix seconds
  items: { data: Array<{ price: PriceLike | null }> };
};

// Normalize one price to a monthly figure in minor units. One-time prices
// (recurring === null) and a null unit_amount contribute 0 to MRR. No hardcoded
// amounts — derived from the price's own interval, so it stays correct if the
// prices change.
export function priceToMonthlyCents(
  price: PriceLike | null | undefined,
): number {
  if (!price || price.unit_amount == null || !price.recurring) return 0;
  const amt = price.unit_amount;
  const n = price.recurring.interval_count || 1;
  switch (price.recurring.interval) {
    case "month":
      return Math.round(amt / n);
    case "year":
      return Math.round(amt / (12 * n));
    case "week":
      return Math.round((amt * 52) / (12 * n));
    case "day":
      return Math.round((amt * 365) / (12 * n));
    default:
      return 0;
  }
}

// Sum the monthly-normalized value across a subscription's items (multi-item
// safe; an empty item list → 0).
export function subscriptionMrrCents(sub: SubLike): number {
  return sub.items.data.reduce(
    (sum, it) => sum + priceToMonthlyCents(it.price),
    0,
  );
}

export type Trend = {
  deltaCents: number;
  direction: "up" | "down" | "flat";
  pct: number | null; // null when no baseline (lastMonth === 0) → render "neu"
};

// Honest month-over-month trend. We never fabricate a historical MRR series;
// this compares two real revenue totals. pct is null when there's no baseline.
export function momTrend(
  thisMonthCents: number,
  lastMonthCents: number,
): Trend {
  const deltaCents = thisMonthCents - lastMonthCents;
  const direction = deltaCents > 0 ? "up" : deltaCents < 0 ? "down" : "flat";
  const pct =
    lastMonthCents === 0 ? null : (deltaCents / lastMonthCents) * 100;
  return { deltaCents, direction, pct };
}
