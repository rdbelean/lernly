"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bug,
  Lightbulb,
  HelpCircle,
  Heart,
  X,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";

// FeedbackModal — small in-app intake form posting to /api/feedback (→ Notion).
// Self-contained: prefills the e-mail from the Supabase session when present,
// so it works from any trigger (ProfileMenu, PackHeader) without prop drilling.

type FeedbackType = "Bug" | "Idee" | "Frage" | "Lob";

const TYPES: { value: FeedbackType; label: string; icon: typeof Bug }[] = [
  { value: "Bug", label: "Bug", icon: Bug },
  { value: "Idee", label: "Idee", icon: Lightbulb },
  { value: "Frage", label: "Frage", icon: HelpCircle },
  { value: "Lob", label: "Lob", icon: Heart },
];

const FIELD =
  "w-full rounded-xl border px-3 py-2.5 text-[13.5px] outline-none transition focus:border-[#4B57D6]";
const fieldStyle = {
  background: "rgba(255,255,255,0.04)",
  borderColor: "rgba(255,255,255,0.10)",
  color: "var(--color-text, #EAEDF7)",
};

export default function FeedbackModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [typ, setTyp] = useState<FeedbackType>("Idee");
  const [nachricht, setNachricht] = useState("");
  const [email, setEmail] = useState("");
  const [person, setPerson] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const emailPrefilled = useRef(false);

  // Prefill e-mail/person from the Supabase session (best-effort, once).
  useEffect(() => {
    if (!open || emailPrefilled.current) return;
    emailPrefilled.current = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        const user = data.user;
        if (!user?.email) return;
        setEmail((prev) => prev || user.email!);
        setPerson(
          (user.user_metadata?.full_name as string | undefined) ??
            user.email!.split("@")[0],
        );
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nachricht.trim().length < 3 || state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          betreff: nachricht.trim().slice(0, 60),
          nachricht: nachricht.trim(),
          typ,
          email: email.trim() || undefined,
          person: person || undefined,
          quelle: "In-App",
          kontext: window.location.origin + window.location.pathname,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState("done");
      toast.success("Danke — ist angekommen.");
      setTimeout(() => {
        setNachricht("");
        setState("idle");
        onClose();
      }, 1400);
    } catch {
      setState("idle");
      toast.error(
        "Senden fehlgeschlagen. Versuch es nochmal oder schreib an info@lernly-app.de.",
      );
    }
  };

  // Portal to <body>: triggers may sit inside transformed ancestors (mobile
  // drawer), where position:fixed would otherwise anchor to the wrong box.
  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Feedback geben"
    >
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: "rgba(5,7,15,0.65)" }}
      />
      <div
        className="relative w-full max-w-[440px] rounded-2xl border p-5 shadow-2xl"
        style={{
          background: "var(--color-surface, #141930)",
          borderColor: "rgba(255,255,255,0.10)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              className="text-[17px] font-semibold"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-text, #EAEDF7)",
              }}
            >
              Feedback
            </h2>
            <p
              className="mt-0.5 text-[12.5px]"
              style={{ color: "var(--color-text-dim, #9098B6)" }}
            >
              Bug gefunden, Idee, Frage? Geht direkt an den Gründer.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="rounded-lg p-1.5 transition hover:bg-white/[0.06]"
            style={{ color: "var(--color-text-dim, #9098B6)" }}
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>

        {state === "done" ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <CheckCircle2
              size={32}
              strokeWidth={1.75}
              aria-hidden
              style={{ color: "rgb(94, 200, 142)" }}
            />
            <p
              className="text-[14px] font-medium"
              style={{ color: "var(--color-text, #EAEDF7)" }}
            >
              Danke — ist angekommen.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
            <div className="grid grid-cols-4 gap-1.5">
              {TYPES.map(({ value, label, icon: Icon }) => {
                const active = typ === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTyp(value)}
                    aria-pressed={active}
                    className="flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[11.5px] transition"
                    style={{
                      background: active
                        ? "rgba(43,52,153,0.35)"
                        : "rgba(255,255,255,0.03)",
                      borderColor: active
                        ? "rgba(107,118,229,0.55)"
                        : "rgba(255,255,255,0.08)",
                      color: active
                        ? "var(--color-text, #EAEDF7)"
                        : "var(--color-text-dim, #9098B6)",
                    }}
                  >
                    <Icon size={15} strokeWidth={1.85} aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>

            <textarea
              value={nachricht}
              onChange={(e) => setNachricht(e.target.value)}
              required
              minLength={3}
              maxLength={4000}
              rows={4}
              placeholder="Deine Nachricht…"
              className={FIELD + " resize-none"}
              style={fieldStyle}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-Mail für Rückfragen (optional)"
              className={FIELD}
              style={fieldStyle}
            />
            {/* Honeypot — hidden from real users, bots fill it. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            <button
              type="submit"
              disabled={state === "sending" || nachricht.trim().length < 3}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-medium text-white transition disabled:opacity-50"
              style={{ background: "#2B3499" }}
            >
              {state === "sending" && (
                <Loader2 size={15} className="animate-spin" aria-hidden />
              )}
              Absenden
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
