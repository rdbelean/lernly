import { NextResponse } from "next/server";
import {
  CLOSED_BETA_LOGIN_ERROR,
  isAllowedAdminEmail,
} from "@/lib/admin/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", url.origin),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  const user = data?.user ?? (await supabase.auth.getUser()).data.user;
  if (!user || !isAllowedAdminEmail(user.email)) {
    await supabase.auth.signOut();

    // Prevent uninvited OAuth sign-ups from remaining in auth.users.
    if (user?.id) {
      const createdAtMs = user.created_at ? Date.parse(user.created_at) : NaN;
      const isFreshUser =
        Number.isFinite(createdAtMs) && Date.now() - createdAtMs < 60_000;
      if (isFreshUser) {
        try {
          await createServiceClient().auth.admin.deleteUser(user.id);
        } catch (delErr) {
          console.error("[auth/callback] cleanup uninvited user failed", delErr);
        }
      }
    }

    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(CLOSED_BETA_LOGIN_ERROR)}`,
        url.origin,
      ),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
