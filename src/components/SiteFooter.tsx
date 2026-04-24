export default function SiteFooter() {
  return (
    <footer className="border-t border-white/5 px-6 py-10">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lernly-icon-nav.svg" alt="Lernly logo" width={20} height={20} />
          <span>Lernly</span>
        </div>
        <div
          className="flex items-center gap-5 text-[13px]"
          style={{ color: "var(--color-ln-mute)" }}
        >
          <a href="/impressum" className="transition hover:text-white">
            Impressum
          </a>
          <a href="/datenschutz" className="transition hover:text-white">
            Datenschutz
          </a>
          {/* TODO: Replace # with the real LinkedIn URL */}
          <a
            href="#"
            aria-label="LinkedIn"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.602 0 4.268 2.37 4.268 5.455v6.288zM5.337 7.433c-1.144 0-2.07-.926-2.07-2.068 0-1.143.926-2.069 2.07-2.069 1.142 0 2.068.926 2.068 2.069 0 1.142-.926 2.068-2.068 2.068zm1.777 13.019H3.558V9h3.556v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
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
