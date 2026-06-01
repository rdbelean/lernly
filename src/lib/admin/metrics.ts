import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { monthStartISO, type AdminMetrics } from "./metricsShared";

// Re-export so call sites can import everything from one place.
export { monthStartISO };
export type { AdminMetrics };

// getAdminMetrics is implemented in the next task.
export async function getAdminMetrics(
  service: SupabaseClient,
): Promise<AdminMetrics> {
  void service;
  void monthStartISO;
  throw new Error("not implemented");
}
