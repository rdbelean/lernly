import type { SupabaseClient } from "@supabase/supabase-js";

// First instant of `now`'s month, UTC, as an ISO string — the boundary for
// "tutor messages this month" (tutor_usage.period_start). Pure + testable.
export function monthStartISO(now: Date): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
}

export type AdminMetrics = {
  users: { total: number; today: number; last7d: number; last30d: number };
  active: { last24h: number; last7d: number };
  packs: { today: number; total: number; byExamType: Record<string, number> };
  tutorMessagesThisMonth: number;
  planSplit: { free: number; pro: number; team: number };
  cram: { total: number; failed: number; stuck: number };
};

// Implemented in metrics.ts (server-only). Declared here only as a type ref.
export type GetAdminMetrics = (service: SupabaseClient) => Promise<AdminMetrics>;
