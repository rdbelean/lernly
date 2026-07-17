"use client";

import { useState, useTransition } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { track } from "@/lib/analytics";
import { PrimaryCTAButton } from "@/components/ui/PrimaryCTA";
import { BETA_CHECKOUT_LOCKED, openBetaCheckout } from "@/lib/betaGate";

type CheckoutPlan = "einzelklausur" | "semester" | "monthly";

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

  // Active recurring subscription → self-service via the Stripe portal.
  const isSubscription = plan === "semester" || plan === "monthly";

  const startCheckout = (target: CheckoutPlan) => {
    if (BETA_CHECKOUT_LOCKED) {
      openBetaCheckout(target);
      return;
    }
    setError(null);
    track("checkout_started", { plan: target, source: "settings_billing" });
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className="text-[12px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--color-text-faint)" }}
        >
          Aktueller Plan
        </span>
        <span
          className="text-[16px] font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          {planLabel}
        </span>
        {periodEnd && (
          <span
            className="text-[12.5px]"
            style={{ color: "var(--color-text-dim)" }}
          >
            · {isSubscription ? "verlängert sich" : "läuft bis"}{" "}
            {formatDate(periodEnd)}
          </span>
        )}
      </div>

      {!billingConfigured && (
        <div
          className="rounded-xl px-4 py-3 text-[13px]"
          style={{
            background: "rgba(242, 163, 60, 0.08)",
            border: "1px solid rgba(242, 163, 60, 0.25)",
            color: "rgba(255,220,170,0.95)",
          }}
        >
          Abrechnung ist noch nicht konfiguriert. Sobald die Stripe-Keys in
          den Server-Variablen liegen, kannst du hier upgraden.
        </div>
      )}

      {!isSubscription && (
        <>
          <p
            className="text-[13px]"
            style={{ color: "var(--color-text-dim)" }}
          >
            {plan === "einzelklausur"
              ? "Mehr als eine Klausur? Sichere dir das ganze Semester:"
              : "Mehr Pakete — wähl, was passt:"}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Semester — hero / best value, first slot. */}
            <button
              type="button"
              disabled={!billingConfigured || pending}
              onClick={() => startCheckout("semester")}
              className="rounded-2xl px-5 py-4 text-left transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: "rgba(110, 128, 242, 0.10)",
                border: "1px solid var(--color-primary-bright)",
              }}
            >
              <div
                className="text-[15px] font-semibold"
                style={{
                  color: "var(--color-text)",
                  fontFamily: "var(--font-display)",
                }}
              >
                Semester · 29,99 €
              </div>
              <div
                className="text-[12.5px]"
                style={{ color: "var(--color-text-dim)" }}
              >
                Beste Wahl · 60 Pakete/Monat · 6 Monate
              </div>
            </button>
            {/* Monatlich. */}
            <button
              type="button"
              disabled={!billingConfigured || pending}
              onClick={() => startCheckout("monthly")}
              className="rounded-2xl px-5 py-4 text-left transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div
                className="text-[15px] font-semibold"
                style={{
                  color: "var(--color-text)",
                  fontFamily: "var(--font-display)",
                }}
              >
                Monatlich · 8,99 €
              </div>
              <div
                className="text-[12.5px]"
                style={{ color: "var(--color-text-dim)" }}
              >
                50 Pakete/Monat · monatlich kündbar
              </div>
            </button>
            {/* Einzelklausur — one-time. */}
            <button
              type="button"
              disabled={!billingConfigured || pending}
              onClick={() => startCheckout("einzelklausur")}
              className="rounded-2xl px-5 py-4 text-left transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div
                className="text-[15px] font-semibold"
                style={{
                  color: "var(--color-text)",
                  fontFamily: "var(--font-display)",
                }}
              >
                Einzelklausur · 4,99 €
              </div>
              <div
                className="text-[12.5px]"
                style={{ color: "var(--color-text-dim)" }}
              >
                5 Pakete · 14 Tage · einmalig
              </div>
            </button>
          </div>
        </>
      )}

      {isSubscription && hasStripeCustomer && (
        <div className="space-y-2">
          <PrimaryCTAButton
            size="sm"
            onClick={openPortal}
            disabled={!billingConfigured || pending}
            trailingIconName="arrow-right"
          >
            {pending ? "Öffne Portal…" : "Abo verwalten"}
          </PrimaryCTAButton>
          <p
            className="inline-flex items-center gap-1.5 text-[12px]"
            style={{ color: "var(--color-text-faint)" }}
          >
            <ExternalLink size={11} strokeWidth={1.75} aria-hidden />
            Kündigen, Plan wechseln, Zahlungsmethode ändern, Rechnungen
            herunterladen — alles im Stripe-Kundenportal.
          </p>
        </div>
      )}

      {/* Non-sub users with an existing stripe_customer_id (one-time buyers or
          downgraded subscribers) still get a portal link for old invoices. */}
      {!isSubscription && hasStripeCustomer && billingConfigured && (
        <button
          type="button"
          onClick={openPortal}
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-[12.5px] underline-offset-2 hover:underline disabled:opacity-50"
          style={{ color: "var(--color-text-dim)" }}
        >
          Alte Rechnungen ansehen
          <ArrowRight size={11} strokeWidth={1.75} aria-hidden />
        </button>
      )}

      {error && (
        <p className="text-[13px]" style={{ color: "var(--color-cat-coral)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
