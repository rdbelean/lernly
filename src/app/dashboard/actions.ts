"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { STUDY_UPLOADS_BUCKET } from "@/lib/uploads";
import { extractTextFromUpload } from "@/lib/textExtract";
import {
  analyzePastExam,
  finalizeProfile,
  mergeExamProfiles,
  type PerExamInput,
} from "@/lib/examAnalysis";
import { MAX_PAST_EXAM_FILES } from "@/lib/uploadConfig";
import { FidelitySchema, type Fidelity } from "@/lib/schema";

const ALLOWED_COLORS = new Set([
  "cyan",
  "violet",
  "sage",
  "rose",
  "amber",
  "indigo",
]);

function normalizeColor(c: string | null | undefined): string | null {
  if (!c) return null;
  const trimmed = c.trim().toLowerCase();
  return ALLOWED_COLORS.has(trimmed) ? trimmed : null;
}

function normalizeTitle(t: string): string {
  const trimmed = t.trim();
  if (!trimmed) throw new Error("Titel darf nicht leer sein.");
  if (trimmed.length > 120) return trimmed.slice(0, 120);
  return trimmed;
}

function normalizeDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const trimmed = d.trim();
  if (!trimmed) return null;
  // YYYY-MM-DD only — the <input type="date"> always emits this format.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Datum hat ein ungültiges Format.");
  }
  return trimmed;
}

function normalizeFidelity(f: string | null | undefined): Fidelity | null {
  if (!f) return null;
  const parsed = FidelitySchema.safeParse(f.trim());
  return parsed.success ? parsed.data : null;
}

function normalizeHints(h: string | null | undefined): string | null {
  if (!h) return null;
  const trimmed = h.trim();
  if (!trimmed) return null;
  // Generous cap — hints can include syllabus snippets, professor emails, etc.
  return trimmed.length > 8_000 ? trimmed.slice(0, 8_000) : trimmed;
}

async function authedClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Nicht angemeldet.");
  return { supabase, userId: data.user.id };
}

export async function createExam(input: {
  title: string;
  exam_date?: string | null;
  color?: string | null;
  instructor_hints?: string | null;
  fidelity?: string | null;
}) {
  const { supabase, userId } = await authedClient();
  const row = {
    user_id: userId,
    title: normalizeTitle(input.title),
    exam_date: normalizeDate(input.exam_date),
    color: normalizeColor(input.color),
    instructor_hints: normalizeHints(input.instructor_hints),
    fidelity: normalizeFidelity(input.fidelity) ?? "likely",
  };
  const { data, error } = await supabase
    .from("exams")
    .insert(row)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  return { id: data.id as string };
}

export async function updateExam(input: {
  id: string;
  title?: string;
  exam_date?: string | null;
  color?: string | null;
  instructor_hints?: string | null;
  fidelity?: string | null;
}) {
  const { supabase } = await authedClient();
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = normalizeTitle(input.title);
  if (input.exam_date !== undefined)
    patch.exam_date = normalizeDate(input.exam_date);
  if (input.color !== undefined) patch.color = normalizeColor(input.color);
  if (input.instructor_hints !== undefined)
    patch.instructor_hints = normalizeHints(input.instructor_hints);
  if (input.fidelity !== undefined) {
    const fid = normalizeFidelity(input.fidelity);
    if (fid) patch.fidelity = fid;
  }
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from("exams").update(patch).eq("id", input.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function deleteExam(id: string) {
  const { supabase } = await authedClient();
  // FK uses ON DELETE SET NULL on study_packs.exam_id — packs survive their
  // exam and reappear in the "Nicht zugeordnet" section.
  const { error } = await supabase.from("exams").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

// Multi-Altklausur intake: download + extract each file (skipping unreadable
// scanned PDFs and reporting them by name), insert exam_references rows,
// then re-analyze ALL past-exam references of this exam (existing + new,
// newest first, cap MAX_PAST_EXAM_FILES) in parallel and merge into ONE
// course-level profile. Graceful degradation at every step — references
// survive analysis failures so the user can retry later (or proceed
// without the lens). BYOK isn't applied to analysis in V1 (small calls,
// run on Lernly's bill — same as the previous single-file version).
export async function attachPastExamsToExam(input: {
  examId: string;
  files: { storagePath: string; filename: string }[];
}): Promise<{
  ok: boolean;
  reason?: string;
  analyzed?: number;
  examCount?: number;
  skipped?: string[];
}> {
  const { userId } = await authedClient();
  const files = input.files.slice(0, MAX_PAST_EXAM_FILES);
  if (files.length === 0) return { ok: false, reason: "no_files" };
  // Ownership guard: service-role downloads bypass RLS, so enforce that the
  // paths are in the requesting user's folder before touching them.
  for (const f of files) {
    if (!f.storagePath.startsWith(`${userId}/`)) {
      throw new Error("Ungültiger Datei-Verweis.");
    }
  }

  const service = createServiceClient();
  // Use the user-scoped client for inserts/updates so RLS applies.
  const supabase = await createClient();
  const skipped: string[] = [];

  // 1) Per-file download + extract. Bad files (scanned, download error) are
  //    skipped and named — never fail the whole batch on one bad file.
  for (const f of files) {
    const dl = await service.storage
      .from(STUDY_UPLOADS_BUCKET)
      .download(f.storagePath);
    if (dl.error || !dl.data) {
      skipped.push(f.filename);
      continue;
    }
    const buffer = Buffer.from(await dl.data.arrayBuffer());
    let extracted;
    try {
      extracted = await extractTextFromUpload(buffer, f.filename);
    } catch {
      skipped.push(f.filename);
      continue;
    }
    if (!extracted.text.trim()) {
      skipped.push(f.filename);
      continue;
    }
    const { error: insErr } = await supabase.from("exam_references").insert({
      exam_id: input.examId,
      user_id: userId,
      filename: f.filename,
      extracted_text: extracted.text,
      kind: "past_exam",
    });
    if (insErr) throw new Error(insErr.message);
  }

  // 2) Re-load ALL past-exam references (existing + just-added) so adding
  //    files to an exam that already has Altklausuren re-covers the full set.
  const { data: refs, error: refErr } = await supabase
    .from("exam_references")
    .select("filename, extracted_text")
    .eq("exam_id", input.examId)
    .eq("kind", "past_exam")
    .order("created_at", { ascending: false })
    .limit(MAX_PAST_EXAM_FILES);
  if (refErr) throw new Error(refErr.message);
  const usable = (refs ?? []).filter((r) =>
    ((r.extracted_text as string | null) ?? "").trim(),
  );
  if (usable.length === 0) {
    return { ok: false, reason: "no_readable_text", skipped };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // References are saved, profile stays as-is. Caller can retry later.
    return { ok: false, reason: "no_api_key", skipped };
  }
  const client = new Anthropic({ apiKey });

  // 3) Per-exam analysis IN PARALLEL — wall time ≈ one analysis. Failures
  //    drop out individually; partial evidence beats none.
  const results = await Promise.all(
    usable.map((r) => analyzePastExam(client, r.extracted_text as string)),
  );
  const perExamInputs: PerExamInput[] = [];
  results.forEach((res, i) => {
    if (res.ok) {
      perExamInputs.push({
        filename:
          (usable[i].filename as string | null) ?? `Altklausur ${i + 1}`,
        year: res.profile.year,
        profile: res.profile,
      });
    }
  });
  if (perExamInputs.length === 0) {
    const firstFail = results.find((r) => !r.ok);
    return {
      ok: false,
      reason: firstFail && !firstFail.ok ? firstFail.reason : "unknown",
      skipped,
    };
  }

  const perExamMeta = perExamInputs.map((x) => ({
    filename: x.filename,
    ...(x.year ? { year: x.year } : {}),
  }));

  // 4) Merge (multi-exam) or map directly (single exam). Merge failure
  //    falls back to the newest single-exam profile at counts 1/1 —
  //    honest, never a fabricated frequency.
  let finalProfile;
  if (perExamInputs.length === 1) {
    finalProfile = finalizeProfile(perExamInputs[0].profile, 1, perExamMeta);
  } else {
    const merged = await mergeExamProfiles(client, perExamInputs);
    if (merged.ok) {
      finalProfile = finalizeProfile(
        merged.profile,
        perExamInputs.length,
        perExamMeta,
      );
    } else {
      console.warn(
        "[attachPastExamsToExam] merge failed, falling back to newest single profile",
        merged.reason,
      );
      finalProfile = finalizeProfile(perExamInputs[0].profile, 1, [
        perExamMeta[0],
      ]);
    }
  }

  const { error: upErr } = await supabase
    .from("exams")
    .update({ exam_profile: finalProfile })
    .eq("id", input.examId);
  if (upErr) {
    console.error("[attachPastExamsToExam] persist profile failed", upErr);
    return { ok: false, reason: "persist_failed", skipped };
  }
  revalidatePath("/dashboard");
  return {
    ok: true,
    analyzed: perExamInputs.length,
    examCount: finalProfile.exam_count,
    skipped,
  };
}

export async function assignPackToExam(input: {
  packId: string;
  examId: string | null;
}) {
  const { supabase } = await authedClient();
  const { error } = await supabase
    .from("study_packs")
    .update({ exam_id: input.examId })
    .eq("id", input.packId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

// =========================================================================
// Welcome modal — persist the captured name (if any) and flip the one-time
// has_seen_welcome flag so the modal never shows again.
// =========================================================================
// `name` null/empty  → only the flag is flipped (dismiss without typing).
// `name` non-empty   → trimmed (≤80 chars) and stored, then flag flipped.
// Uses the service client for the UPDATE to match setExamReminderPreference
// (settings/actions.ts), which bypasses RLS for users-table writes.
export async function saveWelcome(
  name: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await authedClient();

  const trimmed = (name ?? "").trim().slice(0, 80);
  const patch: { has_seen_welcome: true; name?: string } = {
    has_seen_welcome: true,
  };
  if (trimmed) patch.name = trimmed;

  const service = createServiceClient();
  const { error } = await service.from("users").update(patch).eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
