"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "lernly:pendingPack";

export default function ClaimPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "empty" | "error">(
    "working",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
    if (!raw) {
      setStatus("empty");
      return;
    }

    let pack: unknown;
    try {
      pack = JSON.parse(raw);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      setStatus("empty");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/packs/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pack }),
        });
        const json = await res.json();
        if (!res.ok || !json.id) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        window.localStorage.removeItem(STORAGE_KEY);
        router.replace(`/dashboard/pack/${json.id}`);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Unbekannter Fehler");
        setStatus("error");
      }
    })();
  }, [router]);

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-[560px]">
        <div
          className="rounded-2xl p-10 text-center"
          style={{
            background: "rgba(20, 22, 28, 0.6)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(20px)",
          }}
        >
          {status === "working" && (
            <>
              <div className="text-[36px]">💾</div>
              <h1 className="mt-4 text-[22px] font-semibold text-white">
                Pack wird gespeichert…
              </h1>
              <p
                className="mt-2 text-[14px]"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                Wir hängen dein Probepaket an deinen frischen Account.
              </p>
            </>
          )}

          {status === "empty" && (
            <>
              <div className="text-[36px]">👋</div>
              <h1 className="mt-4 text-[22px] font-semibold text-white">
                Willkommen
              </h1>
              <p
                className="mt-2 text-[14px]"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                Wir haben kein offenes Paket zum Speichern gefunden — geh ins
                Dashboard und erstelle ein neues.
              </p>
              <a
                href="/dashboard"
                className="mt-5 inline-block rounded-full bg-white px-5 py-2.5 text-[14px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
              >
                Zum Dashboard →
              </a>
            </>
          )}

          {status === "error" && (
            <>
              <div className="text-[36px]">⚠️</div>
              <h1 className="mt-4 text-[22px] font-semibold text-white">
                Speichern fehlgeschlagen
              </h1>
              <p
                className="mt-2 text-[14px]"
                style={{ color: "rgba(255,200,120,0.85)" }}
              >
                {errorMsg ?? "Unbekannter Fehler"}
              </p>
              <a
                href="/dashboard"
                className="mt-5 inline-block rounded-full border border-white/20 px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-white/5"
              >
                Zum Dashboard
              </a>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
