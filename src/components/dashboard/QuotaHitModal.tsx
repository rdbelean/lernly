"use client";

import { useState } from "react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

export type QuotaHitDetails = {
  used: number;
  limit: number;
  plan: string;
};

type Props = {
  details: QuotaHitDetails;
  onClose: () => void;
};

async function startCheckout(plan: "einzelklausur" | "semester" | "monthly") {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const json = await res.json();
  if (!res.ok || !json.url) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
  window.location.href = json.url;
}

export default function QuotaHitModal({ details, onClose }: Props) {
  const [pending, setPending] = useState<string | null>(null);

  const launch = (plan: "einzelklausur" | "semester" | "monthly") => {
    if (pending) return;
    setPending(plan);
    track("checkout_started", { plan, source: "quota_hit_modal" });
    startCheckout(plan).catch((e) => {
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
            Limit erreicht
          </p>
          <h2
            className="mb-3 text-balance text-[26px] font-bold leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.6px",
            }}
          >
            {details.used} / {details.limit} Pakete genutzt
          </h2>
          <p
            className="mb-6 text-[14px] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Nur diese eine Klausur? Hol dir Einzelklausur. Lernst du das ganze
            Semester durch, ist Semester der günstigste Weg.
          </p>

          {/* Einzelklausur — one-time, the low-commitment entry. */}
          <button
            type="button"
            onClick={() => launch("einzelklausur")}
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
                Einzelklausur · 4,99 €
              </div>
              <div
                className="mt-0.5 text-[12.5px]"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                5 Pakete · 14 Tage · einmalig, kein Abo
              </div>
            </div>
            <div className="text-[18px] opacity-70">
              {pending === "einzelklausur" ? "…" : "→"}
            </div>
          </button>

          {/* Semester — the hero / best value. */}
          <button
            type="button"
            onClick={() => launch("semester")}
            disabled={Boolean(pending)}
            className="flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition hover:border-white/30 disabled:opacity-50"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >
            <div>
              <div className="text-[15px] font-semibold">
                Semester · 29,99 €
              </div>
              <div
                className="mt-0.5 text-[12px]"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                Das ganze Semester, 60 Pakete/Monat — 6× Einzelklausur = 30 €.
              </div>
            </div>
            <div className="text-[16px] opacity-50">
              {pending === "semester" ? "…" : "→"}
            </div>
          </button>

          <p
            className="mt-5 text-center text-[12px]"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Lieber monatlich kündbar?{" "}
            <button
              type="button"
              onClick={() => launch("monthly")}
              disabled={Boolean(pending)}
              className="underline-offset-2 hover:underline disabled:opacity-50"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              Monatlich für 8,99 € / Monat
            </button>
          </p>

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
