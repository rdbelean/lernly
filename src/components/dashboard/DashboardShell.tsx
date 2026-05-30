"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import {
  Library,
  Plus,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
} from "lucide-react";
import { PrimaryCTALink } from "@/components/ui/PrimaryCTA";

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

// =========================================================================
// DashboardShell — persistent app shell (desktop sidebar / mobile drawer)
// =========================================================================
// UI #3 pass: lucide-react icons, --color-bg-deep sidebar surface,
// --color-surface-2 active-nav background, --color-primary filled CTA for
// "Neues Paket", status dots for recent packs (kills the per-exam emoji),
// SVG logo mark in /public.
// =========================================================================

function NavLink({
  href,
  active,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  active: boolean;
  icon: typeof Library;
  label: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition"
      style={{
        background: active ? "var(--color-surface-2)" : "transparent",
        color: active ? "var(--color-text)" : "var(--color-text-dim)",
      }}
    >
      <Icon
        size={18}
        strokeWidth={1.75}
        color={
          active ? "var(--color-primary-bright)" : "var(--color-text-faint)"
        }
        aria-hidden
      />
      <span className="flex-1">{label}</span>
    </a>
  );
}

function StatusDot({
  tone,
}: {
  tone: "done" | "in_progress" | "fresh";
}) {
  const color =
    tone === "done"
      ? "var(--color-cat-teal)"
      : tone === "in_progress"
        ? "var(--color-amber)"
        : "var(--color-text-faint)";
  return (
    <span
      aria-hidden
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: color }}
    />
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
  // V1 status heuristic: "fresh" if recent, can be enriched later via
  // quiz_attempts join. For now the dot reads as a neutral marker.
  return (
    <a
      href={`/dashboard/pack/${pack.id}`}
      onClick={onClick}
      className="group flex items-center gap-2.5 rounded-lg px-3 py-2 transition"
      style={{
        background: active ? "var(--color-surface-2)" : "transparent",
        color: active ? "var(--color-text)" : "var(--color-text-dim)",
      }}
    >
      <StatusDot tone="fresh" />
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
          fontWeight: 600,
          color: "var(--color-text)",
          letterSpacing: "-0.4px",
          lineHeight: 1,
        }}
      >
        <Image
          src="/lernly-mark.png"
          alt="Lernly"
          width={28}
          height={28}
          priority
          className="shrink-0"
        />
        <span>Lernly</span>
      </a>

      <nav className="flex flex-col gap-1.5">
        <NavLink
          href="/dashboard"
          active={isLibrary}
          onClick={onClose}
          icon={Library}
          label="Bibliothek"
        />
        <PrimaryCTALink
          size="sm"
          href="/dashboard/new"
          onClick={onClose}
          leadingIcon={Plus}
          fullWidth
        >
          Neues Paket
        </PrimaryCTALink>
      </nav>

      {recentPacks.length > 0 && (
        <div className="mt-7">
          <p
            className="mb-2 px-3 text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "var(--color-text-faint)" }}
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
          icon={Settings}
          label="Einstellungen"
        />
        <div
          className="mt-3 truncate px-3 text-[11px]"
          style={{ color: "var(--color-text-faint)" }}
        >
          {email}
        </div>
        <form action="/auth/signout" method="post" className="mt-2 px-3">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 text-[12px] transition hover:text-white"
            style={{ color: "var(--color-text-faint)" }}
          >
            <LogOut size={13} strokeWidth={1.75} aria-hidden />
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
          background: "var(--color-bg-deep)",
          borderColor: "var(--color-border, rgba(255,255,255,0.06))",
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
            background: "var(--color-bg-deep)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
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
            background: "var(--color-bg-deep)",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg transition"
            style={{
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
            }}
          >
            <Menu size={18} strokeWidth={1.9} aria-hidden />
          </button>
          <a
            href="/dashboard"
            className="flex items-center gap-2"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--color-text)",
            }}
          >
            <Image
              src="/lernly-mark.png"
              alt="Lernly"
              width={22}
              height={22}
              priority
              className="shrink-0"
            />
            <span>Lernly</span>
          </a>
          <ChevronRight
            size={14}
            strokeWidth={1.75}
            color="var(--color-text-faint)"
            aria-hidden
            className="hidden"
          />
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "var(--color-surface)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "var(--color-text)",
          },
        }}
      />
    </div>
  );
}
