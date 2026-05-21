"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type RecentPack = {
  id: string;
  title: string;
  exam_type: string;
};

type Props = {
  email: string;
  recentPacks: RecentPack[];
  children: React.ReactNode;
};

const EXAM_EMOJI: Record<string, string> = {
  essay: "📝",
  multiple_choice: "✅",
  oral: "🎤",
  open_book: "📖",
};

function NavLink({
  href,
  active,
  icon,
  label,
  onClick,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition"
      style={{
        background: active ? "rgba(255,255,255,0.08)" : "transparent",
        color: active ? "white" : "rgba(255,255,255,0.65)",
      }}
    >
      <span
        className="flex h-5 w-5 items-center justify-center"
        style={{ color: active ? "white" : "rgba(255,255,255,0.55)" }}
      >
        {icon}
      </span>
      <span className="flex-1">{label}</span>
    </a>
  );
}

function RecentItem({
  pack,
  active,
  onClick,
}: {
  pack: RecentPack;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <a
      href={`/dashboard/pack/${pack.id}`}
      onClick={onClick}
      className="group flex items-center gap-2.5 rounded-lg px-3 py-2 transition"
      style={{
        background: active ? "rgba(255,255,255,0.08)" : "transparent",
        color: active ? "white" : "rgba(255,255,255,0.62)",
      }}
    >
      <span className="text-[14px] leading-none">
        {EXAM_EMOJI[pack.exam_type] ?? "📚"}
      </span>
      <span className="flex-1 truncate text-[13px]">{pack.title}</span>
    </a>
  );
}

function SidebarContent({
  email,
  recentPacks,
  pathname,
  onClose,
}: {
  email: string;
  recentPacks: RecentPack[];
  pathname: string;
  onClose?: () => void;
}) {
  const isLibrary = pathname === "/dashboard";
  const isNew = pathname.startsWith("/dashboard/new");
  const isSettings = pathname.startsWith("/dashboard/settings");

  return (
    <div className="flex h-full flex-col px-4 py-5">
      <a
        href="/dashboard"
        onClick={onClose}
        className="mb-7 flex items-center gap-2.5 px-3"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "20px",
          fontWeight: 700,
          color: "white",
          letterSpacing: "-0.6px",
          lineHeight: 1,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/lernly-symbol-transparent.svg"
          alt="Lernly"
          width={28}
          height={28}
        />
        <span>Lernly</span>
      </a>

      <nav className="flex flex-col gap-1">
        <NavLink
          href="/dashboard"
          active={isLibrary}
          onClick={onClose}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1.4" />
              <rect x="14" y="3" width="7" height="5" rx="1.4" />
              <rect x="14" y="12" width="7" height="9" rx="1.4" />
              <rect x="3" y="16" width="7" height="5" rx="1.4" />
            </svg>
          }
          label="Bibliothek"
        />
        <NavLink
          href="/dashboard/new"
          active={isNew}
          onClick={onClose}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
          label="Neues Paket"
        />
      </nav>

      {recentPacks.length > 0 && (
        <div className="mt-7">
          <p
            className="mb-2 px-3 text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "rgba(255,255,255,0.42)" }}
          >
            Zuletzt
          </p>
          <div className="flex flex-col">
            {recentPacks.map((p) => (
              <RecentItem
                key={p.id}
                pack={p}
                active={pathname === `/dashboard/pack/${p.id}`}
                onClick={onClose}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto pt-6">
        <NavLink
          href="/dashboard/settings"
          active={isSettings}
          onClick={onClose}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          }
          label="Einstellungen"
        />
        <div
          className="mt-3 truncate px-3 text-[11px]"
          style={{ color: "rgba(255,255,255,0.42)" }}
        >
          {email}
        </div>
        <form action="/auth/signout" method="post" className="mt-2 px-3">
          <button
            type="submit"
            className="text-[12px] transition hover:text-white"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Abmelden
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DashboardShell({ email, recentPacks, children }: Props) {
  const pathname = usePathname() ?? "/dashboard";
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer whenever the user navigates.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open on mobile.
  useEffect(() => {
    if (!drawerOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:w-[260px] md:shrink-0 md:flex-col md:border-r"
        style={{
          background: "rgba(8, 10, 22, 0.6)",
          borderColor: "rgba(255,255,255,0.08)",
          backdropFilter: "saturate(1.4) blur(20px)",
          WebkitBackdropFilter: "saturate(1.4) blur(20px)",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <SidebarContent
          email={email}
          recentPacks={recentPacks}
          pathname={pathname}
        />
      </aside>

      {/* Mobile drawer + backdrop */}
      <div
        aria-hidden={!drawerOpen}
        className={
          "fixed inset-0 z-50 transition md:hidden " +
          (drawerOpen ? "pointer-events-auto" : "pointer-events-none")
        }
      >
        <button
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
          tabIndex={drawerOpen ? 0 : -1}
          className={
            "absolute inset-0 transition " +
            (drawerOpen ? "opacity-100" : "opacity-0")
          }
          style={{ background: "rgba(0,0,0,0.6)" }}
        />
        <aside
          className={
            "absolute inset-y-0 left-0 w-[280px] max-w-[88vw] transition-transform " +
            (drawerOpen ? "translate-x-0" : "-translate-x-full")
          }
          style={{
            background: "rgba(8, 10, 22, 0.96)",
            borderRight: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "saturate(1.4) blur(24px)",
            WebkitBackdropFilter: "saturate(1.4) blur(24px)",
          }}
        >
          <SidebarContent
            email={email}
            recentPacks={recentPacks}
            pathname={pathname}
            onClose={() => setDrawerOpen(false)}
          />
        </aside>
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 md:hidden"
          style={{
            background: "rgba(8, 10, 22, 0.7)",
            borderColor: "rgba(255,255,255,0.08)",
            backdropFilter: "saturate(1.4) blur(20px)",
            WebkitBackdropFilter: "saturate(1.4) blur(20px)",
          }}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <a
            href="/dashboard"
            className="flex items-center gap-2 text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/lernly-symbol-transparent.svg"
              alt="Lernly"
              width={22}
              height={22}
            />
            <span>Lernly</span>
          </a>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
