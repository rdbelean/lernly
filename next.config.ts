import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Baseline security response headers. Clickjacking protection (a third-party
  // site framing the logged-in dashboard to trick a click on "Konto löschen"),
  // MIME-sniff protection, referrer trimming, HSTS, and locking down sensor
  // APIs we don't use. NOTE: a Content-Security-Policy is intentionally NOT set
  // here yet — a strict CSP must allowlist PostHog/Stripe/Turnstile/Supabase/
  // Sentry and needs careful testing before shipping.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

// Only apply the Sentry build plugin once a DSN is configured. Until then the
// config is returned untouched, so current builds are byte-identical and we
// don't require SENTRY_AUTH_TOKEN / org / project to build. When you set
// NEXT_PUBLIC_SENTRY_DSN (and optionally SENTRY_ORG/SENTRY_PROJECT/
// SENTRY_AUTH_TOKEN for source-map upload), the plugin activates automatically.
const sentryEnabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      // Upload source maps only when an auth token is present.
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
      // Route Sentry's browser requests through our domain to dodge ad-blockers.
      // NOTE: tunnelRoute + source-map upload only engage under webpack; this
      // project builds with Turbopack, so they're inert today. Runtime error
      // capture (instrumentation.ts + client init) works regardless of bundler.
      tunnelRoute: "/monitoring",
    })
  : nextConfig;
