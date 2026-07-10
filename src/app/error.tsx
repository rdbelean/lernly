"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { reportClientError } from "@/lib/reportClientError";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
    // Surface the error to Sentry (no-op until NEXT_PUBLIC_SENTRY_DSN is set),
    // so production crashes are visible instead of dying silently in console.
    Sentry.captureException(error);
    // Also file it as a Bug in the Notion feedback inbox (deduped, no PII).
    reportClientError(
      error.message + (error.digest ? ` (digest: ${error.digest})` : ""),
      error.stack,
    );
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div
        className="w-full max-w-[480px] rounded-[28px] p-10 text-center text-white"
        style={{
          background: "rgba(20, 22, 28, 0.78)",
          border: "1px solid rgba(255, 255, 255, 0.22)",
          backdropFilter: "blur(24px)",
        }}
      >
        <div className="flex justify-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <AlertTriangle className="h-7 w-7" style={{ color: "rgb(248, 180, 90)" }} />
          </span>
        </div>
        <h1
          className="mt-4 text-[28px] font-bold tracking-[-0.8px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Da lief was schief
        </h1>
        <p
          className="mt-3 text-[14px]"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Ein unerwarteter Fehler ist aufgetreten. Versuch es nochmal — wenn es
          weiter hakt, lade die Seite neu.
        </p>
        {error.digest && (
          <p
            className="mt-2 text-[12px]"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            ID: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-white px-5 py-2.5 text-[14px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
          >
            Nochmal versuchen
          </button>
          <a
            href="/"
            className="rounded-full border border-white/20 bg-transparent px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-white/5"
          >
            Zur Startseite
          </a>
        </div>
      </div>
    </main>
  );
}
