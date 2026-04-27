"use client";

import { useState } from "react";
import ClaudeLogo from "@/components/ClaudeLogo";

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
    connect: string;
    create: string;
    menu: string;
    languageLabel: string;
  }
> = {
  en: {
    features: "Features",
    how: "How it works",
    connect: "Connect Claude",
    create: "Create pack →",
    menu: "Menu",
    languageLabel: "Language",
  },
  de: {
    features: "Features",
    how: "So geht's",
    connect: "Claude verbinden",
    create: "Paket erstellen →",
    menu: "Menü",
    languageLabel: "Sprache",
  },
};

export default function SiteNav({
  onActivateUpload,
  language = "en",
  onLanguageChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const isLanding = Boolean(onActivateUpload);
  const prefix = isLanding ? "" : "/";
  const copy = NAV_COPY[language];

  const renderLanguageToggle = () =>
    onLanguageChange ? (
      <div
        className="ln-language-toggle"
        role="group"
        aria-label={copy.languageLabel}
      >
        {(["en", "de"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={language === option}
            onClick={() => onLanguageChange(option)}
            className={language === option ? "is-active" : ""}
          >
            {option.toUpperCase()}
          </button>
        ))}
      </div>
    ) : null;

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
          <img src="/lernly-symbol-transparent.svg" alt="Lernly logo" width={44} height={44} />
          <span>Lernly</span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
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
          <a href={`${prefix}#connect`} className="nav-claude">
            <ClaudeLogo size={14} />
            {copy.connect}
          </a>
          {renderLanguageToggle()}
          {onActivateUpload ? (
            <button
              type="button"
              onClick={onActivateUpload}
              className="rounded-lg bg-white px-4 py-1.5 text-[14px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
            >
              {copy.create}
            </button>
          ) : (
            <a
              href="/#upload"
              className="rounded-lg bg-white px-4 py-1.5 text-[14px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
            >
              {copy.create}
            </a>
          )}
        </div>

        <button
          aria-label={copy.menu}
          onClick={() => setOpen((v) => !v)}
          className="text-white md:hidden"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <a
              href={`${prefix}#features`}
              onClick={() => setOpen(false)}
              className="text-[14px] font-medium text-white"
            >
              {copy.features}
            </a>
            <a
              href={`${prefix}#how`}
              onClick={() => setOpen(false)}
              className="text-[14px] font-medium text-white"
            >
              {copy.how}
            </a>
            <a
              href={`${prefix}#connect`}
              onClick={() => setOpen(false)}
              className="nav-claude"
            >
              <ClaudeLogo size={14} />
              {copy.connect}
            </a>
            {renderLanguageToggle()}
            {onActivateUpload ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onActivateUpload();
                }}
                className="rounded-lg bg-white px-4 py-2 text-center text-[14px] font-medium text-[color:var(--color-ln-bg-bot)]"
              >
                {copy.create}
              </button>
            ) : (
              <a
                href="/#upload"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-white px-4 py-2 text-center text-[14px] font-medium text-[color:var(--color-ln-bg-bot)]"
              >
                {copy.create}
              </a>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
