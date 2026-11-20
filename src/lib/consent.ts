export const CONSENT_STORAGE_KEY = "lernly_cookie_consent_v1";
export const CONSENT_COOKIE_NAME = "lernly_consent";
export const OPEN_COOKIE_SETTINGS_EVENT = "lernly:open-cookie-settings";
export const COOKIE_CONSENT_CHANGED_EVENT = "lernly:cookie-consent-changed";

export type CookieConsent = {
  version: 1;
  necessary: true;
  analytics: boolean;
  updatedAt: string;
};

type ConsentListener = (consent: CookieConsent | null) => void;
const listeners = new Set<ConsentListener>();
const storeListeners = new Set<() => void>();

let lastRawSignature: string | undefined;
let cachedConsent: CookieConsent | null = null;

function readConsentCookie(): boolean | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE_NAME}=(analytics|necessary)(?:;|$)`),
  );
  if (!match) return null;
  return match[1] === "analytics";
}

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CookieConsent>;
      if (
        parsed &&
        parsed.version === 1 &&
        typeof parsed.analytics === "boolean" &&
        typeof parsed.updatedAt === "string"
      ) {
        return {
          version: 1,
          necessary: true,
          analytics: parsed.analytics,
          updatedAt: parsed.updatedAt,
        };
      }
    }
  } catch {
    // localStorage blocked in private browsing — fall back to cookie check below.
  }

  const fromCookie = readConsentCookie();
  if (fromCookie === null) return null;
  return {
    version: 1,
    necessary: true,
    analytics: fromCookie,
    updatedAt: new Date(0).toISOString(),
  };
}

/**
 * TDDDG § 25 / DSGVO Opt-in guard: strictly returns `false` unless the user
 * has explicitly accepted analytics cookies.
 */
export function hasAnalyticsConsent(): boolean {
  return getCookieConsent()?.analytics === true;
}

export function getServerConsentSnapshot(): CookieConsent | null {
  return null;
}

export function getConsentSnapshot(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  let lsRaw: string | null = null;
  try {
    lsRaw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    lsRaw = null;
  }
  const cookieRaw =
    typeof document !== "undefined"
      ? (document.cookie.match(
          new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE_NAME}=(analytics|necessary)(?:;|$)`),
        )?.[1] ?? "")
      : "";
  const sig = `${lsRaw ?? ""}|${cookieRaw}`;
  if (sig === lastRawSignature) return cachedConsent;
  lastRawSignature = sig;
  cachedConsent = getCookieConsent();
  return cachedConsent;
}

export function setCookieConsent(analytics: boolean): CookieConsent {
  const next: CookieConsent = {
    version: 1,
    necessary: true,
    analytics,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota / privacy mode failures; cookie is still written below.
    }

    const secure =
      window.location.protocol === "https:" ? "; Secure" : "";
    const value = analytics ? "analytics" : "necessary";
    document.cookie = `${CONSENT_COOKIE_NAME}=${value}; Path=/; Max-Age=15552000; SameSite=Lax${secure}`;

    lastRawSignature = undefined;
    cachedConsent = next;

    for (const listener of listeners) {
      listener(next);
    }
    for (const listener of storeListeners) {
      listener();
    }
    window.dispatchEvent(
      new CustomEvent(COOKIE_CONSENT_CHANGED_EVENT, { detail: next }),
    );
  }

  return next;
}

export function clearCookieConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // ignore
  }
  document.cookie = `${CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
  lastRawSignature = undefined;
  cachedConsent = null;
  for (const listener of listeners) {
    listener(null);
  }
  for (const listener of storeListeners) {
    listener();
  }
}

export function subscribeConsent(listener: ConsentListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeConsentStore(listener: () => void): () => void {
  storeListeners.add(listener);
  return () => {
    storeListeners.delete(listener);
  };
}

export function openCookiePreferences(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
}
