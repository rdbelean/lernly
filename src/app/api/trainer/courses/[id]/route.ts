import { NextResponse } from "next/server";
import {
  CLOSED_BETA_LOGIN_ERROR,
  isAllowedAdminEmail,
} from "@/lib/admin/auth";
import { enforceRateLimit, extractClientIp } from "@/lib/security/rateLimit";
import { isUuid } from "@/lib/security/validation";
import { createClient } from "@/lib/supabase/server";
import { SavedTrainerPackSchema } from "@/lib/trainer/types";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isUuid(id)) {
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

  const rl = await enforceRateLimit({
    scope: "trainer_course_get",
    ip: extractClientIp(request.headers),
    userId: user.id,
    maxIp: 120,
    maxUser: 60,
    windowSeconds: 600,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Zu viele Abrufe. Bitte warte einen Moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
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
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isUuid(id)) {
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

  const rl = await enforceRateLimit({
    scope: "trainer_course_delete",
    ip: extractClientIp(request.headers),
    userId: user.id,
    maxIp: 40,
    maxUser: 20,
    windowSeconds: 600,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Zu viele Lösch-Anfragen. Bitte warte einen Moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
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
