import { NextResponse } from "next/server";
import {
  CLOSED_BETA_LOGIN_ERROR,
  isAllowedAdminEmail,
} from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { SavedTrainerPackSchema } from "@/lib/trainer/types";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Ungültige Kurs-ID." }, { status: 400 });
  }

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
    .select("id, title, exam_type, pack_data")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "Kurs nicht gefunden." },
      { status: 404 },
    );
  }

  const parsed = SavedTrainerPackSchema.safeParse(data.pack_data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Gespeicherter Kurs hat ein unbekanntes Format." },
      { status: 422 },
    );
  }

  void supabase
    .from("study_packs")
    .update({ last_opened_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .then(() => {});

  return NextResponse.json({
    id: data.id,
    title: data.title,
    examType: data.exam_type,
    bundle: parsed.data.bundle,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Ungültige Kurs-ID." }, { status: 400 });
  }

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

  const { error } = await supabase
    .from("study_packs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[/api/trainer/courses DELETE] failed", error);
    return NextResponse.json(
      { error: "Kurs konnte nicht gelöscht werden." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
