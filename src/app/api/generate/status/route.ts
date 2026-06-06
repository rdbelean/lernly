import { NextResponse } from "next/server";
import { createClient as createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Lightweight poll target for the client while a background generation runs.
// RLS on study_packs scopes the row to its owner.
export async function GET(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const { data, error } = await supabase
    .from("study_packs")
    .select("status, gen_error, title")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[generate/status] query failed", error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    status: (data.status as string) ?? "ready",
    error: (data.gen_error as string | null) ?? null,
    title: (data.title as string | null) ?? null,
  });
}
