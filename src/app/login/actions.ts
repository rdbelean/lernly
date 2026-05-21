"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getOrigin(host: string | null, proto: string | null) {
  if (!host) return null;
  return `${proto ?? "https"}://${host}`;
}

function sanitizeNext(raw: string | null | undefined): string {
  if (typeof raw !== "string") return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function loginWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const h = await headers();
  const origin =
    h.get("origin") ?? getOrigin(h.get("host"), h.get("x-forwarded-proto"));
  const next = sanitizeNext(formData.get("next") as string | null);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  if (data?.url) {
    redirect(data.url);
  }
  redirect("/login?error=unknown");
}

export async function loginWithMagicLink(formData: FormData) {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.includes("@")) {
    redirect("/login?error=invalid_email");
  }

  const supabase = await createClient();
  const h = await headers();
  const origin =
    h.get("origin") ?? getOrigin(h.get("host"), h.get("x-forwarded-proto"));
  const next = sanitizeNext(formData.get("next") as string | null);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect(
    `/login?sent=1&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`,
  );
}
