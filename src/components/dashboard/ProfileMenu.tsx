"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Settings, LogOut, ChevronUp, LifeBuoy } from "lucide-react";
import FeedbackModal from "@/components/FeedbackModal";
import { PwaInstallEntry } from "@/components/pwa/PwaInstall";

// ProfileMenu — bottom-of-sidebar account control. Replaces the old open stack
// of footer items (Einstellungen / Feedback / App installieren / Abmelden /
// e-mail). Avatar (+ name when expanded) opens a popover holding everything
// secondary one click deeper; the e-mail is shown quietly inside, never as a
// standalone sidebar row. Logout stays the exact same /auth/signout form POST.

const ROW =
  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition hover:bg-white/[0.05]";

function initials(name: string | null, email: string): string {
  const n = name?.trim();
  if (n) {
    const parts = n.split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return (email.trim()[0] ?? "?").toUpperCase();
}

export default function ProfileMenu({
  email,
  name,
  collapsed = false,
  onNavigate,
}: {
  email: string;
  name: string | null;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const displayName = name?.trim() || email.split("@")[0];
  const closeAfter = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <div ref={ref} className="relative">
      {open && (
        <div
          className={
            "absolute z-20 w-60 rounded-xl border p-1.5 shadow-xl " +
            (collapsed ? "bottom-0 left-full ml-2" : "bottom-full left-0 right-0 mb-2")
          }
          style={{
            background: "var(--color-surface)",
            borderColor: "rgba(255,255,255,0.10)",
          }}
        >
          {/* E-mail — quiet, informational, not a tap target */}
          <div
            className="truncate px-2.5 py-1.5 text-[11.5px]"
            style={{ color: "var(--color-text-faint)" }}
            title={email}
          >
            {email}
          </div>
          <div className="my-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />

          <Link
            href="/dashboard/settings"
            onClick={closeAfter}
            className={ROW}
            style={{ color: "var(--color-text-dim)" }}
          >
            <Settings size={15} strokeWidth={1.85} aria-hidden />
            Konto
          </Link>
          {/* Modal state lives on ProfileMenu (not inside the popover), so
              closing the popover doesn't unmount an open feedback modal. */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setFeedbackOpen(true);
            }}
            className={ROW}
            style={{ color: "var(--color-text-dim)" }}
          >
            <LifeBuoy size={15} strokeWidth={1.85} aria-hidden />
            Feedback / Problem melden
          </button>
          <PwaInstallEntry className={ROW} />
          <form action="/auth/signout" method="post">
            <button type="submit" className={ROW} style={{ color: "var(--color-text-dim)" }}>
              <LogOut size={15} strokeWidth={1.85} aria-hidden />
              Abmelden
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={collapsed ? displayName : undefined}
        className={
          "flex w-full items-center gap-2.5 rounded-xl py-2 transition hover:bg-white/[0.04] " +
          (collapsed ? "justify-center px-0" : "px-2")
        }
      >
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#2B3499,#4B57D6)" }}
        >
          {initials(name, email)}
        </span>
        {!collapsed && (
          <>
            <span
              className="min-w-0 flex-1 truncate text-left text-[13px] font-medium"
              style={{ color: "var(--color-text)" }}
            >
              {displayName}
            </span>
            <ChevronUp
              size={15}
              strokeWidth={2}
              aria-hidden
              className="shrink-0"
              style={{
                color: "var(--color-text-faint)",
                transform: open ? "rotate(180deg)" : undefined,
                transition: "transform 0.15s",
              }}
            />
          </>
        )}
      </button>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
