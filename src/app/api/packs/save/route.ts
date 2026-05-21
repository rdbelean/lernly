import { NextResponse } from "next/server";
import { StudyPackSchema } from "@/lib/schema";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = StudyPackSchema.safeParse(
    (body as { pack?: unknown })?.pack,
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Pack-Schema ungültig" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: quota, error: qErr } = await supabase.rpc("check_pack_quota");
  if (qErr) {
    console.error("[/api/packs/save] quota check failed", qErr);
  } else if (quota && quota.ok === false) {
    if (quota.reason === "rate_limit") {
      return NextResponse.json(
        {
          error: `Bitte warte noch ${quota.retry_after_seconds}s.`,
          reason: "rate_limit",
        },
        {
          status: 429,
          headers: { "Retry-After": String(quota.retry_after_seconds) },
        },
      );
    }
    if (quota.reason === "quota_exceeded") {
      return NextResponse.json(
        {
          error: `Monatslimit erreicht: ${quota.used}/${quota.limit} im ${quota.plan}-Plan.`,
          reason: "quota_exceeded",
          used: quota.used,
          limit: quota.limit,
          plan: quota.plan,
        },
        { status: 402 },
      );
    }
    return NextResponse.json(
      { error: "Speichern nicht erlaubt.", reason: quota.reason },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("study_packs")
    .insert({
      user_id: user.id,
      title: parsed.data.courseTitle,
      exam_type: parsed.data.examType,
      pack_data: parsed.data,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[/api/packs/save] insert failed", error);
    return NextResponse.json(
      { error: "Speichern fehlgeschlagen" },
      { status: 500 },
    );
  }

  const { error: bumpErr } = await supabase.rpc("bump_pack_usage");
  if (bumpErr) {
    console.error("[/api/packs/save] bump failed", bumpErr);
  }

  return NextResponse.json({ id: data.id });
}
