"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { STUDY_UPLOADS_BUCKET } from "@/lib/uploads";
import { extractTextFromUpload } from "@/lib/textExtract";
import { analyzePastExam } from "@/lib/examAnalysis";
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

// Phase-1 brief §7-step-3: when Path A has a past exam, download from Storage,
// extract text, run analyzePastExam, persist the reference + the analysis.
// Graceful degradation — if analysis fails (timeout, schema invalid, model
// error), the reference row still gets stored and exam_profile stays null
// so the user can retry later (or proceed without the lens).
export async function attachPastExamToExam(input: {
  examId: string;
  storagePath: string;
  filename: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const { userId } = await authedClient();
  // Ownership guard: service-role downloads bypass RLS, so enforce that the
  // path is in the requesting user's folder before touching it.
  if (!input.storagePath.startsWith(`${userId}/`)) {
    throw new Error("Ungültiger Datei-Verweis.");
  }
  const service = createServiceClient();
  const dl = await service.storage
    .from(STUDY_UPLOADS_BUCKET)
    .download(input.storagePath);
  if (dl.error || !dl.data) {
    throw new Error(`Konnte Datei nicht laden: ${dl.error?.message ?? "leer"}`);
  }
  const buffer = Buffer.from(await dl.data.arrayBuffer());
  const extracted = await extractTextFromUpload(buffer, input.filename);
  if (!extracted.text.trim()) {
    throw new Error(
      "Aus dieser Datei konnte kein Text gelesen werden (vermutlich gescannt). Lade die Originaldatei mit echtem Text hoch.",
    );
  }

  // Insert the reference first — that survives even if analysis fails.
  // Use the user-scoped client so RLS applies.
  const supabase = await createClient();
  const { error: insErr } = await supabase.from("exam_references").insert({
    exam_id: input.examId,
    user_id: userId,
    filename: input.filename,
    extracted_text: extracted.text,
    kind: "past_exam",
  });
  if (insErr) throw new Error(insErr.message);

  // Now run analysis. The default Anthropic client uses ANTHROPIC_API_KEY
  // from env — same as the generation pipeline. BYOK isn't applied to
  // analysis in V1 (small call, run on Lernly's bill).
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Reference is saved, profile stays null. Caller can retry later.
    return { ok: false, reason: "no_api_key" };
  }
  const client = new Anthropic({ apiKey });
  const result = await analyzePastExam(client, extracted.text);
  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }
  const { error: upErr } = await supabase
    .from("exams")
    .update({ exam_profile: result.profile })
    .eq("id", input.examId);
  if (upErr) {
    console.error("[attachPastExamToExam] persist profile failed", upErr);
    return { ok: false, reason: "persist_failed" };
  }
  revalidatePath("/dashboard");
  return { ok: true };
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
