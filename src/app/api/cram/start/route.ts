import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import {
  createClient as createSupabaseServer,
  createServiceClient,
} from "@/lib/supabase/server";
import { STUDY_UPLOADS_BUCKET } from "@/lib/uploads";
import { effectivePlan } from "@/lib/quota";
import {
  planChunks,
  CramTooLargeError,
  CRAM_CHUNK_PAGES,
  CRAM_MAX_CHUNKS,
  type CramFileMeta,
} from "@/lib/cramPlan";
import type { ExamType } from "@/lib/schema";
import { CRAM_ENABLED } from "@/lib/features";

export const runtime = "nodejs";
export const maxDuration = 60; // counting pages only — no LLM work here

type StartBody = {
  examType?: ExamType;
  extraInfo?: string;
  files?: { path: string; name?: string }[];
};

export async function POST(request: Request) {
  // Cram is hidden for launch (see CRAM_ENABLED). Reject directly so a stale
  // client or a direct API call can't create jobs while the UI is gated.
  if (!CRAM_ENABLED) {
    return NextResponse.json({ error: "Cram ist aktuell nicht verfügbar." }, { status: 403 });
  }
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: StartBody;
  try {
    body = (await request.json()) as StartBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const examType = body.examType;
  const refs = Array.isArray(body.files) ? body.files : [];
  if (!examType) return NextResponse.json({ error: "Prüfungstyp fehlt." }, { status: 400 });
  if (refs.length === 0) return NextResponse.json({ error: "Keine Dateien." }, { status: 400 });

  const service = createServiceClient();

  // Cram is a paid-access feature in v3 (no separate charge). Gate on an
  // active, non-lapsed paid plan. Einzelklausur's 5-pack cap also caps how
  // many chunks one Cram session may produce.
  const { data: profile } = await service
    .from("users")
    .select("plan, plan_expires_at")
    .eq("id", user.id)
    .single();
  const plan = effectivePlan(profile?.plan, profile?.plan_expires_at);
  if (plan === "free") {
    return NextResponse.json(
      {
        error:
          "Cram (alles reinwerfen) ist Teil von Einzelklausur, Semester oder Monatlich. Hol dir Zugang, dann läuft's.",
        reason: "needs_paid_plan",
      },
      { status: 403 },
    );
  }
  const maxChunks = plan === "einzelklausur" ? 5 : CRAM_MAX_CHUNKS;

  // Read per-file page counts (PDFs) / sizes (text) to build the plan.
  const metas: CramFileMeta[] = [];
  for (const ref of refs) {
    if (typeof ref?.path !== "string" || !ref.path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Ungültiger Datei-Verweis." }, { status: 400 });
    }
    const name = ref.name ?? ref.path.split("/").pop() ?? "datei";
    const isPdf = name.toLowerCase().endsWith(".pdf");
    const dl = await service.storage.from(STUDY_UPLOADS_BUCKET).download(ref.path);
    if (dl.error || !dl.data) {
      return NextResponse.json({ error: `Datei nicht gefunden: ${name}` }, { status: 400 });
    }
    const buf = Buffer.from(await dl.data.arrayBuffer());
    let pages = 0;
    if (isPdf) {
      try {
        pages = (await PDFDocument.load(buf)).getPageCount();
      } catch {
        return NextResponse.json({ error: `PDF konnte nicht gelesen werden: ${name}` }, { status: 422 });
      }
    }
    metas.push({ path: ref.path, name, pages, chars: isPdf ? 0 : buf.byteLength, isPdf });
  }

  let plan_;
  try {
    plan_ = planChunks(metas, { chunkPages: CRAM_CHUNK_PAGES, maxChunks });
  } catch (e) {
    if (e instanceof CramTooLargeError) {
      return NextResponse.json(
        {
          error: `Das ist sehr viel Material (${e.chunkCount} Pakete). Bitte teile es auf (max. ${e.maxChunks} Pakete pro Session in deinem Plan).`,
          reason: "cram_too_large",
        },
        { status: 413 },
      );
    }
    throw e;
  }

  // Create the job already queued (no payment step in v3) + materialize one
  // study_pack placeholder per chunk so the worker can fill them in.
  const { data: job, error: jobErr } = await service
    .from("cram_jobs")
    .insert({
      user_id: user.id,
      status: "queued",
      exam_type: examType,
      extra_info: body.extraInfo ?? null,
      total_chunks: plan_.length,
      chunk_plan: plan_,
    })
    .select("id")
    .single();
  if (jobErr || !job) {
    console.error("[cram/start] job insert failed", jobErr);
    return NextResponse.json({ error: "Konnte Job nicht anlegen." }, { status: 500 });
  }

  const rows = plan_.map((c) => ({
    user_id: user.id,
    cram_job_id: job.id,
    status: "queued",
    source_path: c.source_path,
    page_start: c.page_start,
    page_end: c.page_end,
    chunk_label: c.label,
    title: "wird erstellt …",
    exam_type: examType,
    pack_data: {},
  }));
  const { error: insErr } = await service.from("study_packs").insert(rows);
  if (insErr) {
    console.error("[cram/start] chunk insert failed", insErr);
    return NextResponse.json({ error: "Konnte Pakete nicht anlegen." }, { status: 500 });
  }

  return NextResponse.json({ jobId: job.id });
}
