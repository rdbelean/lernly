"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";

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
          className="rounded-2xl border p-10 text-center"
          style={{
            background: "#141930",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          {status === "working" && (
            <>
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: "rgba(43,52,153,0.20)", color: "#9aa6ff" }}
              >
                <Loader2 size={22} strokeWidth={2} aria-hidden className="animate-spin" />
              </div>
              <h1 className="mt-4 text-[22px] font-semibold text-white">
                Pack wird gespeichert…
              </h1>
              <p
                className="mt-2 text-[14px]"
                style={{ color: "var(--color-text-dim, #9098B6)" }}
              >
                Wir hängen dein Probepaket an deinen frischen Account.
              </p>
            </>
          )}

          {status === "empty" && (
            <>
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: "rgba(43,52,153,0.20)", color: "#9aa6ff" }}
              >
                <Sparkles size={22} strokeWidth={2} aria-hidden />
              </div>
              <h1 className="mt-4 text-[22px] font-semibold text-white">
                Willkommen
              </h1>
              <p
                className="mt-2 text-[14px]"
                style={{ color: "var(--color-text-dim, #9098B6)" }}
              >
                Wir haben kein offenes Paket zum Speichern gefunden — geh ins
                Dashboard und erstelle ein neues.
              </p>
              <Link
                href="/dashboard"
                className="mt-5 inline-block rounded-xl px-5 py-2.5 text-[14px] font-semibold text-white transition hover:opacity-90"
                style={{ background: "#2B3499" }}
              >
                Zum Dashboard
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: "rgba(244,114,98,0.16)", color: "#f47262" }}
              >
                <AlertTriangle size={22} strokeWidth={2} aria-hidden />
              </div>
              <h1 className="mt-4 text-[22px] font-semibold text-white">
                Speichern fehlgeschlagen
              </h1>
              <p
                className="mt-2 text-[14px]"
                style={{ color: "rgba(255,200,120,0.85)" }}
              >
                {errorMsg ?? "Unbekannter Fehler"}
              </p>
              <Link
                href="/dashboard"
                className="mt-5 inline-block rounded-xl border px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.14)" }}
              >
                Zum Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
