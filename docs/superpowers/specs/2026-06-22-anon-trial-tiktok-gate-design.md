# Design: Anon-Trial / TikTok-Gate

- **Date:** 2026-06-22
- **Status:** Approved (design), pending spec review
- **Scope:** First of four conversion sub-projects (the others — Google-login-primary, paywall rework, onboarding-one-screen — are separate specs).

## Problem

The anonymous trial (logged-out visitor generates one real study pack, then is
asked to create a free account) is the top of the TikTok funnel and the app's
strongest flow (value-first). But its abuse quota is keyed on **IP**:
`check_anonymous_quota(ip)` allows **1 generation per IP per 24h**
(`anonymous_generations.ip_address`, `supabase/schema.sql` +
`supabase/migrations/20260521_phase6_anonymous_quota.sql`).

Students on a shared NAT (campus Wi-Fi, dorm, mobile carrier) share **one** IP →
the first visitor consumes the quota and everyone else from that network is
blocked with a dead-end "Komm in Xh wieder". A TikTok wave from one campus would
bounce most first-time visitors. The IP key also doubles as the only cost cap on
Lernly's Anthropic bill, so we can't simply remove it.

## Goal

Decouple the **per-real-user trial quota** from the IP so honest co-located
visitors don't collide, while keeping a bounded cap on Anthropic cost from
single-machine abuse. Turn the post-trial dead-end into a signup conversion.

## Non-goals

- Login UI, paywall, onboarding (separate sub-projects).
- A tamper-proof anti-abuse system. The device key is forgeable by design; the
  real cost caps are mandatory Turnstile + the IP ceiling.

## Decisions (from brainstorming)

- **Model:** device-token (primary per-user quota) + IP ceiling (abuse backstop)
  + mandatory Turnstile (human gate).
- **Free packs per device:** 1.
- **IP ceiling:** 50 generations / IP / 24h.
- **Device cookie lifetime:** 1 year.

## Design

### Three layers, three jobs

1. **Device cookie `lernly_did` = the per-user quota key.** On the first
   anonymous generation, the server mints a random UUID and sets it as an
   `HttpOnly`, `Secure`, `SameSite=Lax`, 1-year cookie. The free-pack quota (1)
   is counted against **this device id**, not the IP. Two devices on one NAT have
   different cookies → each gets its own trial. This removes the collision.

2. **IP ceiling = abuse backstop.** Every anonymous generation still records the
   IP (using the already-hardened `extractClientIp`, which prefers the
   unspoofable Vercel `x-real-ip`). Generation is blocked once an IP exceeds
   `ANON_IP_CEILING` (50) generations in the 24h window — independent of device.
   With Turnstile mandatory this rarely trips for honest crowds and only caps a
   single machine hammering the endpoint.

3. **Turnstile = human gate.** Already mandatory in production (fails closed when
   `TURNSTILE_SECRET_KEY` is unset on `VERCEL_ENV=production`). Unchanged. This is
   the primary bot defense — each generation needs a freshly solved challenge.

### User-facing behaviour

| Situation | Behaviour |
|---|---|
| 1st generation (fresh device) | Works as today → real pack → `SaveModal` (create free account to save). |
| 2nd generation, same device, no account | **Friendly signup CTA** instead of "Komm in 24h wieder": "Dein Gratis-Paket ist verbraucht — erstell ein kostenloses Konto für 2 Pakete/Monat + Speichern." |
| IP ceiling reached (rare / abuse) | Neutral "Gerade zu viele Anfragen, versuch's später." |

### Backend / DB (additive, prod-safe — apply migration before merge)

- **New migration** `supabase/migrations/<14-digit>_anon_device_quota.sql`:
  - `alter table public.anonymous_generations add column if not exists device_id text;`
    (nullable, additive — old inserts leave it null).
  - Index `anonymous_generations(device_id, created_at desc)` for the device lookup.
  - **New function overloads** (Postgres overloads by arity — the existing 1-/2-arg
    versions stay untouched so the currently-deployed code keeps working):
    - `check_anonymous_quota(p_device_id text, p_ip text) returns json` —
      returns `{ok:false, reason:'anon_device_limit'}` when the device already
      generated `>= ANON_DEVICE_LIMIT` in the window; `{ok:false,
      reason:'anon_ip_ceiling', retry_after_seconds}` when the IP exceeds the
      ceiling; else `{ok:true}`. `SECURITY DEFINER`, `search_path=public`,
      granted to `anon, authenticated`. The limits are encoded as SQL constants
      inside the function (device=1, ip=50).
    - `bump_anonymous_usage(p_device_id text, p_ip text, p_user_agent text)` —
      inserts a row carrying `device_id`.
  - The old `check_anonymous_quota(text)` / `bump_anonymous_usage(text, text)`
    overloads remain (dropped in a later migration once the new code is live).

- **`src/app/api/generate/route.ts`** (anonymous path only):
  - Read the `lernly_did` cookie; if absent, mint `crypto.randomUUID()`.
  - Replace the `check_anonymous_quota(ip)` call with
    `check_anonymous_quota(deviceId, ip)`. Both blocks return **HTTP 429**; the
    JSON `reason` field distinguishes them — `anon_device_limit` is surfaced as
    `reason: "anon_signup_needed"`, the IP block as `reason: "anon_ip_ceiling"` —
    and the client branches on `reason`.
  - On success, call `bump_anonymous_usage(deviceId, ip, ua)` and set the
    `lernly_did` cookie on the response (1-year, HttpOnly, Secure, SameSite=Lax).
  - Logged-in path is untouched.

- **`src/app/landing-client.tsx`** (`handleGenerate`): when the response carries
  `reason === "anon_signup_needed"`, render a signup CTA (link to
  `/login?mode=register&next=/dashboard/claim`) instead of the generic red error
  box. The IP-ceiling reason renders the neutral retry message.

- **Constants:** a small `src/lib/anonTrial.ts` exporting the cookie name
  `lernly_did` so the server + any reader stay in sync. The numeric limits live
  in SQL (single source of truth for the quota).

### Constants / knobs

| Knob | Default | Where | Effect |
|---|---|---|---|
| Free packs per device | 1 | SQL `check_anonymous_quota` | per-user generosity |
| IP ceiling / 24h | 50 | SQL `check_anonymous_quota` | campus reach ↑ vs abuse cost ↑ |
| Cookie lifetime | 1 year | route cookie options | how long a device is remembered |

## Limits & DSGVO

- The device cookie is **not** a security boundary: clearing cookies / incognito
  yields another free pack. This is intended; Turnstile (mandatory) + the IP
  ceiling are the real cost caps. The cookie only stops honest co-located users
  from colliding.
- A cookie used solely for abuse-prevention / rate-limiting is defensible as
  "strictly necessary" → no consent banner required. Final confirmation by the
  lawyer (no fabricated legal text here).

## Acceptance criteria

1. Two anonymous generations with **different** `lernly_did` cookies from the
   **same** IP → both succeed (each gets its 1 free pack).
2. A second generation with the **same** `lernly_did` within 24h → blocked with
   `reason: "anon_signup_needed"`; the landing shows a signup CTA, not a red error.
3. The 51st distinct-device generation from one IP within 24h → blocked with the
   IP-ceiling reason (neutral retry message).
4. Production with `TURNSTILE_SECRET_KEY` unset → still blocked (unchanged
   fail-closed behaviour).
5. The currently-deployed code path (old 1-/2-arg quota functions) keeps working
   after the migration is applied (overloads coexist).
6. `tsc` clean, existing tests green, `next build` green; SQL constants unit-
   checkable via a small test where practical.

## Rollout

1. Apply the additive migration to the shared prod DB **before** merging the code
   (safe: new overloads + nullable column; old code unaffected).
2. Merge → Vercel deploys → verify acceptance criteria 1–3 against the preview
   (two browsers / an incognito window from the same IP).
3. Set `CRON_SECRET`/`TURNSTILE_SECRET_KEY` scope hygiene already covered.

## Out of scope

Google-login-primary, paywall rework, onboarding-one-screen — each a later spec.
