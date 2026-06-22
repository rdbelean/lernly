import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/server";
import { STUDY_UPLOADS_BUCKET } from "@/lib/uploads";
import { slicePdfPages } from "@/lib/pdfSlice";
import {
  buildMaterialBlocks,
  generatePack,
  type SourceFile,
} from "@/lib/generatePack";
import type { ExamType } from "@/lib/schema";
import { renderEmail } from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/send";
import { APP_URL } from "@/lib/email/brand";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 800;

const CLAIM_PER_RUN = 2;
const MAX_ATTEMPTS = 3;
const GEN_BUDGET_MS = 700_000;

type QueuedPack = {
  id: string;
  cram_job_id: string;
  source_path: string;
  page_start: number | null;
  page_end: number | null;
  chunk_label: string | null;
  attempts: number;
};

// Send the "packs ready" email exactly once, the moment a job reaches 'done'.
// The conditional UPDATE atomically claims the notification (only one invocation
// wins), so concurrent workers can't double-send.
async function notifyJobDoneOnce(service: SupabaseClient, jobId: string): Promise<void> {
  const { data: claimed } = await service
    .from("cram_jobs")
    .update({ done_notified_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "done")
    .is("done_notified_at", null)
    .select("id, user_id");
  if (!claimed || claimed.length === 0) return; // not done yet, or already notified

  const userId = claimed[0].user_id as string;
  const { data: udata } = await service.auth.admin.getUserById(userId);
  const email = udata?.user?.email;
  if (!email) return;

  const { data: chunks } = await service
    .from("study_packs")
    .select("status")
    .eq("cram_job_id", jobId);
  const ready = (chunks ?? []).filter((c) => c.status === "ready").length;
  const failed = (chunks ?? []).filter((c) => c.status === "failed").length;

  const failedLine =
    failed > 0
      ? `<p style="margin:14px 0 0;">${failed} ${failed === 1 ? "Paket konnte" : "Pakete konnten"} nicht erstellt werden — im Dashboard kannst du sie erneut versuchen.</p>`
      : "";
  const html = renderEmail({
    preheader: `${ready} Lernpakete sind fertig`,
    heading: "Deine Lernpakete sind fertig 🎉",
    bodyHtml: `<p style="margin:0;">Wir haben <strong>${ready} Lernpaket${ready === 1 ? "" : "e"}</strong> aus deinem Material erstellt. Viel Erfolg beim Lernen!</p>${failedLine}`,
    ctaText: "Zu deinen Paketen →",
    ctaUrl: `${APP_URL}/dashboard`,
  });
  await sendEmail({ to: email, subject: "Deine Lernpakete sind fertig 🎉", html });
}

export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const service = createServiceClient();
  const client = new Anthropic();

  const { data: claimed, error: claimErr } = await service.rpc("claim_cram_chunks", {
    p_limit: CLAIM_PER_RUN,
  });
  if (claimErr) {
    console.error("[cram/worker] claim failed", claimErr);
    Sentry.captureException(claimErr, { tags: { route: "cram/worker", phase: "claim" } });
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }
  const rows = (claimed ?? []) as QueuedPack[];

  let done = 0;
  let failed = 0;
  for (const row of rows) {
    // Fetch what we need to know about the parent job (exam type / extra info).
    const { data: job } = await service
      .from("cram_jobs")
      .select("exam_type, extra_info")
      .eq("id", row.cram_job_id)
      .single();
    const examType = (job?.exam_type ?? "essay") as ExamType;
    const extraInfo = job?.extra_info ?? "";

    // Crash-loop guard: a chunk reclaimed beyond MAX_ATTEMPTS (e.g. the worker
    // kept dying mid-generation, so the stale-recovery kept re-claiming it) is
    // given up on rather than reprocessed forever.
    if (row.attempts > MAX_ATTEMPTS) {
      console.error(`[cram/worker] chunk ${row.id} exceeded ${MAX_ATTEMPTS} attempts — marking failed`);
      await service.from("study_packs").update({ status: "failed" }).eq("id", row.id);
      await service.rpc("complete_cram_chunk", { p_pack_id: row.id, p_ok: false });
      failed++;
      continue;
    }

    try {
      const dl = await service.storage.from(STUDY_UPLOADS_BUCKET).download(row.source_path);
      if (dl.error || !dl.data) throw new Error(`download_failed: ${row.source_path}`);
      let buffer: Buffer = Buffer.from(await dl.data.arrayBuffer());
      if (row.source_path.toLowerCase().endsWith(".pdf") && row.page_start && row.page_end) {
        buffer = await slicePdfPages(buffer, row.page_start, row.page_end);
      }
      const name = row.chunk_label ?? row.source_path.split("/").pop() ?? "material.pdf";
      const file: SourceFile = {
        name: name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`,
        size: buffer.byteLength,
        arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
      };
      const material = await buildMaterialBlocks([file], examType, extraInfo);
      const pack = await generatePack({
        client,
        blocks: material.blocks,
        examType,
        deadline: Date.now() + GEN_BUDGET_MS,
        twoPass: true,
      });

      const { error: upErr } = await service
        .from("study_packs")
        .update({ status: "ready", title: pack.courseTitle, exam_type: pack.examType, pack_data: pack })
        .eq("id", row.id);
      if (upErr) throw new Error(`save_failed: ${upErr.message}`);

      await service.rpc("complete_cram_chunk", { p_pack_id: row.id, p_ok: true });
      done++;
    } catch (e) {
      console.error(`[cram/worker] chunk ${row.id} failed (attempt ${row.attempts})`, e);
      Sentry.captureException(e, { tags: { route: "cram/worker", chunk: row.id } });
      if (row.attempts >= MAX_ATTEMPTS) {
        await service.from("study_packs").update({ status: "failed" }).eq("id", row.id);
        await service.rpc("complete_cram_chunk", { p_pack_id: row.id, p_ok: false });
        failed++;
      } else {
        // Re-queue for the next cron tick.
        await service.from("study_packs").update({ status: "queued" }).eq("id", row.id);
      }
    }
  }

  // Notify once for any job that just reached 'done' during this run.
  const touchedJobIds = [...new Set(rows.map((r) => r.cram_job_id))];
  for (const jobId of touchedJobIds) {
    try {
      await notifyJobDoneOnce(service, jobId);
    } catch (e) {
      console.error("[cram/worker] done-notification failed", e);
    }
  }

  return NextResponse.json({ claimed: rows.length, done, failed });
}

// Vercel Cron triggers the scheduled path with a GET request (and injects the
// `Authorization: Bearer <CRON_SECRET>` header). Without a GET handler the cron
// hit would 405 and the worker would never run — silently stalling every Cram
// job. Alias GET to the same authenticated handler. (exam-reminders already
// uses GET for the same reason.)
export const GET = POST;
