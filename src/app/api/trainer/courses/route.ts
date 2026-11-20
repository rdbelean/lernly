import { NextResponse } from "next/server";
import {
  CLOSED_BETA_LOGIN_ERROR,
  isAllowedAdminEmail,
} from "@/lib/admin/auth";
import {
  enforceRateLimit,
  extractClientIp,
  readJsonBodyWithLimit,
} from "@/lib/security/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { upsertTrainerBundleForUser } from "@/lib/trainer/syncPersistence";
import { TrainerBundleSchema } from "@/lib/trainer/types";

export const runtime = "nodejs";

const MAX_COURSE_JSON_BYTES = 5 * 1024 * 1024; // 5 MB safety ceiling

export async function GET(request: Request) {
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
    scope: "trainer_courses_get",
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

  const rl = await enforceRateLimit({
    scope: "trainer_courses_write",
    ip: extractClientIp(request.headers),
    userId: user.id,
    maxIp: 60,
    maxUser: 30,
    windowSeconds: 600,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Zu viele Speicher-Anfragen. Bitte warte einen Moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const read = await readJsonBodyWithLimit(request, MAX_COURSE_JSON_BYTES);
  if (!read.ok) {
    return NextResponse.json({ error: read.error }, { status: read.status });
  }

  const parsed = TrainerBundleSchema.safeParse(
    (read.data as { bundle?: unknown })?.bundle,
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
