import { test } from "node:test";
import assert from "node:assert/strict";
import {
  priceToMonthlyCents,
  subscriptionMrrCents,
  momTrend,
  type SubLike,
} from "./stripeMetricsShared";
import { dayBucketsISO, fillDayBuckets, dayKeyFromUnix } from "./metricsShared";
import { isEmptySeries } from "../../components/admin/charts/ChartTypes";

test("priceToMonthlyCents normalizes each interval to a month", () => {
  // semester: 29,99 € every 6 months → ~5,00 €/mo
  assert.equal(
    priceToMonthlyCents({
      unit_amount: 2999,
      currency: "eur",
      recurring: { interval: "month", interval_count: 6 },
    }),
    500,
  );
  // monthly: 8,99 €/mo
  assert.equal(
    priceToMonthlyCents({
      unit_amount: 899,
      currency: "eur",
      recurring: { interval: "month", interval_count: 1 },
    }),
    899,
  );
  // yearly: 120 €/yr → 10 €/mo
  assert.equal(
    priceToMonthlyCents({
      unit_amount: 12000,
      currency: "eur",
      recurring: { interval: "year", interval_count: 1 },
    }),
    1000,
  );
});

test("priceToMonthlyCents treats one-time / null prices as 0 MRR", () => {
  assert.equal(
    priceToMonthlyCents({ unit_amount: 499, currency: "eur", recurring: null }),
    0,
  );
  assert.equal(
    priceToMonthlyCents({
      unit_amount: null,
      currency: "eur",
      recurring: { interval: "month", interval_count: 1 },
    }),
    0,
  );
  assert.equal(priceToMonthlyCents(null), 0);
});

test("subscriptionMrrCents sums across items and handles empties", () => {
  const sub: SubLike = {
    status: "active",
    created: 0,
    items: {
      data: [
        {
          price: {
            unit_amount: 899,
            currency: "eur",
            recurring: { interval: "month", interval_count: 1 },
          },
        },
        {
          price: {
            unit_amount: 2999,
            currency: "eur",
            recurring: { interval: "month", interval_count: 6 },
          },
        },
      ],
    },
  };
  assert.equal(subscriptionMrrCents(sub), 899 + 500);
  assert.equal(
    subscriptionMrrCents({ status: "active", created: 0, items: { data: [] } }),
    0,
  );
});

test("momTrend reports direction + null pct when no baseline", () => {
  assert.deepEqual(momTrend(1000, 0), {
    deltaCents: 1000,
    direction: "up",
    pct: null,
  });
  assert.deepEqual(momTrend(800, 1000), {
    deltaCents: -200,
    direction: "down",
    pct: -20,
  });
  assert.deepEqual(momTrend(500, 500), {
    deltaCents: 0,
    direction: "flat",
    pct: 0,
  });
});

test("dayKeyFromUnix returns the UTC day", () => {
  assert.equal(
    dayKeyFromUnix(Date.UTC(2026, 5, 8, 13, 45) / 1000),
    "2026-06-08",
  );
});

test("dayBucketsISO builds a zero-filled ascending UTC axis ending today", () => {
  const now = new Date("2026-06-08T13:45:00.000Z");
  const axis = dayBucketsISO(now, 30);
  assert.equal(axis.length, 30);
  assert.equal(axis[29].day, "2026-06-08");
  assert.equal(axis[0].day, "2026-05-10");
  assert.ok(axis.every((p) => p.value === 0));
});

test("fillDayBuckets accumulates in-range days and ignores out-of-range", () => {
  const now = new Date("2026-06-08T00:00:00.000Z");
  const axis = dayBucketsISO(now, 3); // 06-06, 06-07, 06-08
  const filled = fillDayBuckets(axis, [
    { day: "2026-06-07", value: 2 },
    { day: "2026-06-07", value: 3 },
    { day: "2026-06-08", value: 1 },
    { day: "2026-01-01", value: 99 }, // out of range → ignored
  ]);
  assert.deepEqual(
    filled.map((p) => p.value),
    [0, 5, 1],
  );
});

test("isEmptySeries detects no-data and all-zero", () => {
  assert.equal(isEmptySeries([]), true);
  assert.equal(isEmptySeries([{ y: 0 }, { y: 0 }]), true);
  assert.equal(isEmptySeries([{ value: 0 }]), true);
  assert.equal(isEmptySeries([{ y: 0 }, { y: 3 }]), false);
});
