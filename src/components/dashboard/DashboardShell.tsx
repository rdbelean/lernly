"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import LernlyLogo from "@/components/LernlyLogo";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Toaster, toast } from "sonner";
import {
  Plus,
  Settings,
  Menu,
  ChevronsLeft,
  ChevronsRight,
  GraduationCap,
  Trash2,
  Loader2,
} from "lucide-react";
import { PrimaryCTALink } from "@/components/ui/PrimaryCTA";
import WelcomeModal from "@/components/dashboard/WelcomeModal";
import ProfileMenu from "@/components/dashboard/ProfileMenu";
import { PwaInstall } from "@/components/pwa/PwaInstall";

const COLLAPSE_KEY = "lernly:sidebar-collapsed";

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
  dueCount: number;
  children: React.ReactNode;
};

// =========================================================================
// DashboardShell — persistent app shell (desktop sidebar / mobile drawer)
// =========================================================================

function NavLink({
  href,
  active,
  icon: Icon,
  label,
  collapsed,
  onClick,
  badge,
}: {
  href: string;
  active: boolean;
  icon: typeof GraduationCap;
  label: string;
  collapsed?: boolean;
  onClick?: () => void;
  badge?: number;
}) {
  const hasBadge = typeof badge === "number" && badge > 0;
  const ariaLabel = hasBadge
    ? `${label}, ${badge} fällig`
    : collapsed
      ? label
      : undefined;
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-label={ariaLabel}
      className={`group relative flex items-center gap-3 rounded-xl py-2.5 text-[14px] font-medium transition ${collapsed ? "justify-center px-0" : "px-3"} ${active ? "" : "hover:bg-[color:var(--color-ink-a06)] hover:text-[color:var(--color-text)]"}`}
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
      {hasBadge &&
        (collapsed ? (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full ring-2"
            style={{
              background: "var(--color-primary-bright)",
              ["--tw-ring-color" as string]: "var(--color-bg-deep)",
            }}
          />
        ) : (
          <span
            aria-hidden
            className="ml-auto min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[12px] font-semibold leading-none"
            style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ))}
    </Link>
  );
}

function CoursesListInner({
  recentPacks,
  pathname,
  onClose,
}: {
  recentPacks: RecentPack[];
  pathname: string;
  onClose?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCourseId = searchParams?.get("course") ?? null;

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Record<string, true>>({});

  const visiblePacks = recentPacks.filter((p) => !deletedIds[p.id]);

  const handleDelete = async (pack: RecentPack) => {
    setDeletingId(pack.id);
    try {
      const res = await fetch(`/api/trainer/courses/${pack.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Kurs konnte nicht gelöscht werden.");
        return;
      }
      setDeletedIds((prev) => ({ ...prev, [pack.id]: true }));
      toast.success(`„${pack.title}“ gelöscht`);
      if (
        activeCourseId === pack.id ||
        pathname === `/dashboard/pack/${pack.id}`
      ) {
        router.push("/dashboard");
      }
      router.refresh();
    } catch {
      toast.error("Kurs konnte nicht gelöscht werden.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-7">
      <p
        className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.06em]"
        style={{ color: "var(--color-text-faint)" }}
      >
        Meine Kurse
      </p>

      {visiblePacks.length === 0 ? (
        <p
          className="px-3 text-[12.5px] leading-relaxed"
          style={{ color: "var(--color-text-faint)" }}
        >
          Noch keine Kurse gespeichert.
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {visiblePacks.map((p) => {
            const active =
              activeCourseId === p.id || pathname === `/dashboard/pack/${p.id}`;
            const isDeleting = deletingId === p.id;
            return (
              <div
                key={p.id}
                className="group flex items-center gap-1 rounded-lg pr-1 transition"
                style={{
                  background: active ? "var(--color-surface-2)" : "transparent",
                }}
              >
                <Link
                  href={`/dashboard?course=${p.id}`}
                  onClick={onClose}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2 transition"
                  style={{
                    color: active ? "var(--color-text)" : "var(--color-text-dim)",
                  }}
                >
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{
                      background: active
                        ? "var(--color-primary-bright)"
                        : "var(--color-text-faint)",
                    }}
                  />
                  <span className="flex-1 truncate text-[13px]">{p.title}</span>
                </Link>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => void handleDelete(p)}
                  aria-label={`${p.title} löschen`}
                  title="Kurs löschen"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-60 transition hover:bg-[color:var(--color-err-bg)] hover:text-[color:var(--color-err-ink)] hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  {isDeleting ? (
                    <Loader2 size={13} className="animate-spin" aria-hidden />
                  ) : (
                    <Trash2 size={13} strokeWidth={1.85} aria-hidden />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CoursesList({
  recentPacks,
  pathname,
  onClose,
}: {
  recentPacks: RecentPack[];
  pathname: string;
  onClose?: () => void;
}) {
  return (
    <Suspense fallback={null}>
      <CoursesListInner
        recentPacks={recentPacks}
        pathname={pathname}
        onClose={onClose}
      />
    </Suspense>
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
  dueCount: number;
  collapsed?: boolean;
  collapsible?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}) {
  const isTrainer =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/trainer");
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
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-[color:var(--color-ink-a06)] ${collapsed ? "" : "ml-auto"}`}
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

      <nav className="flex flex-col gap-2">
        {collapsed ? (
          <Link
            href="/dashboard?upload=1#upload"
            onClick={onClose}
            title="Kurs aus Claude laden"
            aria-label="Kurs aus Claude laden"
            className="flex h-10 items-center justify-center rounded-xl text-on-primary transition hover:opacity-90"
            style={{ background: "var(--color-primary)" }}
          >
            <Plus size={18} strokeWidth={2.2} aria-hidden />
          </Link>
        ) : (
          <PrimaryCTALink
            size="sm"
            href="/dashboard?upload=1#upload"
            onClick={onClose}
            leadingIcon={Plus}
            fullWidth
          >
            Kurs aus Claude laden
          </PrimaryCTALink>
        )}

        <NavLink
          href="/dashboard"
          active={isTrainer}
          collapsed={collapsed}
          onClick={onClose}
          icon={GraduationCap}
          label="Klausur-Trainer"
        />

        <NavLink
          href="/dashboard/settings"
          active={isSettings}
          collapsed={collapsed}
          onClick={onClose}
          icon={Settings}
          label="Einstellungen"
        />
      </nav>

      {/* Meine Kurse — persistent MCP & HTML courses */}
      {!collapsed && (
        <CoursesList
          recentPacks={recentPacks}
          pathname={pathname}
          onClose={onClose}
        />
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
  dueCount,
  children,
}: Props) {
  const pathname = usePathname() ?? "/dashboard";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Restore persisted collapse state (client-only to avoid a hydration mismatch).
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(id);
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
    const id = setTimeout(() => setDrawerOpen(false), 0);
    return () => clearTimeout(id);
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
          borderColor: "var(--color-border, var(--color-ink-a06))",
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
          dueCount={dueCount}
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
          style={{ background: "var(--color-scrim)" }}
        />
        <aside
          className={
            "absolute inset-y-0 left-0 w-[280px] max-w-[88vw] transition-transform " +
            (drawerOpen ? "translate-x-0" : "-translate-x-full")
          }
          style={{
            background: "var(--color-bg-deep)",
            borderRight: "1px solid var(--color-ink-a06)",
          }}
        >
          <SidebarContent
            email={email}
            recentPacks={recentPacks}
            pathname={pathname}
            name={name}
            dueCount={dueCount}
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
            borderColor: "var(--color-ink-a06)",
          }}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={dueCount > 0 ? `Menü öffnen, ${dueCount} Karten fällig` : "Open menu"}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg transition"
            style={{
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
            }}
          >
            <Menu size={18} strokeWidth={1.9} aria-hidden />
            {dueCount > 0 && (
              <span
                aria-hidden
                className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ring-2"
                style={{
                  background: "var(--color-primary-bright)",
                  ["--tw-ring-color" as string]: "var(--color-bg-deep)",
                }}
              />
            )}
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
            border: "1px solid var(--color-ink-a10)",
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
