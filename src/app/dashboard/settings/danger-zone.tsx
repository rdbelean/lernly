"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Download, Trash2 } from "lucide-react";
import { deleteAccount } from "./actions";

// DSGVO panel: data export (Art. 20) + account deletion (Art. 17).
// Deletion is two-step: clicking "Konto löschen" reveals a confirmation
// input that requires typing the exact email to enable the destructive
// submit. Belt-and-braces against muscle-memory clicks.

export default function DangerZone({ email }: { email: string }) {
  const [confirming, setConfirming] = useState(false);
  const [typedEmail, setTypedEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onExport = () => {
    // Triggers the GET route directly — the Content-Disposition header
    // makes the browser save the file rather than navigate to it.
    window.location.href = "/api/account/export";
  };

  const onDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        await deleteAccount();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Löschung fehlgeschlagen.");
      }
    });
  };

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onExport}
        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition hover:text-white"
        style={{
          borderColor: "rgba(255,255,255,0.10)",
          color: "var(--color-text-dim)",
        }}
      >
        <Download size={13} strokeWidth={2} aria-hidden />
        Meine Daten exportieren (JSON)
      </button>

      <div
        className="rounded-xl border p-4"
        style={{
          background: "rgba(242, 132, 92, 0.06)",
          borderColor: "rgba(242, 132, 92, 0.25)",
        }}
      >
        <div
          className="mb-2 inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: "var(--color-cat-coral)" }}
        >
          <AlertTriangle size={13} strokeWidth={2.2} aria-hidden />
          Konto löschen
        </div>
        <p
          className="text-[13px] leading-relaxed"
          style={{ color: "var(--color-text-dim)" }}
        >
          Alle deine Pakete, Klausuren, Quiz-Versuche und Tutor-Verläufe
          werden unwiderruflich gelöscht. Ein aktives Abo wird gekündigt
          (kein anteiliger Refund). Dieser Schritt kann nicht rückgängig
          gemacht werden.
        </p>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition hover:brightness-110"
            style={{
              background: "var(--color-cat-coral)",
              color: "white",
            }}
          >
            <Trash2 size={13} strokeWidth={2} aria-hidden />
            Konto endgültig löschen
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <label
              className="block text-[12.5px]"
              style={{ color: "var(--color-text-dim)" }}
            >
              Zur Bestätigung tippe deine E-Mail-Adresse{" "}
              <code
                className="rounded px-1 py-0.5"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--color-text)",
                }}
              >
                {email}
              </code>
              :
            </label>
            <input
              type="email"
              value={typedEmail}
              onChange={(e) => setTypedEmail(e.target.value)}
              autoFocus
              placeholder={email}
              className="w-full rounded-xl border px-3 py-2 text-[14px] outline-none"
              style={{
                background: "var(--color-surface-2)",
                borderColor: "rgba(255,255,255,0.10)",
                color: "var(--color-text)",
              }}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onDelete}
                disabled={pending || typedEmail.trim() !== email}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: "var(--color-cat-coral)",
                  color: "white",
                }}
              >
                <Trash2 size={13} strokeWidth={2} aria-hidden />
                {pending ? "Lösche…" : "Endgültig löschen"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setTypedEmail("");
                  setError(null);
                }}
                disabled={pending}
                className="rounded-full border px-4 py-2 text-[13px] font-semibold transition hover:text-white disabled:opacity-50"
                style={{
                  borderColor: "rgba(255,255,255,0.10)",
                  color: "var(--color-text-dim)",
                }}
              >
                Abbrechen
              </button>
            </div>
            {error && (
              <p
                className="text-[12.5px]"
                style={{ color: "var(--color-cat-coral)" }}
              >
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
