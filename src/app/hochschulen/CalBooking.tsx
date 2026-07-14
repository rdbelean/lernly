"use client";

import { useEffect, useRef } from "react";

// =========================================================================
// CalBooking — inline Cal.com embed (cal.com/lernly/hochschulen), light
// "Academic Editorial" styling to match the /hochschulen route. Uses the
// official embed snippet (script loads from app.cal.com at runtime — no
// npm dependency). Two instances live on the page (hero + contact), so
// each gets its own Cal namespace. The contact instance mounts lazily
// (IntersectionObserver) so the second iframe doesn't cost initial load.
// =========================================================================

const CAL_LINK = "lernly/hochschulen";
const CAL_ORIGIN = "https://app.cal.com";

type CalApi = {
  (...args: unknown[]): void;
  q?: unknown[];
  ns?: Record<string, CalApi>;
  loaded?: boolean;
};

declare global {
  interface Window {
    Cal?: CalApi;
  }
}

// Official Cal.com loader snippet, translated to TypeScript. Safe to call
// multiple times — the script is only appended once.
function getCal(): CalApi {
  const w = window;
  if (w.Cal?.loaded !== undefined && w.Cal.ns) return w.Cal;

  const p = (api: CalApi, args: unknown) => {
    api.q!.push(args);
  };
  const cal: CalApi = function (...args: unknown[]) {
    const c = w.Cal as CalApi;
    if (!c.loaded) {
      c.ns = {};
      c.q = c.q || [];
      const s = document.createElement("script");
      s.src = `${CAL_ORIGIN}/embed/embed.js`;
      document.head.appendChild(s);
      c.loaded = true;
    }
    if (args[0] === "init") {
      const api: CalApi = function (...inner: unknown[]) {
        p(api, inner);
      };
      const namespace = args[1];
      api.q = api.q || [];
      if (typeof namespace === "string") {
        c.ns![namespace] = c.ns![namespace] || api;
        p(c.ns![namespace], args);
        p(c, ["initNamespace", namespace]);
      } else {
        p(c, args);
      }
      return;
    }
    p(c, args);
  };
  cal.q = cal.q || [];
  cal.ns = cal.ns || {};
  w.Cal = w.Cal || cal;
  return w.Cal;
}

export default function CalBooking({
  namespace,
  className,
  maxHeight,
  compact,
  lazy,
}: {
  /** Unique per page instance (e.g. "hero", "kontakt"). */
  namespace: string;
  className?: string;
  /** Cap the embed height (px); content scrolls inside. Used in the hero
      column, where the unconstrained iframe would grow very tall. */
  maxHeight?: number;
  /** Compact mode: hide the event-type header (title/duration/location) so
      only the calendar + slot picker show, and drop the notice caption. */
  compact?: boolean;
  /** Defer Cal init until the container approaches the viewport. */
  lazy?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const init = () => {
      if (initialized.current) return;
      initialized.current = true;
      const Cal = getCal();
      Cal("init", namespace, { origin: CAL_ORIGIN });
      Cal.ns![namespace]("inline", {
        elementOrSelector: el,
        config: { layout: "month_view", theme: "light" },
        calLink: CAL_LINK,
      });
      Cal.ns![namespace]("ui", {
        theme: "light",
        cssVarsPerTheme: {
          light: { "cal-brand": "#1421C5" },
        },
        hideEventTypeDetails: compact,
        layout: "month_view",
      });
    };

    if (!lazy) {
      init();
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          init();
          obs.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [namespace, compact, lazy]);

  return (
    <div className={className}>
      <div className="hs-card overflow-hidden p-2 md:p-3">
        <div
          ref={containerRef}
          className="w-full overflow-auto rounded-xl"
          style={
            maxHeight
              ? { height: maxHeight, overflowY: "auto" }
              : { minHeight: 520 }
          }
        />
      </div>
      {!compact && (
        <p
          className="mt-3 text-center text-[11.5px]"
          style={{ color: "var(--hs-mute)" }}
        >
          Terminbuchung über Cal.com — beim Laden des Kalenders werden Daten an
          Cal.com übertragen.
        </p>
      )}
    </div>
  );
}
