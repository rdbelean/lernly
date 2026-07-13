"use client";

import { useEffect, useRef } from "react";

// =========================================================================
// CalBooking — inline Cal.com embed (cal.com/lernly/hochschulen) styled to
// the Lernly system: dark theme, indigo brand. Uses the official embed
// snippet (script loads from app.cal.com at runtime — no npm dependency,
// same pattern as the Turnstile widget). Two instances live on the page
// (hero + contact), so each gets its own Cal namespace.
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
}: {
  /** Unique per page instance (e.g. "hero", "kontakt"). */
  namespace: string;
  className?: string;
  /** Cap the embed height (px); content scrolls inside. Used in the hero
      column, where the unconstrained iframe would grow very tall. */
  maxHeight?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initialized.current) return;
    initialized.current = true;

    const Cal = getCal();
    Cal("init", namespace, { origin: CAL_ORIGIN });
    Cal.ns![namespace]("inline", {
      elementOrSelector: containerRef.current,
      config: { layout: "month_view", theme: "dark" },
      calLink: CAL_LINK,
    });
    Cal.ns![namespace]("ui", {
      theme: "dark",
      cssVarsPerTheme: {
        dark: { "cal-brand": "#6E80F2" },
      },
      hideEventTypeDetails: false,
      layout: "month_view",
    });
  }, [namespace]);

  return (
    <div className={className}>
      <div
        className="ln-glass-card overflow-hidden p-2 md:p-3"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
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
      <p
        className="mt-3 text-center text-[11.5px]"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        Terminbuchung über Cal.com — beim Laden des Kalenders werden Daten an
        Cal.com übertragen.
      </p>
    </div>
  );
}
