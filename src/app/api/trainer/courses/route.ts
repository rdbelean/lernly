import { NextResponse } from "next/server";
import {
  CLOSED_BETA_LOGIN_ERROR,
  isAllowedAdminEmail,
} from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { upsertTrainerBundleForUser } from "@/lib/trainer/syncPersistence";
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

  const result = await upsertTrainerBundleForUser(
    supabase,
    user.id,
    parsed.data,
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    id: result.id,
    title: result.title,
    examType: result.examType,
    updated: result.updated,
  });
}
