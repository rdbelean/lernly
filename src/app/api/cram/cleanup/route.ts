import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { STUDY_UPLOADS_BUCKET } from "@/lib/uploads";

export const runtime = "nodejs";

const EXPIRE_HOURS = 24;

type PlanEntry = { source_path?: string };

export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const service = createServiceClient();
  const cutoff = new Date(Date.now() - EXPIRE_HOURS * 60 * 60 * 1000).toISOString();

  const { data: jobs, error } = await service
    .from("cram_jobs")
    .select("id, chunk_plan")
    .eq("status", "awaiting_payment")
    .lt("created_at", cutoff)
    .limit(100);
  if (error) {
    console.error("[cram/cleanup] query failed", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  let filesDeleted = 0;
  for (const job of jobs ?? []) {
    const plan = (job.chunk_plan ?? []) as PlanEntry[];
    const paths = [...new Set(plan.map((p) => p.source_path).filter((p): p is string => !!p))];
    if (paths.length > 0) {
      const { error: rmErr } = await service.storage.from(STUDY_UPLOADS_BUCKET).remove(paths);
      if (rmErr) console.error("[cram/cleanup] storage remove failed", rmErr);
      else filesDeleted += paths.length;
    }
    await service.from("cram_jobs").delete().eq("id", job.id);
  }

  return NextResponse.json({ expired: jobs?.length ?? 0, filesDeleted });
}
