// Next.js instrumentation entrypoint. Loads the correct Sentry init for the
// runtime, and forwards server request errors to Sentry. All no-ops until
// NEXT_PUBLIC_SENTRY_DSN is set (see the per-runtime config files).
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
