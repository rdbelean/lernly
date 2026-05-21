"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
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
        <div className="text-[44px]">⚠️</div>
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
          {error.message || "Unbekannter Fehler."}
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
