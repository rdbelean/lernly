"use client";

import { useState } from "react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

export type QuotaHitDetails = {
  used: number;
  limit: number;
  plan: "free" | "pro" | "team" | string;
};

type Props = {
  details: QuotaHitDetails;
  onClose: () => void;
};

async function startCreditCheckout(
  credit: "sprint" | "payg" | "payg_pro",
): Promise<void> {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credit }),
  });
  const json = await res.json();
  if (!res.ok || !json.url) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
  window.location.href = json.url;
}

export default function QuotaHitModal({ details, onClose }: Props) {
  const [pending, setPending] = useState<string | null>(null);
  const isProTier = details.plan === "pro" || details.plan === "team";
  const paygCredit = isProTier ? "payg_pro" : "payg";
  const paygPrice = isProTier ? "2,49 €" : "2,99 €";

  const launch = (credit: "sprint" | "payg" | "payg_pro") => {
    if (pending) return;
    setPending(credit);
    track("checkout_started", { plan: credit, source: "quota_hit_modal" });
    startCreditCheckout(credit).catch((e) => {
      toast.error(e instanceof Error ? e.message : "Checkout fehlgeschlagen");
      setPending(null);
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
    >
      <button
        aria-label="Schließen"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.65)" }}
      />
      <div
        className="relative w-full max-w-[460px] overflow-hidden rounded-3xl border p-7 text-white"
        style={{
          background: "rgba(20, 22, 28, 0.95)",
          borderColor: "rgba(255,255,255,0.14)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
        }}
      >
        <div
          aria-hidden
          className="absolute -top-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.45) 0%, transparent 70%)",
          }}
        />
        <div className="relative">
          <p
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Monatslimit erreicht
          </p>
          <h2
            className="mb-3 text-balance text-[26px] font-bold leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.6px",
            }}
          >
            {details.used} / {details.limit} Pakete diesen Monat
          </h2>
          <p
            className="mb-6 text-[14px] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            {isProTier
              ? "Du hast dein Pro-Limit ausgenutzt. Hol dir Extra-Pakete für die heiße Klausurphase — oder lade dein Limit nächsten Monat automatisch wieder auf."
              : "Brauchst du mehr Pakete diesen Monat? Sprint deckt eine ganze Klausurwoche ab, oder du holst dir ein einzelnes Pack."}
          </p>

          {!isProTier && (
            <button
              type="button"
              onClick={() => launch("sprint")}
              disabled={Boolean(pending)}
              className="mb-3 flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition hover:border-white/30 disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.12))",
                borderColor: "rgba(255,255,255,0.18)",
              }}
            >
              <div>
                <div className="text-[16px] font-semibold">
                  ✦ Sprint · 4,99 €
                </div>
                <div
                  className="mt-0.5 text-[12.5px]"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  5 Pakete · 7 Tage gültig · einmalig zahlen
                </div>
              </div>
              <div className="text-[18px] opacity-70">
                {pending === "sprint" ? "…" : "→"}
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={() => launch(paygCredit)}
            disabled={Boolean(pending)}
            className="flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition hover:border-white/30 disabled:opacity-50"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >
            <div>
              <div className="text-[15px] font-semibold">
                Einzelnes Paket · {paygPrice}
              </div>
              <div
                className="mt-0.5 text-[12px]"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                {isProTier
                  ? "Pro-Rabatt: 2,49 € statt 2,99 €."
                  : "Genau dieses eine Paket. Kein Abo."}
              </div>
            </div>
            <div className="text-[16px] opacity-50">
              {pending === paygCredit ? "…" : "→"}
            </div>
          </button>

          {!isProTier && (
            <p
              className="mt-5 text-center text-[12px]"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Lernst du das ganze Semester durch?{" "}
              <a
                href="/dashboard/settings"
                className="underline-offset-2 hover:underline"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                Pro für 14,99 € / Monat
              </a>
            </p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full text-[12px] transition hover:text-white"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Später
          </button>
        </div>
      </div>
    </div>
  );
}
