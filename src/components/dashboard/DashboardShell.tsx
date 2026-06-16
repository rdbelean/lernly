"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LernlyLogo from "@/components/LernlyLogo";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import {
  Library,
  Plus,
  Settings,
  Menu,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
} from "lucide-react";
import { PrimaryCTALink } from "@/components/ui/PrimaryCTA";
import WelcomeModal from "@/components/dashboard/WelcomeModal";
import ProfileMenu from "@/components/dashboard/ProfileMenu";
import { PwaInstall } from "@/components/pwa/PwaInstall";

const COLLAPSE_KEY = "lernly:sidebar-collapsed";
const RECENT_PREVIEW = 3; // Zuletzt entries shown before "Mehr anzeigen".

type RecentPack = {
  id: string;
  title: string;
  exam_type: string;
};

type Props = {
  email: string;
  recentPacks: RecentPack[];
  name: string | null;
  hasSeenWelcome: boolean;
  children: React.ReactNode;
};

// =========================================================================
// DashboardShell — persistent app shell (desktop sidebar / mobile drawer)
// =========================================================================
// Minimal-nav pass: collapsible icon rail (persisted), a bottom ProfileMenu
// that folds away the secondary footer items + e-mail, and a trimmed "Zuletzt"
// list. lucide icons, --color-bg-deep surface, real <LernlyLogo>, no emojis.
// =========================================================================

function NavLink({
  href,
  active,
  icon: Icon,
  label,
  collapsed,
  onClick,
}: {
  href: string;
  active: boolean;
  icon: typeof Library;
  label: string;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={`group flex items-center gap-3 rounded-xl py-2.5 text-[14px] font-medium transition ${collapsed ? "justify-center px-0" : "px-3"} ${active ? "" : "hover:bg-white/[0.04] hover:text-white"}`}
      style={{
        background: active ? "var(--color-surface-2)" : undefined,
        color: active ? "var(--color-text)" : "var(--color-text-dim)",
      }}
    >
      <Icon
        size={18}
        strokeWidth={1.75}
        color={active ? "var(--color-primary-bright)" : "var(--color-text-faint)"}
        aria-hidden
        className="shrink-0"
      />
      {!collapsed && <span className="flex-1">{label}</span>}
    </Link>
  );
}

function RecentList({
  recentPacks,
  pathname,
  onClose,
}: {
  recentPacks: RecentPack[];
  pathname: string;
  onClose?: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? recentPacks : recentPacks.slice(0, RECENT_PREVIEW);
  const hidden = recentPacks.length - visible.length;

  return (
    <div className="mt-7">
      <p
        className="mb-2 px-3 text-[11px] uppercase tracking-[0.18em]"
        style={{ color: "var(--color-text-faint)" }}
      >
        Zuletzt
      </p>
      <div className="flex flex-col">
        {visible.map((p) => {
          const active = pathname === `/dashboard/pack/${p.id}`;
          return (
            <Link
              key={p.id}
              href={`/dashboard/pack/${p.id}`}
              onClick={onClose}
              className="group flex items-center gap-2.5 rounded-lg px-3 py-2 transition"
              style={{
                background: active ? "var(--color-surface-2)" : "transparent",
                color: active ? "var(--color-text)" : "var(--color-text-dim)",
              }}
            >
              <span
                aria-hidden
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: "var(--color-text-faint)" }}
              />
              <span className="flex-1 truncate text-[13px]">{p.title}</span>
            </Link>
          );
        })}
      </div>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-1 flex items-center gap-1 px-3 py-1.5 text-[12px] transition hover:text-white"
          style={{ color: "var(--color-text-faint)" }}
        >
          <ChevronDown size={13} strokeWidth={2} aria-hidden />
          Mehr anzeigen ({hidden})
        </button>
      )}
    </div>
  );
}

function SidebarContent({
  email,
  recentPacks,
  pathname,
  name,
  collapsed = false,
  collapsible = false,
  onToggleCollapse,
  onClose,
}: {
  email: string;
  recentPacks: RecentPack[];
  pathname: string;
  name: string | null;
  collapsed?: boolean;
  collapsible?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}) {
  const isLibrary = pathname === "/dashboard";
  const isSettings = pathname.startsWith("/dashboard/settings");

  return (
    <div className={`flex h-full flex-col py-5 ${collapsed ? "px-2" : "px-4"}`}>
      {/* Header: logo + collapse toggle */}
      <div className={`mb-7 flex items-center ${collapsed ? "flex-col gap-3" : "gap-2 px-3"}`}>
        <Link
          href="/dashboard"
          onClick={onClose}
          aria-label="Lernly"
          className="flex items-center gap-2"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "24px",
            fontWeight: 600,
            color: "var(--color-text)",
            letterSpacing: "-0.5px",
            lineHeight: 1,
          }}
        >
          <LernlyLogo size={collapsed ? 40 : 52} alt="" className="shrink-0" />
          {!collapsed && <span>Lernly</span>}
        </Link>
        {collapsible && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
            title={collapsed ? "Ausklappen" : "Einklappen"}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/[0.06] ${collapsed ? "" : "ml-auto"}`}
            style={{ color: "var(--color-text-faint)" }}
          >
            {collapsed ? (
              <ChevronsRight size={16} strokeWidth={2} aria-hidden />
            ) : (
              <ChevronsLeft size={16} strokeWidth={2} aria-hidden />
            )}
          </button>
        )}
      </div>

      <nav className="flex flex-col gap-1.5">
        <NavLink
          href="/dashboard"
          active={isLibrary}
          collapsed={collapsed}
          onClick={onClose}
          icon={Library}
          label="Bibliothek"
        />
        {collapsed ? (
          <Link
            href="/dashboard/new"
            onClick={onClose}
            title="Neues Paket"
            aria-label="Neues Paket"
            className="flex h-10 items-center justify-center rounded-xl text-white transition hover:opacity-90"
            style={{ background: "var(--color-primary)" }}
          >
            <Plus size={18} strokeWidth={2.2} aria-hidden />
          </Link>
        ) : (
          <PrimaryCTALink
            size="sm"
            href="/dashboard/new"
            onClick={onClose}
            leadingIcon={Plus}
            fullWidth
          >
            Neues Paket
          </PrimaryCTALink>
        )}
        <NavLink
          href="/dashboard/settings"
          active={isSettings}
          collapsed={collapsed}
          onClick={onClose}
          icon={Settings}
          label="Einstellungen"
        />
      </nav>

      {/* Zuletzt — hidden in the icon rail; trimmed to a short preview otherwise */}
      {!collapsed && recentPacks.length > 0 && (
        <RecentList recentPacks={recentPacks} pathname={pathname} onClose={onClose} />
      )}

      {/* Bottom: account popover (folds away settings/feedback/install/logout/email) */}
      <div className="mt-auto pt-6">
        <ProfileMenu
          email={email}
          name={name}
          collapsed={collapsed}
          onNavigate={onClose}
        />
      </div>
    </div>
  );
}

export default function DashboardShell({
  email,
  recentPacks,
  name,
  hasSeenWelcome,
  children,
}: Props) {
  const pathname = usePathname() ?? "/dashboard";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Restore persisted collapse state (client-only to avoid a hydration mismatch).
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

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
        className="hidden md:flex md:shrink-0 md:flex-col md:border-r"
        style={{
          width: collapsed ? "76px" : "260px",
          transition: "width 0.2s ease",
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
          name={name}
          collapsed={collapsed}
          collapsible
          onToggleCollapse={toggleCollapse}
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
            name={name}
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
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--color-text)",
            }}
          >
            <LernlyLogo size={22} alt="" className="shrink-0" />
            <span>Lernly</span>
          </Link>
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
      <WelcomeModal open={!hasSeenWelcome} initialName={name} />
      {/* Auto-show only once the welcome flow is done, so the two don't collide. */}
      <PwaInstall autoShow={hasSeenWelcome} />
    </div>
  );
}
