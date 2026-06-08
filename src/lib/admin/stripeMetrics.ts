import "server-only";
import { unstable_cache } from "next/cache";
import { getStripe } from "@/lib/stripe";
import {
  dayBucketsISO,
  dayKeyFromUnix,
  fillDayBuckets,
  REVENUE_WINDOW_DAYS,
} from "./metricsShared";
import { type MoneyMetrics, subscriptionMrrCents } from "./stripeMetricsShared";

// Everything except payingCount, which is DB-sourced (effectivePlan) and merged
// into MoneyMetrics in the page — Stripe would miss the one-time Einzelklausur.
export type StripeMoney = Omit<MoneyMetrics, "payingCount">;

const DAY_MS = 24 * 60 * 60 * 1000;

// Graceful degradation when Stripe isn't configured: availability=false, all
// zero, full zero-filled axis so charts still render "noch keine Daten".
function emptyMoney(now: Date): StripeMoney {
  return {
    available: false,
    currency: "eur",
    mrrCents: 0,
    arrCents: 0,
    revenueTodayCents: 0,
    revenueThisMonthCents: 0,
    revenueLastMonthCents: 0,
    revenueTotalCents: 0,
    netNewMrrThisMonthCents: 0,
    revenueByDay: dayBucketsISO(now, REVENUE_WINDOW_DAYS),
  };
}

async function fetchStripeMoney(now: Date): Promise<StripeMoney> {
  const stripe = getStripe();
  if (!stripe) return emptyMoney(now);

  // --- MRR + net-new MRR this month, across ALL active subscriptions ---
  let mrrCents = 0;
  let netNewMrrThisMonthCents = 0;
  let currency = "eur";
  const monthStartUnix = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000,
  );
  await stripe.subscriptions
    .list({ status: "active", expand: ["data.items.data.price"], limit: 100 })
    .autoPagingEach((sub) => {
      const m = subscriptionMrrCents(sub);
      mrrCents += m;
      if (sub.created >= monthStartUnix) netNewMrrThisMonthCents += m;
      const c = sub.items.data[0]?.price?.currency;
      if (c) currency = c;
    });

  // --- Revenue from the balance-transaction ledger (canonical "money moved";
  // includes the one-time Einzelklausur, which has no local row). We filter to
  // {charge, payment} in JS rather than via the server `type` param so accounts
  // emitting the legacy `payment` type aren't silently dropped. ---
  const todayKey = now.toISOString().slice(0, 10);
  const monthKey = todayKey.slice(0, 7); // "YYYY-MM"
  const lastMonthKey = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  )
    .toISOString()
    .slice(0, 7);
  const windowStartUnix = Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      (REVENUE_WINDOW_DAYS - 1) * DAY_MS) /
      1000,
  );

  const increments: Array<{ day: string; value: number }> = [];
  let revenueTodayCents = 0;
  let revenueThisMonthCents = 0;
  let revenueLastMonthCents = 0;

  // Windowed pass (90d) → chart buckets + today/this-month/last-month totals.
  await stripe.balanceTransactions
    .list({ created: { gte: windowStartUnix }, limit: 100 })
    .autoPagingEach((tx) => {
      if (tx.type !== "charge" && tx.type !== "payment") return;
      const day = dayKeyFromUnix(tx.created);
      increments.push({ day, value: tx.amount });
      if (day === todayKey) revenueTodayCents += tx.amount;
      if (day.startsWith(monthKey)) revenueThisMonthCents += tx.amount;
      else if (day.startsWith(lastMonthKey)) revenueLastMonthCents += tx.amount;
    });

  // All-time gross (separate pass; a tiny account → full pagination is fine).
  // TODO: cap to a rolling window / launch-anchored cumulative if tx > ~10k.
  let revenueTotalCents = 0;
  await stripe.balanceTransactions.list({ limit: 100 }).autoPagingEach((tx) => {
    if (tx.type === "charge" || tx.type === "payment") {
      revenueTotalCents += tx.amount;
    }
  });

  const revenueByDay = fillDayBuckets(
    dayBucketsISO(now, REVENUE_WINDOW_DAYS),
    increments,
  );

  return {
    available: true,
    currency,
    mrrCents,
    arrCents: mrrCents * 12,
    revenueTodayCents,
    revenueThisMonthCents,
    revenueLastMonthCents,
    revenueTotalCents,
    netNewMrrThisMonthCents,
    revenueByDay,
  };
}

// 60s data-cache so the page's 60s auto-refresh never hammers Stripe. Keyed by
// UTC day so the chart axis rolls at midnight rather than serving a stale axis.
// Independent of the route's force-dynamic (route stays fresh; this memoizes
// only the expensive Stripe reads). The cached fn reads no cookies()/headers().
export function getStripeMoney(now: Date): Promise<StripeMoney> {
  return unstable_cache(
    () => fetchStripeMoney(now),
    ["admin-stripe-money", now.toISOString().slice(0, 10)],
    { revalidate: 60 },
  )();
}
