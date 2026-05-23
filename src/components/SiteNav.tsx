"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";

type Language = "en" | "de";

type Props = {
  onActivateUpload?: () => void;
  language?: Language;
  onLanguageChange?: (language: Language) => void;
};

const NAV_COPY: Record<
  Language,
  {
    features: string;
    how: string;
    pricing: string;
    create: string;
    toApp: string;
    signIn: string;
    apiKey: string;
    menu: string;
    languageLabel: string;
  }
> = {
  en: {
    features: "Features",
    how: "How it works",
    pricing: "Pricing",
    create: "Drop in slides →",
    toApp: "Open app →",
    signIn: "Sign in",
    apiKey: "Own API key",
    menu: "Menu",
    languageLabel: "Language",
  },
  de: {
    features: "Features",
    how: "So geht's",
    pricing: "Preise",
    create: "Folien reinwerfen →",
    toApp: "Zur App →",
    signIn: "Anmelden",
    apiKey: "Eigener API-Key",
    menu: "Menü",
    languageLabel: "Sprache",
  },
};

export default function SiteNav({
  onActivateUpload,
  language = "de",
  onLanguageChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const isLanding = Boolean(onActivateUpload);
  const prefix = isLanding ? "" : "/";
  const copy = NAV_COPY[language];

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setAuthLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const toggleLanguage = () => {
    if (!onLanguageChange) return;
    onLanguageChange(language === "de" ? "en" : "de");
  };

  const renderLanguageToggle = () =>
    onLanguageChange ? (
      <button
        type="button"
        onClick={toggleLanguage}
        aria-label={copy.languageLabel}
        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] transition hover:bg-white/10"
        style={{
          color: "rgba(255,255,255,0.75)",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <span>{language}</span>
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    ) : null;

  const renderUserPill = () =>
    user ? (
      <a
        href="/dashboard"
        className="flex items-center gap-2 transition hover:opacity-85"
        aria-label="Dashboard"
      >
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold"
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "white",
          }}
        >
          {(user.email?.[0] ?? "?").toUpperCase()}
        </span>
      </a>
    ) : null;

  // Single CTA: 'Folien reinwerfen' for unauthed, 'Zur App' for authed.
  const ctaLabel = user ? copy.toApp : copy.create;
  const ctaHref = user ? "/dashboard" : null;
  const ctaButton = onActivateUpload && !user;

  return (
    <nav
      className="sticky top-0 z-40 w-full"
      style={{
        background: "var(--color-ln-nav-bg)",
        backdropFilter: "saturate(1.8) blur(20px)",
        WebkitBackdropFilter: "saturate(1.8) blur(20px)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-[18px]">
        <a
          href="/"
          className="flex items-center gap-3 text-white"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "26px",
            fontWeight: 700,
            letterSpacing: "-0.9px",
            lineHeight: 1,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/lernly-symbol-transparent.svg"
            alt="Lernly logo"
            width={44}
            height={44}
          />
          <span>Lernly</span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          <a
            href={`${prefix}#features`}
            className="text-[14px] font-medium text-white transition hover:opacity-70"
          >
            {copy.features}
          </a>
          <a
            href={`${prefix}#how`}
            className="text-[14px] font-medium text-white transition hover:opacity-70"
          >
            {copy.how}
          </a>
          <a
            href={`${prefix}#pricing`}
            className="text-[14px] font-medium text-white transition hover:opacity-70"
          >
            {copy.pricing}
          </a>

          <span className="mx-1 h-5 w-px" style={{ background: "rgba(255,255,255,0.1)" }} />

          {renderLanguageToggle()}
          {authLoaded && renderUserPill()}

          {ctaButton ? (
            <button
              type="button"
              onClick={onActivateUpload}
              className="rounded-lg bg-white px-4 py-1.5 text-[14px] font-semibold text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
            >
              {ctaLabel}
            </button>
          ) : (
            <a
              href={ctaHref ?? "/login"}
              className="rounded-lg bg-white px-4 py-1.5 text-[14px] font-semibold text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
            >
              {ctaLabel}
            </a>
          )}
        </div>

        {/* Mobile: persistent CTA + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          {ctaButton ? (
            <button
              type="button"
              onClick={onActivateUpload}
              className="rounded-lg bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[color:var(--color-ln-bg-bot)]"
            >
              {ctaLabel}
            </button>
          ) : (
            <a
              href={ctaHref ?? "/login"}
              className="rounded-lg bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[color:var(--color-ln-bg-bot)]"
            >
              {ctaLabel}
            </a>
          )}
          <button
            aria-label={copy.menu}
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 px-6 py-5 md:hidden">
          <div className="flex flex-col gap-3">
            <a
              href={`${prefix}#features`}
              onClick={() => setOpen(false)}
              className="text-[15px] font-medium text-white"
            >
              {copy.features}
            </a>
            <a
              href={`${prefix}#how`}
              onClick={() => setOpen(false)}
              className="text-[15px] font-medium text-white"
            >
              {copy.how}
            </a>
            <a
              href={`${prefix}#pricing`}
              onClick={() => setOpen(false)}
              className="text-[15px] font-medium text-white"
            >
              {copy.pricing}
            </a>
            <a
              href={`${prefix}#connect`}
              onClick={() => setOpen(false)}
              className="text-[14px] font-normal"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              {copy.apiKey}
            </a>

            <div
              className="my-2 h-px w-full"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />

            {authLoaded &&
              (user ? (
                <a
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="text-[14px] font-medium"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {user.email}
                </a>
              ) : (
                <a
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="text-[14px] font-medium"
                  style={{ color: "rgba(255,255,255,0.75)" }}
                >
                  {copy.signIn}
                </a>
              ))}

            {onLanguageChange && (
              <div className="flex items-center justify-between">
                <span
                  className="text-[12px]"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {copy.languageLabel}
                </span>
                {renderLanguageToggle()}
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
