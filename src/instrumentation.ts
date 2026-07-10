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

export const onRequestError: typeof Sentry.captureRequestError = async (
  error,
  request,
  context,
) => {
  Sentry.captureRequestError(error, request, context);
  // Also file server errors as Bug entries in the Notion feedback inbox
  // (deduped by message+route, no-op until NOTION_TOKEN is set). Dynamic
  // import keeps the edge bundle lean; nodejs-only to avoid double-reports.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { reportServerError } = await import("@/lib/feedback");
      await reportServerError(
        `${request.method} ${request.path}`,
        error,
      );
    } catch {
      // Never let error reporting break error handling.
    }
  }
};
