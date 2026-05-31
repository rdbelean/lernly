// Sentry — browser/client init. Dormant until NEXT_PUBLIC_SENTRY_DSN is set.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0.1,
  // Session Replay is off by default (privacy + bundle size); enable later if wanted.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
});

// Required by @sentry/nextjs for client-side navigation instrumentation.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
