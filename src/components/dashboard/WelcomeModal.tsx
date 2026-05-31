"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { saveWelcome } from "@/app/dashboard/actions";
import { PROVIDER } from "@/lib/legal/provider";

// =========================================================================
// WelcomeModal — one-time greeting shown the first time a user reaches the
// dashboard after signup. Visibility is driven by users.has_seen_welcome
// (passed in as `open`); both submit AND dismiss persist the flag so it
// never shows twice. Modeled on QuotaHitModal's overlay/dialog pattern.
// =========================================================================

const FEEDBACK_HREF = `mailto:${PROVIDER.email}?subject=${encodeURIComponent(
  "Lernly Feedback",
)}`;

export default function WelcomeModal({
  open,
  initialName,
}: {
  open: boolean;
  initialName: string | null;
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(open);
  const [name, setName] = useState(initialName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the name field on open.
  useEffect(() => {
    if (visible) inputRef.current?.focus();
  }, [visible]);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!visible) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [visible]);

  if (!visible) return null;

  // `submittedName === null` → dismiss (don't change name, just flip flag).
  const persist = (submittedName: string | null) => {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await saveWelcome(submittedName);
      if (result.ok === false) {
        setError(result.error);
        return;
      }
      setVisible(false);
      router.refresh();
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") persist(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
    >
      <button
        aria-label="Schließen"
        onClick={() => persist(null)}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      />
      <div
        className="relative w-full max-w-[420px] overflow-hidden rounded-3xl border p-7 text-white"
        style={{
          background: "#141930",
          borderColor: "rgba(255,255,255,0.10)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
        }}
      >
        <div className="relative">
          {/* Real Lernly mark, free-standing (no tinted icon chip). */}
          <Image
            src="/lernly-mark.png"
            alt="Lernly"
            width={40}
            height={40}
            priority
            className="mb-5"
          />

          <h2
            id="welcome-title"
            className="mb-3 text-[24px] font-semibold leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.5px",
              color: "var(--color-text)",
            }}
          >
            Schön, dass du da bist.
          </h2>

          <p
            className="mb-6 text-[14px] leading-relaxed"
            style={{ color: "var(--color-text-dim)" }}
          >
            Lernly ist brandneu — du gehörst zu den Ersten. Das meiste läuft
            schon richtig gut, aber es kann sein, dass mal was hakt oder etwas
            länger lädt. Danke, dass du uns trotzdem vertraust.
          </p>

          <label
            htmlFor="welcome-name"
            className="mb-2 block text-[12px] font-medium"
            style={{ color: "var(--color-text)" }}
          >
            Wie sollen wir dich nennen?
          </label>
          <input
            id="welcome-name"
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                persist(name);
              }
            }}
            type="text"
            maxLength={80}
            placeholder="Dein Vorname"
            autoComplete="given-name"
            className="mb-5 w-full rounded-xl px-4 py-3 text-[15px] text-white outline-none transition focus:border-white/40"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          />

          <p
            className="mb-6 text-[12.5px] leading-relaxed"
            style={{ color: "var(--color-text-faint)" }}
          >
            Stört dich was oder hast du eine Idee?{" "}
            <a
              href={FEEDBACK_HREF}
              className="underline-offset-2 hover:underline"
              style={{ color: "var(--color-primary-bright)" }}
            >
              Schreib mir direkt
            </a>{" "}
            — ich antworte innerhalb von 24 Stunden.
          </p>

          {error && (
            <p
              className="mb-4 text-[12.5px]"
              style={{ color: "var(--color-cat-coral)" }}
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => persist(name)}
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--color-primary)" }}
          >
            {pending ? "Speichern…" : "Los geht's →"}
          </button>
        </div>
      </div>
    </div>
  );
}
