import { NextResponse } from "next/server";
import {
  createClient as createSupabaseServer,
  createServiceClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const service = createServiceClient();
  const { error } = await service
    .from("user_secrets")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("[/api/byok/delete] delete failed", error);
    return NextResponse.json({ error: "Löschen fehlgeschlagen." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
