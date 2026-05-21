"use client";

import { useEffect } from "react";
import { identify, track } from "@/lib/analytics";

type Props = {
  userId: string;
  email: string | null;
  provider: string | null;
};

// Fires posthog.identify + signup_completed exactly once per browser per user.
// The first time this user lands on the dashboard in a given browser, we link
// the anonymous distinct_id to their Supabase user id so the funnel can be
// measured end-to-end. Subsequent visits short-circuit on the localStorage flag.
export default function UserIdentifier({ userId, email, provider }: Props) {
  useEffect(() => {
    if (!userId) return;
    try {
      const key = `lernly_identified_${userId}`;
      if (localStorage.getItem(key)) return;
      identify(userId, { email: email ?? undefined });
      track("signup_completed", { provider: provider ?? "unknown" });
      localStorage.setItem(key, "1");
    } catch {
      // localStorage can throw in private-mode Safari; fail silently — worst case
      // we identify on the next mount.
    }
  }, [userId, email, provider]);

  return null;
}
