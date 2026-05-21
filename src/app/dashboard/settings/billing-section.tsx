"use client";

import { useState, useTransition } from "react";
import { track } from "@/lib/analytics";

type Plan = "pro" | "team" | "pro_byok" | "team_byok";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function BillingSection({
  plan,
  planLabel,
  periodEnd,
  hasStripeCustomer,
  billingConfigured,
}: {
  plan: string;
  planLabel: string;
  periodEnd: string | null;
  hasStripeCustomer: boolean;
  billingConfigured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const startCheckout = (target: Plan) => {
    setError(null);
    track("checkout_started", { plan: target });
    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: target }),
        });
        const json = await res.json();
        if (!res.ok || !json.url) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        window.location.href = json.url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      }
    });
  };

  const openPortal = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/portal", { method: "POST" });
        const json = await res.json();
        if (!res.ok || !json.url) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        window.location.href = json.url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      }
    });
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[14px]" style={{ color: "rgba(255,255,255,0.6)" }}>
          Aktueller Plan:
        </span>
        <span className="text-[18px] font-semibold text-white">{planLabel}</span>
        {periodEnd && (
          <span
            className="text-[12.5px]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            · läuft bis {formatDate(periodEnd)}
          </span>
        )}
      </div>

      {!billingConfigured && (
        <div
          className="mb-5 rounded-xl px-4 py-3 text-[13px]"
          style={{
            background: "rgba(255,200,120,0.08)",
            border: "1px solid rgba(255,200,120,0.3)",
            color: "rgba(255,220,170,0.9)",
          }}
        >
          Abrechnung ist noch nicht konfiguriert. Sobald die Stripe-Keys in
          den Server-Variablen liegen, kannst du hier upgraden.
        </div>
      )}

      {plan === "free" && (
        <>
          <p
            className="mb-3 text-[13px]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Mehr Pakete pro Monat:
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={!billingConfigured || pending}
              onClick={() => startCheckout("pro")}
              className="rounded-2xl px-5 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: "rgba(111, 199, 227, 0.08)",
                border: "1px solid rgba(111, 199, 227, 0.4)",
              }}
            >
              <div className="text-[15px] font-semibold text-white">
                Pro · 14,99 € / Monat
              </div>
              <div
                className="text-[12.5px]"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                25 Pakete pro Monat
              </div>
            </button>
            <button
              type="button"
              disabled={!billingConfigured || pending}
              onClick={() => startCheckout("team")}
              className="rounded-2xl px-5 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: "rgba(20, 22, 28, 0.45)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <div className="text-[15px] font-semibold text-white">
                Team · 24,99 € / Monat
              </div>
              <div
                className="text-[12.5px]"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                60 Pakete pro Monat
              </div>
            </button>
          </div>
        </>
      )}

      {plan !== "free" && hasStripeCustomer && (
        <button
          type="button"
          onClick={openPortal}
          disabled={!billingConfigured || pending}
          className="rounded-full px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-white/15 disabled:opacity-40"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          {pending ? "…" : "Abo verwalten"}
        </button>
      )}

      {error && (
        <p
          className="mt-4 text-[13px]"
          style={{ color: "#E8A88D" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
