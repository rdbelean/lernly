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
