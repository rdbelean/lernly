import { NextResponse } from "next/server";
import {
  createClient as createSupabaseServer,
  createServiceClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { packId?: string };
  try {
    body = (await request.json()) as { packId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const packId = body.packId;
  if (!packId) return NextResponse.json({ error: "packId fehlt." }, { status: 400 });

  // Ownership check via the caller's RLS-scoped client (study_packs_select_own).
  const { data: pack } = await supabase
    .from("study_packs")
    .select("id, status, cram_job_id")
    .eq("id", packId)
    .single();
  if (!pack || !pack.cram_job_id) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  if (pack.status !== "failed") {
    return NextResponse.json({ error: "Nur fehlgeschlagene Pakete können wiederholt werden." }, { status: 409 });
  }

  // Re-queue atomically via service role (study_packs has no UPDATE RLS policy).
  const service = createServiceClient();
  const { data: ok, error } = await service.rpc("requeue_cram_chunk", {
    p_pack_id: packId,
    p_user_id: user.id,
  });
  if (error) {
    console.error("[cram/retry] requeue failed", error);
    return NextResponse.json({ error: "Konnte nicht wiederholen." }, { status: 500 });
  }
  return NextResponse.json({ requeued: Boolean(ok) });
}
