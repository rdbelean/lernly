import type { SupabaseClient } from "@supabase/supabase-js";
import { importTrainerBundle, type ImportTrainerFile } from "./importer";
import { TrainerBundleSchema, type TrainerBundle } from "./types";

export type ResolveSyncPayloadResult =
  | { ok: true; bundle: TrainerBundle }
  | { ok: false; error: string };

/**
 * Normalizes incoming `/api/trainer/sync` payloads into a validated `TrainerBundle`.
 * Supports `{ bundle }`, `{ files }` (`_lernly` file map), or `{ html, filename }`.
 */
export function resolveSyncBundlePayload(body: unknown): ResolveSyncPayloadResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Ungültiger Sync-Payload." };
  }

  const record = body as Record<string, unknown>;

  if (record.bundle !== undefined) {
    const parsed = TrainerBundleSchema.safeParse(record.bundle);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const where = issue?.path?.join(".") || "bundle";
      return {
        ok: false,
        error: `Kursformat ungültig (${where}: ${issue?.message ?? "Validierungsfehler"}).`,
      };
    }
    return { ok: true, bundle: parsed.data };
  }

  if (record.files && typeof record.files === "object" && !Array.isArray(record.files)) {
    const uploadFiles: ImportTrainerFile[] = [];
    for (const [name, content] of Object.entries(record.files as Record<string, unknown>)) {
      if (typeof content === "string") {
        uploadFiles.push({ name, content });
      } else if (content && typeof content === "object") {
        uploadFiles.push({ name, content: JSON.stringify(content) });
      }
    }
    const imported = importTrainerBundle(uploadFiles);
    if (!imported.ok) {
      return { ok: false, error: imported.error };
    }
    return { ok: true, bundle: imported.bundle };
  }

  if (typeof record.html === "string" && record.html.trim().length > 0) {
    const filename =
      typeof record.filename === "string" && record.filename.trim().length > 0
        ? record.filename.trim()
        : "Lernly-Trainer.html";
    const imported = importTrainerBundle([{ name: filename, content: record.html }]);
    if (!imported.ok) {
      return { ok: false, error: imported.error };
    }
    return { ok: true, bundle: imported.bundle };
  }

  return {
    ok: false,
    error: "Erwartet wird { bundle }, { files } oder { html }.",
  };
}

export type UpsertTrainerResult =
  | {
      ok: true;
      id: string;
      title: string;
      examType: "mcp_course" | "html_artifact";
      updated: boolean;
      updatedAt: string;
      topicCount: number;
    }
  | { ok: false; error: string; status: number };

/**
 * Shared upserter used by both `/api/trainer/courses` (cookie session) and
 * `/api/trainer/sync` (stateless desktop sync token).
 */
export async function upsertTrainerBundleForUser(
  supabase: SupabaseClient,
  userId: string,
  bundle: TrainerBundle,
): Promise<UpsertTrainerResult> {
  const title = bundle.course.title.trim().slice(0, 200) || "Kurs";
  const examType: "mcp_course" | "html_artifact" = bundle.artifactHtml
    ? "html_artifact"
    : "mcp_course";
  const packData = {
    schema: "lernly.saved_trainer/1" as const,
    bundle,
  };
  const nowIso = new Date().toISOString();
  const topicCount = Object.keys(bundle.topics).length;

  const { data: existing, error: findErr } = await supabase
    .from("study_packs")
    .select("id")
    .eq("user_id", userId)
    .eq("title", title)
    .in("exam_type", ["mcp_course", "html_artifact"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findErr) {
    console.error("[upsertTrainerBundleForUser] lookup failed", findErr);
  }

  if (existing?.id) {
    const { data: updated, error: updErr } = await supabase
      .from("study_packs")
      .update({
        exam_type: examType,
        pack_data: packData,
        last_opened_at: nowIso,
      })
      .eq("id", existing.id)
      .eq("user_id", userId)
      .select("id, title, exam_type")
      .single();

    if (updErr || !updated) {
      console.error("[upsertTrainerBundleForUser] update failed", updErr);
      return {
        ok: false,
        error: "Kurs konnte nicht aktualisiert werden.",
        status: 500,
      };
    }

    return {
      ok: true,
      id: updated.id,
      title: updated.title,
      examType,
      updated: true,
      updatedAt: nowIso,
      topicCount,
    };
  }

  const { data: inserted, error: insErr } = await supabase
    .from("study_packs")
    .insert({
      user_id: userId,
      title,
      exam_type: examType,
      status: "ready",
      pack_data: packData,
      last_opened_at: nowIso,
    })
    .select("id, title, exam_type")
    .single();

  if (insErr || !inserted) {
    console.error("[upsertTrainerBundleForUser] insert failed", insErr);
    return {
      ok: false,
      error: "Kurs konnte nicht gespeichert werden.",
      status: 500,
    };
  }

  return {
    ok: true,
    id: inserted.id,
    title: inserted.title,
    examType,
    updated: false,
    updatedAt: nowIso,
    topicCount,
  };
}
