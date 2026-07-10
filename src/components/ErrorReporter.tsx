"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/reportClientError";

// Global client error hooks (window "error" + "unhandledrejection") that
// auto-file bugs into the Notion Feedback DB via /api/feedback. Renders
// nothing; mounted once in the root layout. Sentry stays untouched — this
// is the founder-facing intake, dedupe/noise-filter lives in
// reportClientError.

export default function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportClientError(
        event.message,
        event.error instanceof Error ? event.error.stack : undefined,
      );
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason instanceof Error) {
        reportClientError(`Unhandled rejection: ${reason.message}`, reason.stack);
      } else {
        reportClientError(`Unhandled rejection: ${String(reason).slice(0, 300)}`);
      }
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
