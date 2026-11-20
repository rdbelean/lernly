# Lernly Security, Edge-Case & Compliance Audit (2026-11)

**Scope:** Produktions-Hardening von Web-App (`src/app/**`), API-Routen (`src/app/api/**`), Server-Actions, Authentifizierung, Stripe-Zahlungen, Supabase-RLS, HTTP-Security-Headern und deutscher DSGVO-/TDDDG-Compliance (inkl. § 25 TDDDG, § 5 DDG, § 18 Abs. 2 MStV).

---

## 1. Behobener Bug & Schutz vor Missbrauch / KI-Kosten

### 1.1 Gefundener Bug: Kaputter Rate-Limit-RPC in `POST /api/study/extract`
- **Befund:** In `src/app/api/study/extract/route.ts` wurden an die Supabase-Funktion `check_rate_limit(p_bucket, p_max, p_window_seconds)` falsche Parameter-Namen (`p_key`, `p_limit`) übergeben, wodurch Rate-Limit-Aufrufe für Nicht-Admins fehlschlagen konnten.
- **Behebung:** Umstellung auf den zentralen Helfer `enforceRateLimit` (`src/lib/security/rateLimit.ts`), der ein zweistufiges Sliding-Window (In-Memory-Sofortbremse in `rateLimitCore.ts` + persistente Supabase-RPC `check_rate_limit` mit `p_bucket`, `p_max`, `p_window_seconds`) nutzt (`maxIp: 10`, `maxUser: 5`, `windowSeconds: 3600`).

### 1.2 Durchgängiges Rate-Limiting & Payload-Caps auf API-Routen
Alle sensiblen und schreibenden API-Endpunkte erzwingen per-IP- und per-User-Limits (`enforceRateLimit`) sowie strikte UTF-8-Byte-Limits vor `JSON.parse` (`readJsonBodyWithLimit`):

| Endpunkt | Body-Cap | Rate-Limit (IP / User / Fenster) |
| --- | --- | --- |
| `GET /api/trainer/courses` | — | `120 / 60 / 600s` |
| `POST /api/trainer/courses` | `5 MB` | `60 / 30 / 600s` |
| `GET /api/trainer/courses/[id]` | — (`isUuid`) | `120 / 60 / 600s` |
| `DELETE /api/trainer/courses/[id]` | — (`isUuid`) | `40 / 20 / 600s` |
| `POST /api/trainer/sync` | `5 MB` | `60` (pre-auth IP) / `30` (User) `/ 600s` |
| `POST /api/study/extract` | `6 Dateien / 15 MB / 60k Zeichen` | `10 / 5 / 3600s` |
| `POST /api/quiz/repractice` | `64 KB` | `15 / 6 / 3600s` |
| `POST /api/tutor/ask` | `64 KB` (Frage <= 2.000 Zeichen, Verlauf <= 20) | `40 / 20 / 600s` |
| `POST /api/packs/save` | `5 MB` | `60 / 30 / 600s` |
| `POST /api/byok/save` | `16 KB` (Key <= 512) | `20 / 10 / 600s` |
| `POST /api/byok/delete` | — | `20 / 10 / 600s` |
| `GET /api/account/export` | — | `15 / 10 / 3600s` |
| `POST /api/stripe/portal` | — | `15 / 15 / 600s` |
| `POST /api/stripe/checkout` | `16 KB` | `15` (IP) / `15` (User) `/ 600s` |

Zudem begrenzen verschärfte Zod-Schemas in `src/lib/trainer/types.ts` Zeichenketten- und Array-Längen (`artifactHtml` max `5.000.000`).

---

## 2. Supabase RLS, Service-Role-Isolation & IDOR-Schutz

- **RLS-Audit (`supabase/migrations/*`):**
  - Alle nutzerbezogenen Tabellen (`study_packs`, `exams`, `exam_references`, `quiz_attempts`, `card_reviews`, `study_days`, `tutor_usage`, `pack_credits`, `cram_jobs`) verwenden aktiviertes RLS mit `*_own`-Policies.
  - Interne Tabellen (`rate_limit_events`, `generation_slots`, `processed_stripe_events`, `exam_reminder_log`, `anonymous_generations`) haben aktiviertes RLS ohne öffentliche Policies (ausschließlich über `service_role`).
- **Service-Role-Key-Isolation:** `SUPABASE_SERVICE_ROLE_KEY` wird ausschließlich serverseitig (`src/lib/supabase/server.ts` mit `import "server-only"`, `src/lib/trainer/syncToken.ts`) geladen und gelangt niemals ins Client-Bundle.
- **IDOR-Defense-in-Depth in Server Actions:**
  - `src/app/dashboard/actions.ts` (`updateExam`, `deleteExam`, `attachPastExamsToExam`, `assignPackToExam`) und `src/app/dashboard/pack/[id]/actions.ts` (`deletePack`, `setCardFavorite`, `deleteCard`, `renamePack`) prüfen IDs strikt via `isUuid(...)` und filtern neben RLS zusätzlich explizit mit `.eq("user_id", userId)` bzw. `.eq("user_id", user.id)`.

---

## 3. Edge-Case-Resilienz für normale Nutzer

- **E-Mail-Normalisierung & Apple Private Relay (`normalizeEmail` in `src/lib/security/validation.ts`):**
  - Trimmt und konvertiert konsistent zu Kleinbuchstaben, unterstützt `+`-Subaddressing sowie `@privaterelay.appleid.com` (max. 254 Zeichen).
  - Eingebunden in `requestMagicLink`, `verifyMagicCode`, `loginWithPassword` (`src/app/login/actions.ts`), `changeEmail` (`src/app/dashboard/settings/actions.ts`), `ensureUserAndGetLoginToken` / `provisionUserAndSendLogin` (`src/lib/auth/provision.ts`), `resolveUserForSession` (`src/app/api/stripe/webhook/route.ts`) und `/api/feedback`.
- **Namen mit Apostrophen, Umlauten & XSS-Schutz (`normalizeDisplayName`):**
  - NFC-Normalisierung, bewahrt Namen wie `Seán O'Connor`, `Müller-Lüdenscheid` oder `René`, entfernt Steuerzeichen und `<` `>` (Neutralisierung von HTML-Tags) in `saveWelcome` (`src/app/dashboard/actions.ts`) und `/api/feedback`.
- **Stripe Doppelklick-, Idempotenz- & Secret-Schutz:**
  - Synchrone `useRef`-In-Flight-Sperre + `crypto.randomUUID()` als `idempotencyKey` im Checkout-/Portal-Flow (`src/app/dashboard/settings/billing-section.tsx`, `src/components/beta/BetaCheckoutHost.tsx`).
  - `POST /api/stripe/checkout` nutzt `timingSafeEqual` für das Beta-Passwort und reicht den `idempotencyKey` (Client-Key oder 30-Sekunden-Bucket pro User+Plan) an `stripe.checkout.sessions.create` durch.
  - `POST /api/stripe/webhook` validiert Signaturen über `stripe.webhooks.constructEvent` und dedupliziert Events in `processed_stripe_events`.
- **Zeitzonen- & DST-sicherer Klausur-Countdown (`formatExamCountdown` in `src/lib/study/importCourse.ts`):**
  - `YYYY-MM-DD`-Daten werden direkt als Kalendertag per `Date.UTC(year, month - 1, day)` geparst und gegen `Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())` verglichen, sodass weder UTC-Verschiebungen bei negativen Offsets noch Sommer-/Winterzeitwechsel (23h-/25h-Tage) oder Spätabend-Sessions den Countdown verfälschen.

---

## 4. HTTP Security Header & Content Security Policy

Konfiguriert in `src/lib/security/headers.ts` und eingebunden in `next.config.ts`:
- `X-Frame-Options: DENY` & `CSP frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(self "https://js.stripe.com")`
- `Cross-Origin-Opener-Policy: same-origin`
- `Content-Security-Policy`: `object-src 'none'`, `base-uri 'self'`, `upgrade-insecure-requests` (in Produktion), Allowlist für KaTeX (`cdn.jsdelivr.net`), Supabase, Stripe, Cloudflare Turnstile, Sentry, Cal.com und opt-in PostHog.

---

## 5. Deutsche DSGVO- & TDDDG-Compliance (§ 25 TDDDG, § 5 DDG, § 18 Abs. 2 MStV)

- **Echtes Opt-In für PostHog (`src/lib/consent.ts`, `src/lib/analytics.ts`, `src/components/AnalyticsProvider.tsx`):**
  - `hasAnalyticsConsent()` ist vor ausdrücklicher Einwilligung strikt `false`.
  - PostHog wird ohne Opt-In nicht initialisiert und sendet keinerlei Events oder Cookies; bei Widerruf folgen `posthog.opt_out_capturing()`, `posthog.reset()` sowie Bereinigung von `ph_*`-Cookies und `localStorage`.
- **Symmetrisches Consent-Banner & Widerruf (`src/components/CookieConsentBanner.tsx`, `src/components/CookieSettingsButton.tsx`):**
  - Gleichwertige Buttons *„Nur notwendige“* und *„Alle akzeptieren“* ohne Dark Patterns.
  - Jederzeit widerrufbar über *„Cookie-Einstellungen“* in allen Footern (`LernlyLanding.tsx`, `SiteFooter.tsx`, `legal-links.tsx`) sowie direkt auf `/datenschutz`.
- **DSGVO Art. 17 Löschung & Export:**
  - `src/app/dashboard/settings/danger-zone.tsx` bereinigt neben dem Server-Cascade (`deleteAccount`) auch alle lokalen Browser-Daten (`lernly.*`, `lernly:*`, `ph_*`) und nutzt die eindeutige Aktion *„Account & alle Lerndaten endgültig löschen“* (mit case-insensitiver E-Mail-Bestätigung).
  - `/dashboard/einstellungen` leitet sauber auf `/dashboard/settings` weiter.
- **Rechtsseiten aktualisiert:**
  - `/impressum`: auf **§ 5 DDG** (vormals § 5 TMG), **§ 18 Abs. 2 MStV** (vormals § 55 Abs. 2 RStV) und § 7 Abs. 1 DDG / DSA aktualisiert.
  - `/datenschutz`: vollständige Übersicht aller Auftragsverarbeiter (Vercel, Anthropic Claude API, Supabase Frankfurt EU, Stripe, Resend, Cloudflare Turnstile, Sentry, opt-in PostHog, Google Sign-In), Beschreibung der Art.-15–22-Rechte inkl. JSON-Export & Konto-Löschung sowie § 25 TDDDG inkl. interaktivem Widerrufs-Button.
