import { NextResponse } from "next/server";
import { enforceRateLimit, extractClientIp } from "@/lib/security/rateLimit";
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
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rl = await enforceRateLimit({
    scope: "byok_delete",
    ip: extractClientIp(request.headers),
    userId: user.id,
    maxIp: 20,
    maxUser: 10,
    windowSeconds: 600,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte warte einen Moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
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
