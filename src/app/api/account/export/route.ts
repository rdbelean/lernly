import { NextResponse } from "next/server";
import {
  createClient as createSupabaseServer,
  createServiceClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

// =========================================================================
// GET /api/account/export — DSGVO Art. 20 right to data portability.
// Returns a structured JSON dump of everything the user has stored in
// Lernly. Triggered from the settings page; the browser saves as a file
// via the Content-Disposition header.
// =========================================================================

export async function GET() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Service client to read every table the user owns (RLS scopes the
  // anon/authenticated client which would also work, but going through
  // service avoids any sneaky policy gaps for newly-added tables).
  const service = createServiceClient();
  const uid = user.id;

  const [
    profile,
    packs,
    exams,
    examRefs,
    quizAttempts,
    tutorUsage,
    packCredits,
  ] = await Promise.all([
    service.from("users").select("*").eq("id", uid).maybeSingle(),
    service.from("study_packs").select("*").eq("user_id", uid),
    service.from("exams").select("*").eq("user_id", uid),
    service.from("exam_references").select("*").eq("user_id", uid),
    service.from("quiz_attempts").select("*").eq("user_id", uid),
    service.from("tutor_usage").select("*").eq("user_id", uid).maybeSingle(),
    service.from("pack_credits").select("*").eq("user_id", uid),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      provider: user.app_metadata?.provider ?? null,
      created_at: user.created_at,
    },
    profile: profile.data ?? null,
    packs: packs.data ?? [],
    exams: exams.data ?? [],
    exam_references: examRefs.data ?? [],
    quiz_attempts: quizAttempts.data ?? [],
    tutor_usage: tutorUsage.data ?? null,
    pack_credits: packCredits.data ?? [],
  };

  const filename = `lernly-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
