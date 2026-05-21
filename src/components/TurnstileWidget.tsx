"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement | string,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          appearance?: "always" | "execute" | "interaction-only";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

type Props = {
  onVerify: (token: string) => void;
  onError?: () => void;
};

// Renders a Cloudflare Turnstile widget. Returns null (and skips all logic) if
// NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set, so the feature can be merged + shipped
// before the user has a Cloudflare account.
export default function TurnstileWidget({ onVerify, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    if (!containerRef.current) return;

    // Load the Turnstile script once per page.
    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // Poll until the global is available, then render the widget into our container.
    let cancelled = false;
    const tryRender = () => {
      if (cancelled) return;
      if (!window.turnstile || !containerRef.current) {
        setTimeout(tryRender, 100);
        return;
      }
      if (widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: onVerify,
        "error-callback": onError,
        "expired-callback": onError,
        theme: "dark",
        appearance: "interaction-only",
      });
    };
    tryRender();

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* widget may already be gone */
        }
        widgetIdRef.current = null;
      }
    };
  }, [onVerify, onError]);

  if (!SITE_KEY) return null;
  return <div ref={containerRef} className="mt-3 flex justify-center" />;
}
