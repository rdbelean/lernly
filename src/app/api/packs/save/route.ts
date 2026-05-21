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
    return NextResponse.json(
      { error: "Pack-Schema ungültig" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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

  return NextResponse.json({ id: data.id });
}
