type Language = "en" | "de";

const FOOTER_COPY: Record<
  Language,
  {
    legalNotice: string;
    privacy: string;
    contact: string;
  }
> = {
  en: {
    legalNotice: "Legal notice",
    privacy: "Privacy",
    contact: "Contact",
  },
  de: {
    legalNotice: "Impressum",
    privacy: "Datenschutz",
    contact: "Kontakt",
  },
};

export default function SiteFooter({ language = "en" }: { language?: Language }) {
  const copy = FOOTER_COPY[language];

  return (
    <footer className="border-t border-white/5 px-6 py-10">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 md:flex-row">
        <div
          className="flex items-center gap-2.5 text-white"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "16px",
            fontWeight: 600,
            letterSpacing: "-0.4px",
            lineHeight: 1,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lernly-symbol-transparent.svg" alt="Lernly logo" width={30} height={30} />
          <span>Lernly</span>
        </div>
        <div
          className="flex items-center gap-5 text-[13px]"
          style={{ color: "var(--color-ln-mute)" }}
        >
          <a href="/impressum" className="transition hover:text-white">
            {copy.legalNotice}
          </a>
          <a href="/datenschutz" className="transition hover:text-white">
            {copy.privacy}
          </a>
          <a
            href="mailto:kontakt@lernly-app.de"
            className="transition hover:text-white"
          >
            {copy.contact}
          </a>
          <a
            href="https://www.tiktok.com/@lernlyapp"
            aria-label="Lernly auf TikTok"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.83a8.16 8.16 0 0 0 4.77 1.52V6.92a4.83 4.83 0 0 1-1.84-.23z" />
            </svg>
          </a>
        </div>
        <div className="text-[12px]" style={{ color: "var(--color-ln-mute)" }}>
          © {new Date().getFullYear()} Lernly
        </div>
      </div>
    </footer>
  );
}
