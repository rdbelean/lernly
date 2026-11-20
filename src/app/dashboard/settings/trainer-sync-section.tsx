"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";

export default function TrainerSyncSection({
  syncToken,
}: {
  syncToken: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(syncToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setRevealed(true);
    }
  };

  return (
    <div>
      <p
        className="mb-4 text-[13.5px]"
        style={{ color: "var(--color-text-dim)" }}
      >
        Gib diesen Sync-Token in Claude Desktop an (oder lege ihn in den
        Connector-Einstellungen hinter), damit Claude deinen fertigen Kurs
        direkt mit <code className="font-mono">lernly_sync_web_course</code> in
        dein Dashboard auf <span className="font-medium">lernly-app.de</span>{" "}
        überträgt.
      </p>

      <label
        htmlFor="trainer-sync-token"
        className="block text-[12px] font-semibold"
        style={{ color: "var(--color-text-faint)" }}
      >
        Persönlicher Web-Sync-Token
      </label>

      <div className="mt-2 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            id="trainer-sync-token"
            type={revealed ? "text" : "password"}
            value={syncToken}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-xl px-4 py-3 pr-11 font-mono text-[13px] outline-none"
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-ink-a10)",
              color: "var(--color-text)",
            }}
          />
          <button
            type="button"
            onClick={() => setRevealed((prev) => !prev)}
            aria-label={revealed ? "Token verbergen" : "Token anzeigen"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition hover:opacity-80"
            style={{ color: "var(--color-text-dim)" }}
          >
            {revealed ? (
              <EyeOff size={16} strokeWidth={1.75} aria-hidden />
            ) : (
              <Eye size={16} strokeWidth={1.75} aria-hidden />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-semibold transition hover:opacity-90"
          style={{
            borderColor: copied
              ? "var(--color-cat-teal)"
              : "var(--color-ink-a14)",
            background: copied
              ? "var(--color-ok-bg)"
              : "var(--color-surface-2)",
            color: copied ? "var(--color-cat-teal)" : "var(--color-text)",
          }}
        >
          {copied ? (
            <>
              <Check size={15} strokeWidth={2.2} aria-hidden />
              Kopiert
            </>
          ) : (
            <>
              <Copy size={15} strokeWidth={1.75} aria-hidden />
              Token kopieren
            </>
          )}
        </button>
      </div>

      <p
        className="mt-3 text-[12px]"
        style={{ color: "var(--color-text-faint)" }}
      >
        Der Token gehört ausschließlich zu deinem Account. Alternativ kannst du
        weiterhin jederzeit <code className="font-mono">Lernly-Trainer.html</code>{" "}
        oder deinen <code className="font-mono">_lernly</code>-Ordner im
        Dashboard hochladen.
      </p>
    </div>
  );
}
