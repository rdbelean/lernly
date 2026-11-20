"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronDown, ChevronUp, ShieldCheck, X } from "lucide-react";
import {
  getConsentSnapshot,
  getServerConsentSnapshot,
  OPEN_COOKIE_SETTINGS_EVENT,
  setCookieConsent,
  subscribeConsentStore,
} from "@/lib/consent";

const subscribeNoop = () => () => {};

export default function CookieConsentBanner() {
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const savedConsent = useSyncExternalStore(
    subscribeConsentStore,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const onOpenSettings = () => {
      setShowDetails(true);
      setManualOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
    return () => {
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpenSettings);
    };
  }, []);

  const open = isClient && (manualOpen ?? savedConsent === null);
  if (!open) return null;

  const choose = (analytics: boolean) => {
    setCookieConsent(analytics);
    setManualOpen(false);
  };

  return (
    <div
      role="region"
      aria-label="Cookie-Einstellungen"
      className="fixed bottom-4 right-4 left-4 z-50 sm:left-auto sm:max-w-[440px]"
    >
      <div
        className="rounded-2xl border p-5"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-line)",
          boxShadow: "var(--shadow-pop)",
          color: "var(--color-text)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck
              size={18}
              strokeWidth={1.9}
              style={{ color: "var(--color-primary)" }}
              aria-hidden
            />
            <h2 className="text-[14.5px] font-semibold leading-snug">
              Datenschutz &amp; Cookies
            </h2>
          </div>

          {savedConsent !== null && (
            <button
              type="button"
              onClick={() => setManualOpen(false)}
              aria-label="Cookie-Einstellungen schließen"
              className="rounded-lg p-1 transition hover:bg-[color:var(--color-surface-2)]"
              style={{ color: "var(--color-text-dim)" }}
            >
              <X size={16} strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>

        <p
          className="mt-2.5 text-[13px] leading-relaxed"
          style={{ color: "var(--color-text-dim)" }}
        >
          Wir verwenden technisch notwendige Cookies für Login und Sicherheit.
          Optionale Produktanalyse (PostHog) starten wir erst nach deiner
          Einwilligung gemäß § 25 TDDDG / DSGVO — ohne Marketing- oder
          Werbe-Tracker.
        </p>

        {savedConsent !== null && (
          <p
            className="mt-2 text-[12px] font-medium"
            style={{ color: "var(--color-text-faint)" }}
          >
            Aktuelle Auswahl:{" "}
            {savedConsent.analytics
              ? "Alle akzeptiert (inkl. anonymer Analyse)"
              : "Nur notwendige Cookies"}
          </p>
        )}

        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-medium underline-offset-2 hover:underline"
          style={{ color: "var(--color-primary)" }}
        >
          {showDetails ? (
            <>
              Details ausblenden
              <ChevronUp size={14} strokeWidth={2} aria-hidden />
            </>
          ) : (
            <>
              Details &amp; Dienste anzeigen
              <ChevronDown size={14} strokeWidth={2} aria-hidden />
            </>
          )}
        </button>

        {showDetails && (
          <div
            className="mt-3 space-y-2.5 rounded-xl border p-3 text-[12px] leading-relaxed"
            style={{
              background: "var(--color-surface-2)",
              borderColor: "var(--color-line)",
              color: "var(--color-text-dim)",
            }}
          >
            <div>
              <p
                className="font-semibold"
                style={{ color: "var(--color-text)" }}
              >
                Technisch notwendig (immer aktiv)
              </p>
              <p>
                Session-Cookies (Supabase Auth), Bot-Schutz (Cloudflare
                Turnstile) sowie lokale Speicherung deiner Lern- und
                Consent-Auswahl.
              </p>
            </div>
            <div>
              <p
                className="font-semibold"
                style={{ color: "var(--color-text)" }}
              >
                Statistik &amp; Produktverbesserung (optional)
              </p>
              <p>
                PostHog misst Seitenaufrufe und Lern-Meilensteine erst nach
                aktiver Zustimmung. Jederzeit im Footer unter
                „Cookie-Einstellungen“ widerrufbar.
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => choose(false)}
            className="flex-1 rounded-full border px-4 py-2 text-[13px] font-semibold transition hover:brightness-95"
            style={{
              background: "var(--color-surface-2)",
              borderColor: "var(--color-ink-a14)",
              color: "var(--color-text)",
            }}
          >
            Nur notwendige
          </button>
          <button
            type="button"
            onClick={() => choose(true)}
            className="flex-1 rounded-full px-4 py-2 text-[13px] font-semibold transition hover:brightness-95"
            style={{
              background: "var(--color-primary)",
              color: "var(--color-on-primary)",
            }}
          >
            Alle akzeptieren
          </button>
        </div>

        <div
          className="mt-3 flex items-center justify-between text-[11.5px]"
          style={{ color: "var(--color-text-faint)" }}
        >
          <Link href="/datenschutz" className="underline-offset-2 hover:underline">
            Datenschutzerklärung
          </Link>
          <Link href="/impressum" className="underline-offset-2 hover:underline">
            Impressum
          </Link>
        </div>
      </div>
    </div>
  );
}
