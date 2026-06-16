// Monthly pack-generation cap per plan. The DB-side function
// `check_pack_quota` in supabase/migrations/20260602120000_pricing_v3_plans.sql
// holds the SOURCE of truth (it gates writes); these JS constants exist
// only for UI readouts and must be kept in sync with that function.
//
// If you change a number here, also change the `case v_plan` branches
// in the migration. Otherwise the UI will lie about the cap.
//
// Einzelklausur's "5" is the cap across its 14-day access window (approximated
// by the monthly counter, which is reset to 0 when the purchase is granted).
export const PLAN_LIMITS: Record<string, number> = {
  free: 2,
  einzelklausur: 5,
  monthly: 50,
  semester: 60,
};

export const PLAN_LABEL: Record<string, string> = {
  free: "Gratis",
  einzelklausur: "Einzelklausur",
  monthly: "Monatlich",
  semester: "Semester",
};

// A paid plan whose access window has lapsed behaves as free. The one-time
// Einzelklausur never emits a Stripe cancel event, so JS read-paths must apply
// the same lapse the DB quota function enforces. Pass users.plan_expires_at.
export function effectivePlan(
  plan: string | null | undefined,
  planExpiresAt: string | null | undefined,
): string {
  if (!plan || plan === "free") return "free";
  if (planExpiresAt && new Date(planExpiresAt).getTime() < Date.now()) {
    return "free";
  }
  return plan;
}

// =========================================================================
// Flashcard generation — count + "Mehr Karten" quota
// =========================================================================
// The card-count chooser at pack creation and the "Mehr Karten generieren"
// batch size are both capped per plan. The DB enforces the monthly regen
// quota (check_card_gen_quota, migration 20260616120000); these constants are
// for the UI + server-side count clamping and MUST match that function.

// Offered chooser steps (UI). The plan cap (below) hides/locks the steps a
// plan can't use.
export const CARD_COUNT_OPTIONS = [10, 20, 30, 50] as const;
export const DEFAULT_CARD_COUNT = 20;

// Max cards a single generation may request, by plan. Free is capped to keep
// the heavy steps as an upgrade lever; paid plans get the full Deep Dive.
export const CARD_COUNT_MAX: Record<string, number> = {
  free: 20,
  einzelklausur: 50,
  monthly: 50,
  semester: 50,
};

// Monthly "Mehr Karten" generations per plan — mirrors check_card_gen_quota.
export const CARD_GEN_LIMITS: Record<string, number> = {
  free: 2,
  einzelklausur: 20,
  monthly: 100,
  semester: 150,
};

/** Clamp a requested card count to the plan cap + the offered range. */
export function clampCardCount(
  requested: number | undefined | null,
  plan: string,
): number {
  const max = CARD_COUNT_MAX[plan] ?? CARD_COUNT_MAX.free;
  const n = Math.round(requested ?? DEFAULT_CARD_COUNT);
  if (!Number.isFinite(n)) return DEFAULT_CARD_COUNT;
  return Math.min(max, Math.max(10, n));
}
