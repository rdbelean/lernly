// Client-side error → /api/feedback (Typ "Bug", Quelle "App-Error").
// Browser-only module: imported exclusively from client components
// (ErrorReporter, app/error.tsx). Never throws.

// Noise we never report: benign browser quirks, network flakiness from bad
// connections, and errors thrown by third-party extensions.
const IGNORE_PATTERNS = [
  "ResizeObserver loop",
  "Script error",
  "Failed to fetch",
  "NetworkError",
  "Load failed",
  "AbortError",
  "extension://",
];

const MAX_REPORTS_PER_PAGELOAD = 3;
let reportsSent = 0;

function dedupeKey(message: string, route: string): string {
  return `lernly_err_${route}::${message.slice(0, 200)}`;
}

export function reportClientError(message: string, stack?: string): void {
  try {
    if (typeof window === "undefined") return;
    const msg = (message || "").trim();
    if (!msg || IGNORE_PATTERNS.some((p) => msg.includes(p))) return;
    if (stack && stack.includes("extension://")) return;
    if (reportsSent >= MAX_REPORTS_PER_PAGELOAD) return;

    // Route only — no query string / hash, which may hold tokens (PII).
    const route = window.location.pathname;

    // Same error on the same route → once per browser session.
    const key = dedupeKey(msg, route);
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable (private mode) → still rate-capped above.
    }

    reportsSent += 1;
    const stackHead = (stack ?? "").split("\n").slice(0, 5).join("\n");
    void fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        betreff: msg.slice(0, 60),
        nachricht: `${msg}\n\n${stackHead}`.slice(0, 1800),
        typ: "Bug",
        quelle: "App-Error",
        kontext: route,
      }),
    }).catch(() => {});
  } catch {
    // Error reporting must never cause errors.
  }
}
