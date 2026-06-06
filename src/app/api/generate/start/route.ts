import { NextResponse } from "next/server";
import {
  createClient as createSupabaseServer,
  createServiceClient,
} from "@/lib/supabase/server";
import { decryptApiKey } from "@/lib/byok";
import { STUDY_UPLOADS_BUCKET } from "@/lib/uploads";
import { MAX_FILE_BYTES } from "@/lib/uploadConfig";
import { EXAM_LABEL } from "@/lib/generatePack";
import type { ExamType } from "@/lib/schema";

export const runtime = "nodejs";
// Lightweight: validate + reserve quota + enqueue, then return immediately. The
// heavy generation runs in /api/generate/worker. No LLM work here.
export const maxDuration = 30;

const MAX_FILES = 8;
const MAX_TOTAL_BYTES = MAX_FILE_BYTES * MAX_FILES;
const ALLOWED_FILE = /\.(pdf|txt|md|markdown)$/i;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ref = { path: string; name: string; size?: number; type?: string };
type Body = {
  examType?: ExamType;
  extraInfo?: string;
  files?: Ref[];
  examId?: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Bitte einloggen, um ein Lernpaket zu erstellen.", reason: "auth_required" },
      { status: 401 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const examType = body.examType ?? null;
  const extraInfo = (body.extraInfo ?? "").trim();
  const refs = Array.isArray(body.files) ? body.files : [];

  if (!examType || !EXAM_LABEL[examType]) {
    return NextResponse.json({ error: "Ungültiger Prüfungstyp" }, { status: 400 });
  }
  if (refs.length === 0) {
    return NextResponse.json({ error: "Mindestens eine Datei erforderlich" }, { status: 400 });
  }
  if (refs.length > MAX_FILES) {
    return NextResponse.json({ error: `Maximal ${MAX_FILES} Dateien pro Generierung.` }, { status: 400 });
  }

  let totalBytes = 0;
  for (const ref of refs) {
    // Ownership guard: the worker downloads with the service role (bypasses
    // RLS), so enforce here that every path lives in the requester's folder.
    if (typeof ref?.path !== "string" || !ref.path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Ungültiger Datei-Verweis." }, { status: 400 });
    }
    if (!ALLOWED_FILE.test(ref.name ?? ref.path)) {
      return NextResponse.json(
        { error: `Dateityp nicht unterstützt: ${ref.name ?? ref.path}. Nur PDF, TXT, MD.` },
        { status: 400 },
      );
    }
    if (typeof ref.size === "number") {
      if (ref.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `${ref.name} ist zu groß (max. ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB pro Datei).` },
          { status: 413 },
        );
      }
      totalBytes += ref.size;
    }
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "Gesamtgröße zu groß." }, { status: 413 });
  }

  // Idempotency / no-spam: one in-flight generation job per user. If they
  // already have a queued/processing one, return it so the client polls that.
  const { data: inflight } = await supabase
    .from("study_packs")
    .select("id")
    .is("cram_job_id", null)
    .not("source_refs", "is", null)
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (inflight?.id) {
    return NextResponse.json({ packId: inflight.id, reused: true });
  }

  // BYOK lookup (own Anthropic key → no quota charge).
  let usesByok = false;
  try {
    const service = createServiceClient();
    const { data: secret } = await service
      .from("user_secrets")
      .select("anthropic_key_ciphertext")
      .eq("user_id", user.id)
      .maybeSingle();
    if (secret?.anthropic_key_ciphertext) {
      usesByok = Boolean(decryptApiKey(secret.anthropic_key_ciphertext));
    }
  } catch (e) {
    console.error("[/api/generate/start] BYOK lookup failed", e);
  }

  // Quota / credit decision — charged HERE (authed context), because the worker
  // runs as the service role and the quota RPCs key off auth.uid(). NOTE: this
  // reserves the charge up-front; a failed background generation currently still
  // consumes the slot (refund-on-failure is a follow-up).
  let willUseCredit = false;
  if (!usesByok) {
    const { data: quota, error: qErr } = await supabase.rpc("check_pack_quota");
    if (qErr) {
      console.error("[/api/generate/start] quota check failed", qErr);
    } else if (quota && quota.ok === false) {
      if (quota.reason === "rate_limit") {
        return NextResponse.json(
          {
            error: `Bitte warte noch ${quota.retry_after_seconds}s vor der nächsten Generierung.`,
            reason: "rate_limit",
            retryAfterSeconds: quota.retry_after_seconds,
          },
          { status: 429, headers: { "Retry-After": String(quota.retry_after_seconds) } },
        );
      }
      if (quota.reason === "quota_exceeded") {
        const { data: avail } = await supabase.rpc("available_pack_credits");
        if (typeof avail === "number" && avail > 0) {
          willUseCredit = true;
        } else {
          return NextResponse.json(
            {
              error: `Monatslimit erreicht: ${quota.used}/${quota.limit} Pakete im ${quota.plan}-Plan.`,
              reason: "quota_exceeded",
              used: quota.used,
              limit: quota.limit,
              plan: quota.plan,
            },
            { status: 402 },
          );
        }
      } else {
        return NextResponse.json(
          { error: "Generierung nicht erlaubt.", reason: quota.reason },
          { status: 400 },
        );
      }
    }
  }

  // Resolve + validate exam ownership for the linkage (lens is re-fetched in the
  // worker). Silently drops an unowned/unknown exam id.
  let resolvedExamId: string | null = null;
  if (body.examId && UUID_RE.test(body.examId)) {
    const { data: ownedExam } = await supabase
      .from("exams")
      .select("id")
      .eq("id", body.examId)
      .maybeSingle();
    if (ownedExam?.id) resolvedExamId = ownedExam.id as string;
  }

  // Apply the charge now (after all validation passed).
  if (willUseCredit) {
    const { error } = await supabase.rpc("consume_pack_credit");
    if (error) console.error("[/api/generate/start] consume_pack_credit failed", error);
  } else if (!usesByok) {
    const { error } = await supabase.rpc("bump_pack_usage");
    if (error) console.error("[/api/generate/start] bump_pack_usage failed", error);
  }

  // Enqueue: a 'queued' study_pack the cron worker will fill in.
  const service = createServiceClient();
  const { data: row, error: insErr } = await service
    .from("study_packs")
    .insert({
      user_id: user.id,
      status: "queued",
      exam_type: examType,
      title: "Wird erstellt…",
      // pack_data is NOT NULL — insert an empty placeholder the worker overwrites.
      pack_data: {},
      source_refs: refs.map((r) => ({ path: r.path, name: r.name })),
      gen_extra_info: extraInfo || null,
      exam_id: resolvedExamId,
      attempts: 0,
    })
    .select("id")
    .single();
  if (insErr || !row) {
    console.error("[/api/generate/start] enqueue failed", insErr);
    return NextResponse.json({ error: "Konnte den Job nicht starten." }, { status: 500 });
  }

  // Fire-and-forget kick so generation tends to start within seconds rather than
  // waiting for the next cron tick. NOT awaited and NO abort signal — we must
  // never signal the worker to stop (Vercel may cancel a function whose inbound
  // request is aborted). If the kick doesn't land, the production cron (every
  // minute) is the reliable backstop. (On preview, where crons don't run, the
  // worker can also be triggered manually with the CRON_SECRET.)
  try {
    const host = request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    const origin = request.headers.get("origin") ?? (host ? `${proto}://${host}` : null);
    if (origin && process.env.CRON_SECRET) {
      void fetch(`${origin}/api/generate/worker`, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }).catch(() => {});
    }
  } catch {
    /* cron backstop will pick it up */
  }

  return NextResponse.json({ packId: row.id });
}
