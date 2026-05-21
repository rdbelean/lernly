"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";

type Language = "en" | "de";

const COPY: Record<Language, { signIn: string; dashboard: string }> = {
  en: { signIn: "Sign in", dashboard: "Dashboard" },
  de: { signIn: "Anmelden", dashboard: "Dashboard" },
};

export default function AuthMenu({ language = "en" }: { language?: Language }) {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);
  const copy = COPY[language];

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setLoaded(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!loaded) {
    return <div className="h-[28px] w-[80px]" />;
  }

  if (user) {
    const initial = (user.email?.[0] ?? "?").toUpperCase();
    return (
      <a
        href="/dashboard"
        className="flex items-center gap-2 text-[14px] font-medium text-white transition hover:opacity-80"
      >
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold"
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          {initial}
        </span>
        <span className="hidden sm:inline">{copy.dashboard}</span>
      </a>
    );
  }

  return (
    <a
      href="/login"
      className="text-[14px] font-medium text-white transition hover:opacity-70"
    >
      {copy.signIn}
    </a>
  );
}
