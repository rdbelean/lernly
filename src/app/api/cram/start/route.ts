import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { getStripe, getCramPriceId } from "@/lib/stripe";
import {
  createClient as createSupabaseServer,
  createServiceClient,
} from "@/lib/supabase/server";
import { STUDY_UPLOADS_BUCKET } from "@/lib/uploads";
import {
  planChunks,
  CramTooLargeError,
  CRAM_CHUNK_PAGES,
  CRAM_MAX_CHUNKS,
  type CramFileMeta,
} from "@/lib/cramPlan";
import type { ExamType } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60; // counting pages only — no LLM work here

type StartBody = {
  examType?: ExamType;
  extraInfo?: string;
  files?: { path: string; name?: string }[];
};

export async function POST(request: Request) {
  const stripe = getStripe();
  const priceId = getCramPriceId();
  if (!stripe || !priceId) {
    return NextResponse.json({ error: "Cram-Mode ist noch nicht konfiguriert." }, { status: 503 });
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

  let plan;
  try {
    plan = planChunks(metas, { chunkPages: CRAM_CHUNK_PAGES, maxChunks: CRAM_MAX_CHUNKS });
  } catch (e) {
    if (e instanceof CramTooLargeError) {
      return NextResponse.json(
        {
          error: `Das ist sehr viel Material (${e.chunkCount} Pakete). Bitte teile es auf mehrere Cram-Sessions auf (max. ${e.maxChunks} Pakete pro Session).`,
          reason: "cram_too_large",
        },
        { status: 413 },
      );
    }
    throw e;
  }

  // Create the job (awaiting_payment) with the plan persisted.
  const { data: job, error: jobErr } = await service
    .from("cram_jobs")
    .insert({
      user_id: user.id,
      status: "awaiting_payment",
      exam_type: examType,
      extra_info: body.extraInfo ?? null,
      total_chunks: plan.length,
      chunk_plan: plan,
    })
    .select("id")
    .single();
  if (jobErr || !job) {
    console.error("[cram/start] job insert failed", jobErr);
    return NextResponse.json({ error: "Konnte Job nicht anlegen." }, { status: 500 });
  }

  // Ensure a Stripe customer (same pattern as /api/stripe/checkout).
  const { data: profile } = await service.from("users").select("stripe_customer_id").eq("id", user.id).single();
  let customerId = profile?.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
    customerId = customer.id;
    await service.from("users").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?cram=${job.id}`,
    cancel_url: `${origin}/dashboard/new?cram_cancelled=1`,
    client_reference_id: user.id,
    metadata: { user_id: user.id, cram_job_id: job.id as string },
  });

  // Record the session id so the webhook can be idempotent.
  await service.from("cram_jobs").update({ stripe_session_id: session.id }).eq("id", job.id);

  if (!session.url) return NextResponse.json({ error: "Keine Checkout-URL." }, { status: 500 });
  return NextResponse.json({ url: session.url, jobId: job.id });
}
