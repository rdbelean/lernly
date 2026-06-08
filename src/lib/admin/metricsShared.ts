import type { SupabaseClient } from "@supabase/supabase-js";

// First instant of `now`'s month, UTC, as an ISO string — the boundary for
// "tutor messages this month" (tutor_usage.period_start). Pure + testable.
export function monthStartISO(now: Date): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
}

// ---------------------------------------------------------------------------
// Day-bucketing — shared by the Supabase usage charts (signups/packs per day)
// and the Stripe revenue chart. Keys are "YYYY-MM-DD" in UTC. Pure + testable.
// The zero-filled axis guarantees a chart renders a full timeline even at ~0
// data (a flat baseline instead of an empty/broken chart).
// ---------------------------------------------------------------------------

export type DayPoint = { day: string; value: number };

// Default chart windows. Signups/packs read well at 30 days for low volume;
// revenue uses a wider 90-day lens.
export const SIGNUP_WINDOW_DAYS = 30;
export const REVENUE_WINDOW_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

// "YYYY-MM-DD" (UTC) from a unix-seconds timestamp (Stripe uses seconds).
export function dayKeyFromUnix(unixSec: number): string {
  return new Date(unixSec * 1000).toISOString().slice(0, 10);
}

// A zero-filled ascending day axis [today-(days-1) .. today], UTC.
export function dayBucketsISO(now: Date, days: number): DayPoint[] {
  const base = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push({
      day: new Date(base - i * DAY_MS).toISOString().slice(0, 10),
      value: 0,
    });
  }
  return out;
}

// Fold {day, value} increments into a pre-built zero-filled axis. Increments on
// days outside the axis are ignored; multiple increments on a day accumulate.
export function fillDayBuckets(
  axis: DayPoint[],
  increments: Array<{ day: string; value: number }>,
): DayPoint[] {
  const idx = new Map(axis.map((p, i) => [p.day, i]));
  const out = axis.map((p) => ({ ...p }));
  for (const inc of increments) {
    const i = idx.get(inc.day);
    if (i != null) out[i].value += inc.value;
  }
  return out;
}

export type AdminMetrics = {
  users: { total: number; today: number; last7d: number; last30d: number };
  active: { last24h: number; last7d: number; last30d: number };
  packs: { today: number; total: number; byExamType: Record<string, number> };
  tutorMessagesThisMonth: number;
  planSplit: {
    free: number;
    einzelklausur: number;
    semester: number;
    monthly: number;
  };
  // Paying = effectivePlan !== "free" (DB truth, matches check_pack_quota —
  // counts the no-cancel-event Einzelklausur too). conversionRate = paying/total.
  paying: { count: number; conversionRate: number };
  signupsByDay: DayPoint[];
  packsByDay: DayPoint[];
  cram: { total: number; failed: number; stuck: number };
};

// Implemented in metrics.ts (server-only). Declared here only as a type ref.
export type GetAdminMetrics = (service: SupabaseClient) => Promise<AdminMetrics>;
