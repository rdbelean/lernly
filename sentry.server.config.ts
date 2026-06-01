// Sentry — server runtime init. Dormant until NEXT_PUBLIC_SENTRY_DSN is set
// in the environment (a falsy DSN makes Sentry.init a no-op), so this ships
// safely before the Sentry account/DSN exists.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  // Capture all errors; sample 10% of performance traces to keep volume/cost low.
  tracesSampleRate: 0.1,
  // Don't send PII (emails, IPs) by default — DSGVO-friendly.
  sendDefaultPii: false,
});
