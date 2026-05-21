import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { encryptApiKey } from "@/lib/byok";
import {
  createClient as createSupabaseServer,
  createServiceClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { apiKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

  if (!apiKey.startsWith("sk-ant-")) {
    return NextResponse.json(
      { error: "Ungültiger Anthropic-Key — beginnt mit sk-ant-." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1,
      messages: [{ role: "user", content: "ok" }],
    });
  } catch (e) {
    const msg = e instanceof Anthropic.APIError ? e.message : "Test fehlgeschlagen";
    return NextResponse.json(
      { error: `Anthropic lehnt diesen Key ab: ${msg}` },
      { status: 400 },
    );
  }

  let ciphertext: string;
  try {
    ciphertext = encryptApiKey(apiKey);
  } catch (e) {
    console.error("[/api/byok/save] encryption setup failed", e);
    return NextResponse.json(
      { error: "Server-Konfigurationsfehler (Encryption-Key)." },
      { status: 500 },
    );
  }

  const service = createServiceClient();
  const { error } = await service.from("user_secrets").upsert({
    user_id: user.id,
    anthropic_key_ciphertext: ciphertext,
    anthropic_key_set_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[/api/byok/save] upsert failed", error);
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
