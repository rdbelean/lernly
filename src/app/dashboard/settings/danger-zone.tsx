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
        try {
          const explicitKeys = [
            "lernly.trainer.bundle.v1",
            "lernly.trainer.progress.v1",
            "lernly.study.course.v1",
            "lernly.study.progress.v1",
          ];
          for (const k of explicitKeys) {
            window.localStorage.removeItem(k);
          }
          for (const k of Object.keys(window.localStorage)) {
            if (
              k.startsWith("lernly.") ||
              k.startsWith("lernly:") ||
              k.startsWith("ph_")
            ) {
              window.localStorage.removeItem(k);
            }
          }
        } catch {
          // Ignore private-mode storage exceptions; server deletion still runs.
        }
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
        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition hover:text-[color:var(--color-text)]"
        style={{
          borderColor: "var(--color-ink-a10)",
          color: "var(--color-text-dim)",
        }}
      >
        <Download size={13} strokeWidth={2} aria-hidden />
        Meine Daten exportieren (JSON)
      </button>

      <div
        className="rounded-xl border p-4"
        style={{
          background: "var(--color-err-bg)",
          borderColor: "var(--color-err-bg)",
        }}
      >
        <div
          className="mb-2 inline-flex items-center gap-2 text-[13px] font-semibold"
          style={{ color: "var(--color-cat-coral)" }}
        >
          <AlertTriangle size={13} strokeWidth={2.2} aria-hidden />
          Account &amp; alle Lerndaten endgültig löschen
        </div>
        <p
          className="text-[13px] leading-relaxed"
          style={{ color: "var(--color-text-dim)" }}
        >
          Gemäß Art. 17 DSGVO werden alle deine Kontodaten, Kurse, Pakete,
          Klausuren, hochgeladenen Dateien, Quiz-Versuche und Tutor-Verläufe
          unwiderruflich gelöscht (auch lokal im Browser). Ein aktives Abo wird
          beendet. Dieser Schritt kann nicht rückgängig gemacht werden.
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
            Account &amp; alle Lerndaten endgültig löschen
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
                  background: "var(--color-ink-a04)",
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
                borderColor: "var(--color-ink-a10)",
                color: "var(--color-text)",
              }}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onDelete}
                disabled={
                  pending ||
                  typedEmail.trim().toLowerCase() !== email.trim().toLowerCase()
                }
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
                className="rounded-full border px-4 py-2 text-[13px] font-semibold transition hover:text-[color:var(--color-text)] disabled:opacity-50"
                style={{
                  borderColor: "var(--color-ink-a10)",
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
