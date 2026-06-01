import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { monthStartISO, type AdminMetrics } from "./metricsShared";

export { monthStartISO };
export type { AdminMetrics };

// All metrics for /admin, read in parallel via the service-role client.
// Counts use head+exact (no rows returned). Group-bys fetch one small column and
// tally in JS. Active-user buckets read auth.users.last_sign_in_at via
// auth.admin.listUsers (migration-free).
export async function getAdminMetrics(
  service: SupabaseClient,
): Promise<AdminMetrics> {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const dayMs = 24 * 60 * 60 * 1000;
  const todayStart = iso(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
  );
  const d7 = iso(new Date(now.getTime() - 7 * dayMs));
  const d30 = iso(new Date(now.getTime() - 30 * dayMs));
  const d1 = iso(new Date(now.getTime() - dayMs));
  const monthStart = monthStartISO(now);

  const countUsers = async (gte?: string) => {
    let q = service.from("users").select("*", { count: "exact", head: true });
    if (gte) q = q.gte("created_at", gte);
    const { count } = await q;
    return count ?? 0;
  };
  const countPacks = async (gte?: string) => {
    let q = service.from("study_packs").select("*", { count: "exact", head: true });
    if (gte) q = q.gte("created_at", gte);
    const { count } = await q;
    return count ?? 0;
  };

  const [
    usersTotal,
    usersToday,
    users7,
    users30,
    packsTotal,
    packsToday,
    packRows,
    planRows,
    tutorRows,
    cramRows,
    authList,
  ] = await Promise.all([
    countUsers(),
    countUsers(todayStart),
    countUsers(d7),
    countUsers(d30),
    countPacks(),
    countPacks(todayStart),
    service.from("study_packs").select("exam_type"),
    service.from("users").select("plan"),
    service.from("tutor_usage").select("messages_used").gte("period_start", monthStart),
    service.from("cram_jobs").select("status, failed_chunks, updated_at"),
    // TODO: paginate when total users > 1000 (active buckets only read page 1).
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const byExamType: Record<string, number> = {};
  for (const r of (packRows.data ?? []) as { exam_type: string | null }[]) {
    const k = r.exam_type ?? "unknown";
    byExamType[k] = (byExamType[k] ?? 0) + 1;
  }

  const planSplit = { free: 0, pro: 0, team: 0 };
  for (const r of (planRows.data ?? []) as { plan: string | null }[]) {
    if (r.plan === "pro") planSplit.pro++;
    else if (r.plan === "team") planSplit.team++;
    else planSplit.free++;
  }

  const tutorMessagesThisMonth = (
    (tutorRows.data ?? []) as { messages_used: number | null }[]
  ).reduce((sum, r) => sum + (r.messages_used ?? 0), 0);

  const cramAll = (cramRows.data ?? []) as {
    status: string | null;
    failed_chunks: number | null;
    updated_at: string | null;
  }[];
  const cram = {
    total: cramAll.length,
    failed: cramAll.filter(
      (c) => c.status === "failed" || (c.failed_chunks ?? 0) > 0,
    ).length,
    stuck: cramAll.filter(
      (c) =>
        (c.status === "queued" || c.status === "processing") &&
        c.updated_at != null &&
        new Date(c.updated_at).getTime() < now.getTime() - 60 * 60 * 1000,
    ).length,
  };

  const authUsers = authList.data?.users ?? [];
  const active = {
    last24h: authUsers.filter((u) => u.last_sign_in_at && u.last_sign_in_at >= d1).length,
    last7d: authUsers.filter((u) => u.last_sign_in_at && u.last_sign_in_at >= d7).length,
  };

  return {
    users: { total: usersTotal, today: usersToday, last7d: users7, last30d: users30 },
    active,
    packs: { today: packsToday, total: packsTotal, byExamType },
    tutorMessagesThisMonth,
    planSplit,
    cram,
  };
}
