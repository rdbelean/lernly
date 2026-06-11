"use client";

import { useEffect, useState } from "react";
import LernlyLogo from "@/components/LernlyLogo";
import {
  X,
  Zap,
  KeyRound,
  Share,
  MoreHorizontal,
  SquarePlus,
  Check,
  Download,
} from "lucide-react";

// Minimal type for the (non-standard) Chrome/Android install event.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const SEEN_KEY = "lernly:pwa-prompt-seen";
export const PWA_OPEN_EVENT = "lernly:open-pwa";

// Capture beforeinstallprompt at module load — it can fire before React mounts.
// Stored module-level so both the modal and the sidebar entry can use it.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("lernly:pwa-installable"));
  });
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  );
}

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /android|iphone|ipad|ipod/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  );
}

function Benefit({
  icon: Icon,
  title,
  sub,
}: {
  icon: typeof Zap;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "rgba(43,52,153,0.20)", color: "#9aa6ff" }}
      >
        <Icon size={17} strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-white">{title}</div>
        <div
          className="text-[13px] leading-snug"
          style={{ color: "var(--color-text-dim, #9098B6)" }}
        >
          {sub}
        </div>
      </div>
    </div>
  );
}

function IosStep({ n, icon: Icon, text }: { n: number; icon: typeof Share; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
        style={{ background: "rgba(255,255,255,0.10)" }}
      >
        {n}
      </span>
      <Icon size={16} strokeWidth={2} aria-hidden className="shrink-0 text-white/70" />
      <span className="text-[13px] text-white/85">{text}</span>
    </li>
  );
}

/**
 * Auto-shows the install prompt once on mobile after login (when the welcome
 * flow is done), and re-opens on demand via the PWA_OPEN_EVENT. Renders nothing
 * when the app is already installed (standalone) or on desktop.
 */
export function PwaInstall({ autoShow = true }: { autoShow?: boolean }) {
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(true); // assume installed until checked (avoids flash)
  const [canPrompt, setCanPrompt] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    setInstalled(false);
    setIos(isIOS());
    setCanPrompt(Boolean(deferredPrompt));

    const onInstallable = () => setCanPrompt(true);
    const onOpen = () => setOpen(true);
    window.addEventListener("lernly:pwa-installable", onInstallable);
    window.addEventListener(PWA_OPEN_EVENT, onOpen);

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (autoShow && isMobile() && !localStorage.getItem(SEEN_KEY)) {
        // Small delay so it doesn't collide with the welcome flow / first paint.
        timer = setTimeout(() => {
          setOpen(true);
          try {
            localStorage.setItem(SEEN_KEY, "1");
          } catch {
            /* ignore */
          }
        }, 1400);
      }
    } catch {
      /* localStorage blocked — skip auto-show */
    }

    return () => {
      window.removeEventListener("lernly:pwa-installable", onInstallable);
      window.removeEventListener(PWA_OPEN_EVENT, onOpen);
      if (timer) clearTimeout(timer);
    };
  }, [autoShow]);

  // Lock scroll while open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (installed || !open) return null;

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      /* user dismissed / unsupported */
    }
    deferredPrompt = null;
    setCanPrompt(false);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      className="fixed inset-0 z-[140] flex items-end justify-center px-4 pb-4 pt-6 sm:items-center sm:pb-6"
    >
      <button
        aria-label="Schließen"
        onClick={() => setOpen(false)}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      />
      <div
        className="relative w-full max-w-[420px] overflow-hidden rounded-3xl border p-6 text-white sm:p-7"
        style={{
          background: "#141930",
          borderColor: "rgba(255,255,255,0.10)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
        }}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Schließen"
          className="absolute right-4 top-4 inline-flex text-white/50 transition hover:text-white"
        >
          <X size={18} strokeWidth={2} aria-hidden />
        </button>

        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <LernlyLogo size={32} alt="" />
          </div>
          <div className="min-w-0">
            <h3
              id="pwa-install-title"
              className="text-[19px] font-semibold leading-tight"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.4px" }}
            >
              Lernly installieren
            </h3>
            <p className="text-[13px]" style={{ color: "var(--color-text-dim, #9098B6)" }}>
              Für die beste Experience
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3.5">
          <Benefit
            icon={Zap}
            title="Schnellerer Zugriff"
            sub="Direkt vom Home-Bildschirm"
          />
          <Benefit
            icon={KeyRound}
            title="Bleibt eingeloggt"
            sub="Dauerhafte Session"
          />
        </div>

        {canPrompt ? (
          // Android / Chrome — real native install prompt.
          <button
            onClick={handleNativeInstall}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90"
            style={{ background: "#2B3499" }}
          >
            <Download size={16} strokeWidth={2} aria-hidden />
            Installieren
          </button>
        ) : ios ? (
          // iOS Safari — no auto-prompt, show the manual steps.
          <>
            <ol className="mt-6 space-y-2.5">
              <IosStep n={1} icon={Share} text="Tippe auf Teilen unten in Safari" />
              <IosStep n={2} icon={MoreHorizontal} text="Tippe auf Mehr (iOS 26+)" />
              <IosStep n={3} icon={SquarePlus} text="Zum Home-Bildschirm hinzufügen" />
              <IosStep n={4} icon={Check} text="Mit Hinzufügen bestätigen" />
            </ol>
            <button
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-xl px-5 py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "#2B3499" }}
            >
              Verstanden
            </button>
          </>
        ) : (
          // Other mobile browsers — generic add-to-home hint.
          <>
            <p className="mt-6 text-[13px]" style={{ color: "var(--color-text-dim, #9098B6)" }}>
              Öffne das Browser-Menü und wähle „Zum Startbildschirm hinzufügen".
            </p>
            <button
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-xl px-5 py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "#2B3499" }}
            >
              Verstanden
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Small persistent "App installieren" row for the dashboard sidebar — lets the
 * user install later after dismissing the auto-prompt. Hidden when already
 * installed (standalone).
 */
export function PwaInstallEntry({ className }: { className?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(!isStandalone());
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(PWA_OPEN_EVENT))}
      className={
        "inline-flex items-center gap-1.5 text-[12px] transition hover:text-white " +
        (className ?? "")
      }
      style={{ color: "var(--color-text-faint)" }}
    >
      <Download size={13} strokeWidth={1.75} aria-hidden />
      App installieren
    </button>
  );
}
