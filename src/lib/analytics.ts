"use client";

import posthog, { type PostHog } from "posthog-js";
import { hasAnalyticsConsent } from "@/lib/consent";

let initialized = false;

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_POSTHOG_KEY &&
      process.env.NEXT_PUBLIC_POSTHOG_HOST,
  );
}

function clearPostHogStorage(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("ph_")) window.localStorage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }
  try {
    for (const entry of document.cookie.split(";")) {
      const name = entry.split("=")[0]?.trim();
      if (name && name.startsWith("ph_")) {
        document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
      }
    }
  } catch {
    // ignore cookie errors
  }
}

export function initAnalytics(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;
  // TDDDG § 25: never initialize tracking or set analytics cookies without
  // explicit opt-in consent.
  if (!hasAnalyticsConsent()) return;
  if (!isConfigured()) {
    // Make the silent no-op visible outside production so a missing key shows up
    // in dev/preview instead of failing quietly (the funnel records nothing
    // without these). No-op in production to avoid console noise.
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[analytics] PostHog not configured (NEXT_PUBLIC_POSTHOG_KEY / _HOST missing) — no events will be sent",
      );
    }
    return;
  }

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: "identified_only",
  });
  initialized = true;
}

export function syncAnalyticsConsent(allowed: boolean): void {
  if (typeof window === "undefined") return;
  if (allowed) {
    if (!initialized) {
      initAnalytics();
    } else if (isConfigured()) {
      posthog.opt_in_capturing();
    }
    return;
  }

  if (initialized && isConfigured()) {
    try {
      posthog.opt_out_capturing();
      posthog.reset();
    } catch {
      // ignore if client wasn't fully booted
    }
  }
  clearPostHogStorage();
}

function safeClient(): PostHog | null {
  if (typeof window === "undefined") return null;
  if (!hasAnalyticsConsent()) return null;
  if (!isConfigured()) return null;
  // Self-initialize if an event fires before AnalyticsProvider's mount effect
  // has run (only once consent is already granted).
  if (!initialized) initAnalytics();
  if (!initialized) return null;
  return posthog;
}

export type FunnelEvent =
  | "anon_generate_started"
  | "anon_generate_completed"
  | "anon_generate_failed"
  | "signup_started"
  | "signup_completed"
  | "upload_started"
  | "pack_generation_started"
  | "auth_generate_completed"
  | "pack_generated"
  | "generation_quota_hit"
  | "pack_opened"
  | "first_flashcard_viewed"
  | "first_card_flipped"
  | "first_quiz_answered"
  | "flashcard_rated"
  | "walkthrough_started"
  | "walkthrough_step_completed"
  | "walkthrough_completed"
  | "walkthrough_skipped"
  | "checkout_started"
  | "demo_pack_viewed"
  | "demo_to_upload_clicked"
  | "demo_post_close_cta_seen"
  | "demo_post_close_cta_clicked"
  | "landing_variant_seen"
  | "flashcard_streak_achieved"
  | "flashcard_session_completed";

export function track(event: FunnelEvent, props?: Record<string, unknown>): void {
  safeClient()?.capture(event, props);
}

export function identify(userId: string, props?: Record<string, unknown>): void {
  safeClient()?.identify(userId, props);
}

export function resetUser(): void {
  safeClient()?.reset();
}

export function trackPageview(path: string): void {
  safeClient()?.capture("$pageview", { $current_url: path });
}
