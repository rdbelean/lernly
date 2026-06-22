import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { STUDY_UPLOADS_BUCKET } from "@/lib/uploads";

export const runtime = "nodejs";

const EXPIRE_HOURS = 24;

type PlanEntry = { source_path?: string };

function planPaths(plan: unknown): string[] {
  const entries = (Array.isArray(plan) ? plan : []) as PlanEntry[];
  return [...new Set(entries.map((p) => p.source_path).filter((p): p is string => !!p))];
}

// Frees the uploaded source PDFs of Cram jobs once they are no longer needed,
// so Supabase storage doesn't grow unbounded. Two cases:
//   1. Legacy `awaiting_payment` jobs (pre-Pricing-v3) that were abandoned —
//      purge the row AND its files.
//   2. Pricing-v3 `done` jobs whose every chunk succeeded (failed_chunks = 0):
//      the worker is finished with the sources and no retry can need them, so
//      the files can go. We keep the job row (history + the CramJobsPanel).
// Jobs with failed chunks are left intact — `/api/cram/retry` re-downloads the
// source, so deleting it would break retry. Storage.remove is idempotent, so a
// re-run over an already-cleaned job is a harmless no-op.
//
// Triggered by Vercel Cron (GET, with `Authorization: Bearer <CRON_SECRET>`).
async function handler(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const service = createServiceClient();
  const cutoff = new Date(Date.now() - EXPIRE_HOURS * 60 * 60 * 1000).toISOString();

  const { data: jobs, error } = await service
    .from("cram_jobs")
    .select("id, status, failed_chunks, chunk_plan")
    .in("status", ["awaiting_payment", "done"])
    .lt("updated_at", cutoff)
    .limit(500);
  if (error) {
    console.error("[cram/cleanup] query failed", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  let filesDeleted = 0;
  let rowsPurged = 0;
  for (const job of jobs ?? []) {
    const isLegacyAbandoned = job.status === "awaiting_payment";
    // For 'done' jobs, only free the files if nothing can still need them.
    if (!isLegacyAbandoned && (job.failed_chunks ?? 0) > 0) continue;

    const paths = planPaths(job.chunk_plan);
    if (paths.length > 0) {
      const { error: rmErr } = await service.storage.from(STUDY_UPLOADS_BUCKET).remove(paths);
      if (rmErr) console.error("[cram/cleanup] storage remove failed", rmErr);
      else filesDeleted += paths.length;
    }
    if (isLegacyAbandoned) {
      await service.from("cram_jobs").delete().eq("id", job.id);
      rowsPurged++;
    }
  }

  return NextResponse.json({ scanned: jobs?.length ?? 0, filesDeleted, rowsPurged });
}

export const POST = handler;
export const GET = handler;
