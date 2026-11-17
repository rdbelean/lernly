"use client";

import { useEffect } from "react";
import Link from "next/link";
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
        className="w-full max-w-[480px] rounded-[28px] p-10 text-center text-[color:var(--color-text)]"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-ink-a14)",
          backdropFilter: "blur(24px)",
        }}
      >
        <div className="flex justify-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "var(--color-ink-a10)" }}
          >
            <AlertTriangle className="h-7 w-7" style={{ color: "var(--color-urgent-ink)" }} />
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
          style={{ color: "var(--color-text-faint)" }}
        >
          Ein unerwarteter Fehler ist aufgetreten. Versuch es nochmal — wenn es
          weiter hakt, lade die Seite neu.
        </p>
        {error.digest && (
          <p
            className="mt-2 text-[12px]"
            style={{ color: "var(--color-ink-a14)" }}
          >
            ID: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-[color:var(--color-primary)] px-5 py-2.5 text-[14px] font-medium text-[color:var(--color-on-primary)] transition hover:bg-[color:var(--color-primary-press)]"
          >
            Nochmal versuchen
          </button>
          <Link
            href="/"
            className="rounded-full border border-[color:var(--color-ink-a14)] bg-transparent px-5 py-2.5 text-[14px] font-medium text-[color:var(--color-text)] transition hover:bg-[color:var(--color-ink-a06)]"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    </main>
  );
}
