import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { effectivePlan } from "@/lib/quota";
import {
  dayBucketsISO,
  fillDayBuckets,
  monthStartISO,
  SIGNUP_WINDOW_DAYS,
  type AdminMetrics,
} from "./metricsShared";

export { monthStartISO };
export type { AdminMetrics };

// All metrics for /admin, read in parallel via the service-role client.
// Counts use head+exact (no rows returned). Group-bys + day-buckets fetch one
// small column and tally in JS (matches the existing pattern; a date_trunc RPC
// would only pay off past ~10k rows). Active-user buckets read
// auth.users.last_sign_in_at via auth.admin.listUsers (migration-free).
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

  // Lower bound for the signups/packs day-charts: the first day of the axis.
  const chartFromISO = `${dayBucketsISO(now, SIGNUP_WINDOW_DAYS)[0].day}T00:00:00.000Z`;

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
    signupRows,
    packDayRows,
  ] = await Promise.all([
    countUsers(),
    countUsers(todayStart),
    countUsers(d7),
    countUsers(d30),
    countPacks(),
    countPacks(todayStart),
    service.from("study_packs").select("exam_type"),
    service.from("users").select("plan, plan_expires_at"),
    service.from("tutor_usage").select("messages_used").gte("period_start", monthStart),
    service.from("cram_jobs").select("status, failed_chunks, updated_at"),
    // TODO: paginate when total users > 1000 (active buckets only read page 1).
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    service.from("users").select("created_at").gte("created_at", chartFromISO),
    service.from("study_packs").select("created_at").gte("created_at", chartFromISO),
  ]);

  const byExamType: Record<string, number> = {};
  for (const r of (packRows.data ?? []) as { exam_type: string | null }[]) {
    const k = r.exam_type ?? "unknown";
    byExamType[k] = (byExamType[k] ?? 0) + 1;
  }

  // planSplit + paying from one fetch. paying = effectivePlan !== "free", which
  // applies the same lapse the DB quota enforces (and counts the no-cancel-event
  // Einzelklausur). planSplit is the *nominal* plan column (for the donut).
  const planSplit = { free: 0, einzelklausur: 0, semester: 0, monthly: 0 };
  let payingCount = 0;
  for (const r of (planRows.data ?? []) as {
    plan: string | null;
    plan_expires_at: string | null;
  }[]) {
    if (r.plan === "einzelklausur") planSplit.einzelklausur++;
    else if (r.plan === "semester") planSplit.semester++;
    else if (r.plan === "monthly") planSplit.monthly++;
    else planSplit.free++;
    if (effectivePlan(r.plan, r.plan_expires_at) !== "free") payingCount++;
  }
  const conversionRate = usersTotal > 0 ? payingCount / usersTotal : 0;

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
    last30d: authUsers.filter((u) => u.last_sign_in_at && u.last_sign_in_at >= d30).length,
  };

  const toDayInc = (rows: unknown) =>
    ((rows ?? []) as { created_at: string | null }[])
      .filter((r) => r.created_at)
      .map((r) => ({ day: r.created_at!.slice(0, 10), value: 1 }));
  const signupsByDay = fillDayBuckets(
    dayBucketsISO(now, SIGNUP_WINDOW_DAYS),
    toDayInc(signupRows.data),
  );
  const packsByDay = fillDayBuckets(
    dayBucketsISO(now, SIGNUP_WINDOW_DAYS),
    toDayInc(packDayRows.data),
  );

  return {
    users: { total: usersTotal, today: usersToday, last7d: users7, last30d: users30 },
    active,
    packs: { today: packsToday, total: packsTotal, byExamType },
    tutorMessagesThisMonth,
    planSplit,
    paying: { count: payingCount, conversionRate },
    signupsByDay,
    packsByDay,
    cram,
  };
}
