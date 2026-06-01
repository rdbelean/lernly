import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
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
