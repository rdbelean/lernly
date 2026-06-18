import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Token-hash confirm route — the device-independent magic-link target.
//
// Unlike /auth/callback (PKCE ?code= + exchangeCodeForSession, which is bound to
// the code_verifier cookie on the requesting device → "missing_code" when opened
// elsewhere), this calls verifyOtp({ token_hash, type }) server-side. The token
// hash is self-contained, so the link works on ANY device/browser. The login
// email points here (built from generateLink's hashed_token in login/actions.ts).
//
// /auth/callback stays untouched for Google OAuth (same-device, PKCE is fine).

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "magiclink") as EmailOtpType;
  const next = safeNext(url.searchParams.get("next"));

  const expired =
    "Der Login-Link ist abgelaufen oder ungültig. Fordere einen neuen an.";

  if (!tokenHash) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(expired)}`, url.origin),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(expired)}`, url.origin),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
