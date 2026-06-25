import LernlyLogo from "@/components/LernlyLogo";

type Language = "en" | "de";

const FOOTER_COPY: Record<
  Language,
  {
    legalNotice: string;
    privacy: string;
    terms: string;
    contact: string;
    madeBy: string;
  }
> = {
  en: {
    legalNotice: "Legal notice",
    privacy: "Privacy",
    terms: "Terms",
    contact: "Contact",
    madeBy: "A tool by",
  },
  de: {
    legalNotice: "Impressum",
    privacy: "Datenschutz",
    terms: "AGB",
    contact: "Kontakt",
    madeBy: "Ein Tool von",
  },
};

export default function SiteFooter({ language = "de" }: { language?: Language }) {
  const copy = FOOTER_COPY[language];

  const socialIconClass =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-white/8 transition hover:border-white/20 hover:text-white";

  return (
    <footer className="border-t border-white/5 px-6 py-10">
      <div className="mx-auto max-w-[1200px]">
        {/* Top row: brand + socials */}
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
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
            <LernlyLogo size={30} alt="" />
            <span>Lernly</span>
          </div>
          <div
            className="flex items-center gap-2.5"
            style={{ color: "var(--color-ln-mute)" }}
          >
            <a
              href="https://www.tiktok.com/@lernlyapp"
              aria-label="Lernly auf TikTok"
              target="_blank"
              rel="noopener noreferrer"
              className={socialIconClass}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.83a8.16 8.16 0 0 0 4.77 1.52V6.92a4.83 4.83 0 0 1-1.84-.23z" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/company/lernly-app/"
              aria-label="Lernly auf LinkedIn"
              target="_blank"
              rel="noopener noreferrer"
              className={socialIconClass}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="my-6 h-px w-full bg-white/5" />

        {/* Bottom row: legal links + copyright */}
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px]"
            style={{ color: "var(--color-ln-mute)" }}
          >
            <a href="/impressum" className="transition hover:text-white">
              {copy.legalNotice}
            </a>
            <a href="/datenschutz" className="transition hover:text-white">
              {copy.privacy}
            </a>
            <a href="/agb" className="transition hover:text-white">
              {copy.terms}
            </a>
            <a
              href="mailto:info@lernly-app.de"
              className="transition hover:text-white"
            >
              {copy.contact}
            </a>
          </div>
          <div className="text-[12px]" style={{ color: "var(--color-ln-mute)" }}>
            © {new Date().getFullYear()} Lernly
          </div>
        </div>

        {/* Maker credit — Lernly is a product of the Belerate studio (distinct brand). */}
        <div
          className="mt-7 text-center text-[12px]"
          style={{ color: "var(--color-ln-mute)" }}
        >
          {copy.madeBy}{" "}
          <a
            href="https://belerate.de"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline-offset-2 transition hover:text-white hover:underline"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            Belerate
          </a>
        </div>
      </div>
    </footer>
  );
}
