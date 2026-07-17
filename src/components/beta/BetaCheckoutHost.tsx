"use client";

import { useEffect, useRef, useState } from "react";
import { Wrench, X } from "lucide-react";
import {
  BETA_CHECKOUT_BODY,
  BETA_CHECKOUT_TITLE,
  onBetaCheckoutOpen,
  type BetaPlan,
} from "@/lib/betaGate";

// Single global modal, mounted once in the root layout. Any buy button calls
// openBetaCheckout(plan); this shows the "in beta" curtain with a founder
// password field. On the correct password the server returns the Stripe URL
// and we redirect; a wrong password keeps the curtain up.
export default function BetaCheckoutHost() {
  const [plan, setPlan] = useState<BetaPlan | null>(null);
  const [pw, setPw] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () =>
      onBetaCheckoutOpen((p) => {
        setPlan(p);
        setPw("");
        setError(null);
        setTimeout(() => inputRef.current?.focus(), 50);
      }),
    [],
  );

  useEffect(() => {
    if (!plan) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlan(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [plan]);

  if (!plan) return null;

  const close = () => {
    if (pending) return;
    setPlan(null);
  };

  const submit = async () => {
    if (pending || pw.length === 0) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, betaPassword: pw }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
        reason?: string;
      };
      if (res.ok && json.url) {
        window.location.href = json.url;
        return;
      }
      setError(
        json.reason === "beta_locked"
          ? "Falsches Passwort."
          : (json.error ?? "Etwas ist schiefgelaufen — bitte erneut versuchen."),
      );
    } catch {
      setError("Verbindung fehlgeschlagen — bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="beta-checkout-title"
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
    >
      <button
        aria-label="Schließen"
        onClick={close}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.68)" }}
      />
      <div
        className="relative w-full max-w-[440px] overflow-hidden rounded-3xl border p-7 text-white"
        style={{
          background: "rgba(20, 22, 28, 0.96)",
          borderColor: "rgba(255,255,255,0.14)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
        }}
      >
        <button
          type="button"
          aria-label="Schließen"
          onClick={close}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/[0.06]"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <X size={17} strokeWidth={2} aria-hidden />
        </button>

        <span
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: "rgba(242,163,60,0.14)" }}
        >
          <Wrench size={22} strokeWidth={1.9} style={{ color: "#F2A33C" }} />
        </span>

        <h2
          id="beta-checkout-title"
          className="mt-4 text-[22px] font-bold tracking-[-0.4px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {BETA_CHECKOUT_TITLE}
        </h2>
        <p
          className="mt-2 text-[14px] leading-relaxed"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          {BETA_CHECKOUT_BODY}
        </p>

        <div className="mt-5">
          <label
            htmlFor="beta-pw"
            className="text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Team-Zugang
          </label>
          <input
            ref={inputRef}
            id="beta-pw"
            type="password"
            value={pw}
            autoComplete="off"
            placeholder="Passwort"
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="mt-1.5 w-full rounded-2xl px-4 py-3 text-[15px] text-white outline-none transition focus:border-white/40"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.16)",
            }}
          />
          {error && (
            <p className="mt-2 text-[13px]" style={{ color: "#F2845C" }}>
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={pending || pw.length === 0}
            className="mt-3 w-full rounded-full px-5 py-3 text-[15px] font-semibold text-white transition disabled:opacity-50"
            style={{ background: "var(--color-primary, #2B3499)" }}
          >
            {pending ? "Einen Moment…" : "Weiter"}
          </button>
        </div>
      </div>
    </div>
  );
}
