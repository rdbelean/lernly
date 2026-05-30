// Monthly pack-generation cap per plan. The DB-side function
// `can_generate_now` in supabase/migrations/20260521_new_plan_limits.sql
// holds the SOURCE of truth (it gates writes); these JS constants exist
// only for UI readouts and must be kept in sync with that function.
//
// If you change a number here, also change the `case v_user.plan` branches
// in the migration. Otherwise the UI will lie about the cap.
export const PLAN_LIMITS: Record<string, number> = {
  free: 2,
  pro: 25,
  team: 60,
};

export const PLAN_LABEL: Record<string, string> = {
  free: "Gratis",
  pro: "Pro",
  team: "Team",
  pro_byok: "Pro (BYOK)",
  team_byok: "Team (BYOK)",
};
