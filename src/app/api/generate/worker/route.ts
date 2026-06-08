import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptApiKey } from "@/lib/byok";
import { STUDY_UPLOADS_BUCKET } from "@/lib/uploads";
import {
  buildMaterialBlocks,
  generatePack,
  type SourceFile,
} from "@/lib/generatePack";
import { buildRelevanceBrief, type FidelityLevel, type LensContext } from "@/lib/prompts";
import { ExamProfileSchema, type ExamType } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 800;

const CLAIM_PER_RUN = 1; // one heavy generation per invocation
const MAX_ATTEMPTS = 3;
const GEN_BUDGET_MS = 760_000; // headroom under maxDuration (800)
const MAX_PAGES_PER_PACK = 500;
const MAX_CHARS_PER_PACK = 1_000_000;

const MATERIAL_TOO_LARGE_MSG =
  `Dein Material überschreitet die Obergrenze (${MAX_PAGES_PER_PACK} Seiten / ` +
  `${MAX_CHARS_PER_PACK.toLocaleString("de-DE")} Zeichen). Teile es pro Kapitel/Vorlesung ` +
  `auf und erstelle mehrere Pakete — die sind fokussierter und schneller fertig.`;

type Ref = { path: string; name: string };
type GenJob = {
  id: string;
  user_id: string;
  exam_type: string;
  source_refs: Ref[] | null;
  gen_extra_info: string | null;
  exam_id: string | null;
  attempts: number;
};

// Vercel cron fires a GET (with the Authorization: Bearer <CRON_SECRET> header
// Vercel injects when CRON_SECRET is set); /api/generate/start kicks it via POST
// for low-latency start. Both run the same handler.
async function handle(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const service = createServiceClient();

  const { data: claimed, error: claimErr } = await service.rpc(
    "claim_generation_packs",
    { p_limit: CLAIM_PER_RUN },
  );
  if (claimErr) {
    console.error("[generate/worker] claim failed", claimErr);
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }
  const rows = (claimed ?? []) as GenJob[];
  let done = 0;
  let failed = 0;

  for (const row of rows) {
    const fail = async (msg: string, soft = false) => {
      if (soft && row.attempts < MAX_ATTEMPTS) {
        await service.from("study_packs").update({ status: "queued" }).eq("id", row.id);
      } else {
        await service
          .from("study_packs")
          .update({ status: "failed", gen_error: msg })
          .eq("id", row.id);
        failed++;
      }
    };

    if (row.attempts > MAX_ATTEMPTS) {
      console.error(`[generate/worker] pack ${row.id} exceeded ${MAX_ATTEMPTS} attempts`);
      await fail("Generierung mehrfach fehlgeschlagen — bitte erneut versuchen.");
      continue;
    }

    try {
      const refs = Array.isArray(row.source_refs) ? row.source_refs : [];
      if (refs.length === 0) throw new Error("no_source_refs");
      const examType = (row.exam_type ?? "multiple_choice") as ExamType;
      const extraInfo = row.gen_extra_info ?? "";

      // 1) Download every source file from storage → SourceFile[].
      const files: SourceFile[] = [];
      for (const ref of refs) {
        const dl = await service.storage.from(STUDY_UPLOADS_BUCKET).download(ref.path);
        if (dl.error || !dl.data) throw new Error(`download_failed: ${ref.name ?? ref.path}`);
        const buffer = Buffer.from(await dl.data.arrayBuffer());
        files.push({
          name: ref.name ?? ref.path.split("/").pop() ?? "datei",
          size: buffer.byteLength,
          arrayBuffer: async () =>
            buffer.buffer.slice(
              buffer.byteOffset,
              buffer.byteOffset + buffer.byteLength,
            ) as ArrayBuffer,
        });
      }

      // 2) BYOK — use the user's own Anthropic key if they have one stored.
      let client = new Anthropic();
      try {
        const { data: secret } = await service
          .from("user_secrets")
          .select("anthropic_key_ciphertext")
          .eq("user_id", row.user_id)
          .maybeSingle();
        const key = secret?.anthropic_key_ciphertext
          ? decryptApiKey(secret.anthropic_key_ciphertext)
          : null;
        if (key) client = new Anthropic({ apiKey: key });
      } catch (e) {
        console.error("[generate/worker] BYOK lookup failed", e);
      }

      // 3) Exam-relevance lens (Altklausur) — re-fetch the assigned exam's
      //    profile/hints/fidelity to build the relevance brief, exactly like the
      //    sync route did before generation.
      let relevanceBrief: string | null = null;
      let lensContext: LensContext | null = null;
      if (row.exam_id) {
        const { data: exam } = await service
          .from("exams")
          .select("exam_profile, instructor_hints, fidelity")
          .eq("id", row.exam_id)
          .maybeSingle();
        if (exam) {
          const fidelity = ((exam.fidelity as string | null) ?? "likely") as FidelityLevel;
          relevanceBrief = buildRelevanceBrief({
            profile: exam.exam_profile,
            hints: (exam.instructor_hints as string | null) ?? null,
            fidelity,
          });
          const parsed = ExamProfileSchema.safeParse(exam.exam_profile);
          if (parsed.success && parsed.data.topics.length > 0) {
            lensContext = { profile: parsed.data, fidelity };
          }
        }
      }

      // 4) Extract material.
      const material = await buildMaterialBlocks(files, examType, extraInfo);
      if (material.emptyPdfs.length > 0) {
        await fail(
          `Diese PDF${material.emptyPdfs.length > 1 ? "s" : ""} enthält keinen lesbaren Text (vermutlich gescannt): ${material.emptyPdfs.join(", ")}. Lade bitte die Originaldatei mit echtem Text hoch.`,
        );
        continue;
      }
      if (material.totalPages > MAX_PAGES_PER_PACK || material.totalChars > MAX_CHARS_PER_PACK) {
        await fail(MATERIAL_TOO_LARGE_MSG);
        continue;
      }

      // 5) Generate.
      const pack = await generatePack({
        client,
        blocks: material.blocks,
        examType,
        deadline: Date.now() + GEN_BUDGET_MS,
        twoPass: true,
        relevanceBrief,
        lensContext,
        extraInfo,
        materialLanguage: material.materialLanguage,
      });

      if (!pack.flashcards || pack.flashcards.length === 0) {
        await fail("Die Generierung lieferte keine Karteikarten — bitte erneut versuchen.", true);
        continue;
      }

      // 6) Save → ready. (exam_id was set at enqueue time.)
      const { error: upErr } = await service
        .from("study_packs")
        .update({
          status: "ready",
          title: pack.courseTitle,
          exam_type: pack.examType,
          pack_data: pack,
        })
        .eq("id", row.id);
      if (upErr) throw new Error(`save_failed: ${upErr.message}`);
      done++;
    } catch (e) {
      console.error(`[generate/worker] pack ${row.id} failed (attempt ${row.attempts})`, e);
      // Re-queue for the next tick unless we've burned the attempts.
      await fail("Generierung fehlgeschlagen — bitte erneut versuchen.", true);
    }
  }

  return NextResponse.json({ claimed: rows.length, done, failed });
}

export const GET = handle;
export const POST = handle;
