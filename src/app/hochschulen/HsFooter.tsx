import LernlyLogo from "@/components/LernlyLogo";

// Light footer for the B2B route. Deliberately NOT the shared SiteFooter:
// institutional buyers get LinkedIn + legal links, no student TikTok.
export default function HsFooter() {
  return (
    <footer className="border-t px-6 py-10" style={{ borderColor: "var(--hs-line)" }}>
      <div className="mx-auto max-w-[1140px]">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
          <div
            className="flex items-center gap-2.5"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "16px",
              fontWeight: 600,
              letterSpacing: "-0.4px",
              lineHeight: 1,
              color: "var(--hs-ink)",
            }}
          >
            <LernlyLogo size={30} alt="" />
            <span>Lernly</span>
            <span className="text-[12px] font-normal" style={{ color: "var(--hs-mute)" }}>
              für Hochschulen
            </span>
          </div>
          <a
            href="https://www.linkedin.com/company/lernly-app/"
            aria-label="Lernly auf LinkedIn"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-lg border transition hover:border-[color:var(--hs-accent)]"
            style={{ borderColor: "var(--hs-line)", color: "var(--hs-mute)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
            </svg>
          </a>
        </div>

        <div className="my-6 h-px w-full" style={{ background: "var(--hs-line)" }} />

        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px]"
            style={{ color: "var(--hs-mute)" }}
          >
            <a href="/impressum" className="transition hover:text-[color:var(--hs-ink)]">
              Impressum
            </a>
            <a href="/datenschutz" className="transition hover:text-[color:var(--hs-ink)]">
              Datenschutz
            </a>
            <a href="/agb" className="transition hover:text-[color:var(--hs-ink)]">
              AGB
            </a>
            <a
              href="mailto:info@lernly-app.de"
              className="transition hover:text-[color:var(--hs-ink)]"
            >
              Kontakt
            </a>
            <a href="/" className="transition hover:text-[color:var(--hs-ink)]">
              Für Studierende
            </a>
          </div>
          <div className="text-[12px]" style={{ color: "var(--hs-mute)" }}>
            © {new Date().getFullYear()} Lernly · Ein Tool von{" "}
            <a
              href="https://belerate.de"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 transition hover:underline"
            >
              Belerate
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
