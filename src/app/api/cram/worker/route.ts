import { NextResponse } from "next/server";
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

  return NextResponse.json({ claimed: rows.length, done, failed });
}
