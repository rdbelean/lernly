"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { PrimaryCTAButton } from "@/components/ui/PrimaryCTA";

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
            background: "rgba(79, 209, 165, 0.08)",
            border: "1px solid rgba(79, 209, 165, 0.3)",
          }}
        >
          <div
            className="text-[13px]"
            style={{ color: "var(--color-text)" }}
          >
            <div className="inline-flex items-center gap-1.5 font-semibold">
              <Check
                size={13}
                strokeWidth={2.2}
                color="var(--color-cat-teal)"
                aria-hidden
              />
              Key aktiv
            </div>
            <div
              className="text-[11.5px]"
              style={{ color: "var(--color-text-dim)" }}
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
                className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition hover:brightness-110 disabled:opacity-50"
                style={{
                  background: "var(--color-cat-coral)",
                  color: "white",
                }}
              >
                {pending ? "Lösche…" : "Wirklich entfernen"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={pending}
                className="text-[12.5px] transition hover:text-white"
                style={{ color: "var(--color-text-dim)" }}
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="rounded-full border px-3 py-1.5 text-[12.5px] transition hover:text-white"
              style={{
                borderColor: "rgba(255,255,255,0.10)",
                color: "var(--color-text-dim)",
              }}
            >
              Entfernen
            </button>
          )}
        </div>
      )}

      <label
        htmlFor="apiKey"
        className="block text-[12px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--color-text-faint)" }}
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
          className="flex-1 rounded-xl px-4 py-3 text-[14px] outline-none transition focus:border-white/40"
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "var(--color-text)",
          }}
        />
        <PrimaryCTAButton
          size="md"
          onClick={save}
          disabled={pending || apiKey.length < 8}
        >
          {pending ? "Speichere…" : "Speichern & testen"}
        </PrimaryCTAButton>
      </div>

      {message && (
        <p
          className="mt-4 text-[13px]"
          style={{
            color:
              message.kind === "ok"
                ? "var(--color-cat-teal)"
                : "var(--color-cat-coral)",
          }}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
