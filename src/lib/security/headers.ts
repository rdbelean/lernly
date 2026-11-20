/**
 * Shared HTTP security header builders for `next.config.ts`.
 * Pure functions so automated tests verify CSP and framing policies directly.
 */

export function buildContentSecurityPolicy(
  isDev: boolean = process.env.NODE_ENV !== "production",
): string {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    "https://cdn.jsdelivr.net",
    "https://js.stripe.com",
    "https://challenges.cloudflare.com",
    "https://*.posthog.com",
    "https://*.i.posthog.com",
  ];

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    // KaTeX, MathJax inline SVG styling, and Tailwind utilities need 'unsafe-inline'.
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "img-src 'self' data: blob: https://*.supabase.co https://*.stripe.com https://*.googleusercontent.com",
    "font-src 'self' data: https://cdn.jsdelivr.net",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://checkout.stripe.com https://*.posthog.com https://*.i.posthog.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://challenges.cloudflare.com https://cdn.jsdelivr.net https://app.cal.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://challenges.cloudflare.com https://app.cal.com blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];

  return directives.join("; ");
}

export function buildSecurityHeaders(
  isDev: boolean = process.env.NODE_ENV !== "production",
): { key: string; value: string }[] {
  return [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    {
      key: "Permissions-Policy",
      value:
        'camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(self "https://js.stripe.com")',
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(isDev),
    },
  ];
}
