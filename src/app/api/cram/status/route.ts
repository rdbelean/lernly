import { NextResponse } from "next/server";
import { createClient as createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ChunkRow = {
  id: string;
  cram_job_id: string | null;
  chunk_label: string | null;
  status: string;
};

export async function GET() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // RLS (cram_jobs_select_own) scopes this to the caller. Show jobs from the
  // last 24h so a finished cram session stays visible briefly after completion.
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: jobs, error } = await supabase
    .from("cram_jobs")
    .select("id, status, total_chunks, done_chunks, failed_chunks, created_at")
    .neq("status", "awaiting_payment")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) {
    console.error("[cram/status] jobs query failed", error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  const jobIds = (jobs ?? []).map((j) => j.id);
  let chunks: ChunkRow[] = [];
  if (jobIds.length > 0) {
    const { data: chunkRows } = await supabase
      .from("study_packs")
      .select("id, cram_job_id, chunk_label, status")
      .in("cram_job_id", jobIds)
      .order("created_at", { ascending: true });
    chunks = (chunkRows ?? []) as ChunkRow[];
  }

  const shaped = (jobs ?? []).map((j) => ({
    id: j.id,
    status: j.status,
    total: j.total_chunks,
    done: j.done_chunks,
    failed: j.failed_chunks,
    createdAt: j.created_at,
    chunks: chunks
      .filter((c) => c.cram_job_id === j.id)
      .map((c) => ({ id: c.id, label: c.chunk_label, status: c.status })),
  }));

  return NextResponse.json({ jobs: shaped });
}
