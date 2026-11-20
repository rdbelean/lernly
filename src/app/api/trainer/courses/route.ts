import { NextResponse } from "next/server";
import {
  CLOSED_BETA_LOGIN_ERROR,
  isAllowedAdminEmail,
} from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { TrainerBundleSchema } from "@/lib/trainer/types";

export const runtime = "nodejs";

const MAX_COURSE_JSON_BYTES = 8 * 1024 * 1024; // 8 MB safety ceiling

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!isAllowedAdminEmail(user.email)) {
    return NextResponse.json(
      { error: CLOSED_BETA_LOGIN_ERROR },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("study_packs")
    .select("id, title, exam_type, created_at, last_opened_at")
    .eq("user_id", user.id)
    .eq("status", "ready")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[/api/trainer/courses GET] query failed", error);
    return NextResponse.json(
      { error: "Kurse konnten nicht geladen werden." },
      { status: 500 },
    );
  }

  return NextResponse.json({ courses: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!isAllowedAdminEmail(user.email)) {
    return NextResponse.json(
      { error: CLOSED_BETA_LOGIN_ERROR },
      { status: 403 },
    );
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Anfrage konnte nicht gelesen werden." },
      { status: 400 },
    );
  }
  if (Buffer.byteLength(rawText, "utf-8") > MAX_COURSE_JSON_BYTES) {
    return NextResponse.json(
      { error: "Der Kurs ist zu groß (maximal 8 MB)." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON." }, { status: 400 });
  }

  const parsed = TrainerBundleSchema.safeParse(
    (body as { bundle?: unknown })?.bundle,
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Kursformat ungültig." },
      { status: 400 },
    );
  }

  const bundle = parsed.data;
  const title = bundle.course.title.trim().slice(0, 200) || "Kurs";
  const examType = bundle.artifactHtml ? "html_artifact" : "mcp_course";
  const packData = {
    schema: "lernly.saved_trainer/1" as const,
    bundle,
  };
  const nowIso = new Date().toISOString();

  // Upsert by (user_id, title) across trainer course rows so re-uploading updates cleanly.
  const { data: existing, error: findErr } = await supabase
    .from("study_packs")
    .select("id")
    .eq("user_id", user.id)
    .eq("title", title)
    .in("exam_type", ["mcp_course", "html_artifact"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findErr) {
    console.error("[/api/trainer/courses POST] lookup failed", findErr);
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
      .eq("user_id", user.id)
      .select("id, title, exam_type")
      .single();

    if (updErr || !updated) {
      console.error("[/api/trainer/courses POST] update failed", updErr);
      return NextResponse.json(
        { error: "Kurs konnte nicht aktualisiert werden." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      examType: updated.exam_type,
      updated: true,
    });
  }

  const { data: inserted, error: insErr } = await supabase
    .from("study_packs")
    .insert({
      user_id: user.id,
      title,
      exam_type: examType,
      status: "ready",
      pack_data: packData,
      last_opened_at: nowIso,
    })
    .select("id, title, exam_type")
    .single();

  if (insErr || !inserted) {
    console.error("[/api/trainer/courses POST] insert failed", insErr);
    return NextResponse.json(
      { error: "Kurs konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: inserted.id,
    title: inserted.title,
    examType: inserted.exam_type,
    updated: false,
  });
}
