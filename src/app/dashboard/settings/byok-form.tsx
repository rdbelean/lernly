"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BYOKForm({ keySetAt }: { keySetAt: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);

  const save = () => {
    if (!apiKey.trim().startsWith("sk-ant-")) {
      setMessage({
        kind: "err",
        text: "Key muss mit sk-ant- beginnen.",
      });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/byok/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: apiKey.trim() }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        setApiKey("");
        setMessage({
          kind: "ok",
          text: "Key gespeichert. Künftige Generierungen nutzen deinen Key.",
        });
        router.refresh();
      } catch (e) {
        setMessage({
          kind: "err",
          text: e instanceof Error ? e.message : "Unbekannter Fehler",
        });
      }
    });
  };

  const remove = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/byok/delete", { method: "POST" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        setConfirmingDelete(false);
        setMessage({ kind: "ok", text: "Key entfernt." });
        router.refresh();
      } catch (e) {
        setMessage({
          kind: "err",
          text: e instanceof Error ? e.message : "Unbekannter Fehler",
        });
      }
    });
  };

  return (
    <div>
      {keySetAt && (
        <div
          className="mb-5 flex items-center justify-between gap-3 rounded-xl px-4 py-3"
          style={{
            background: "rgba(111, 199, 227, 0.08)",
            border: "1px solid rgba(111, 199, 227, 0.35)",
          }}
        >
          <div className="text-[13px] text-white">
            <div className="font-medium">✓ Key aktiv</div>
            <div
              className="text-[11.5px]"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Hinzugefügt am {formatDate(keySetAt)}
            </div>
          </div>
          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="rounded-full px-3 py-1.5 text-[12.5px] font-medium text-white transition disabled:opacity-50"
                style={{
                  background: "rgba(217,119,87,0.18)",
                  border: "1px solid rgba(217,119,87,0.45)",
                }}
              >
                {pending ? "Lösche…" : "Wirklich entfernen"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={pending}
                className="text-[12.5px] text-white/55 transition hover:text-white"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="rounded-full border border-white/15 px-3 py-1.5 text-[12.5px] text-white/55 transition hover:border-[color:var(--color-ln-rose)]/40 hover:text-white"
            >
              Entfernen
            </button>
          )}
        </div>
      )}

      <label
        htmlFor="apiKey"
        className="block text-[12px] uppercase tracking-[0.18em]"
        style={{ color: "rgba(255,255,255,0.55)" }}
      >
        {keySetAt ? "Neuen Key eintragen (ersetzt den alten)" : "API-Key"}
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-..."
          autoComplete="off"
          className="flex-1 rounded-2xl px-4 py-3 text-[14px] text-white outline-none transition focus:border-white/40"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        />
        <button
          type="button"
          onClick={save}
          disabled={pending || apiKey.length < 8}
          className="rounded-full bg-white px-5 py-3 text-[14px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90 disabled:opacity-40"
        >
          {pending ? "Speichere…" : "Speichern & testen"}
        </button>
      </div>

      {message && (
        <p
          className="mt-4 text-[13px]"
          style={{
            color: message.kind === "ok" ? "#9BD8EB" : "#E8A88D",
          }}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
