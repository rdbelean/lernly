import { NextResponse } from "next/server";
import { isAllowedAdminEmail } from "@/lib/admin/auth";
import { StudyPackSchema } from "@/lib/schema";
import {
  enforceRateLimit,
  extractClientIp,
  readJsonBodyWithLimit,
} from "@/lib/security/rateLimit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_PACK_SAVE_BYTES = 5 * 1024 * 1024; // 5 MB ceiling

export async function POST(request: Request) {
  const read = await readJsonBodyWithLimit(request, MAX_PACK_SAVE_BYTES);
  if (!read.ok) {
    return NextResponse.json({ error: read.error }, { status: read.status });
  }

  const parsed = StudyPackSchema.safeParse(
    (read.data as { pack?: unknown })?.pack,
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
  const isAdmin = isAllowedAdminEmail(user.email);

  const rl = await enforceRateLimit({
    scope: "packs_save",
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

  if (!isAdmin) {
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

  if (!isAdmin) {
    const { error: bumpErr } = await supabase.rpc("bump_pack_usage");
    if (bumpErr) {
      console.error("[/api/packs/save] bump failed", bumpErr);
    }
  }

  return NextResponse.json({ id: data.id });
}
