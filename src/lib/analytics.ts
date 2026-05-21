"use client";

import posthog, { type PostHog } from "posthog-js";

let initialized = false;

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_POSTHOG_KEY &&
      process.env.NEXT_PUBLIC_POSTHOG_HOST,
  );
}

export function initAnalytics(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;
  if (!isConfigured()) return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: "identified_only",
  });
  initialized = true;
}

function safeClient(): PostHog | null {
  if (!initialized || !isConfigured()) return null;
  if (typeof window === "undefined") return null;
  return posthog;
}

export type FunnelEvent =
  | "anon_generate_started"
  | "anon_generate_completed"
  | "anon_generate_failed"
  | "signup_started"
  | "signup_completed"
  | "auth_generate_completed"
  | "pack_opened"
  | "flashcard_rated"
  | "checkout_started"
  | "demo_pack_viewed"
  | "demo_to_upload_clicked";

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
