# Design — Private `/admin` Founder Ops Dashboard

Date: 2026-06-01
Status: Approved
Repo: lernly (Next.js 16 App Router · Supabase · Tailwind v4 · lucide-react)

## Goal

A private, founder-only `/admin` page to keep open and watch how Lernly is
doing: own-DB metrics (users, active, packs, tutor, plan split, cram health) +
a health/links row pointing to the tools that own the deeper data (PostHog,
Vercel, Sentry, Anthropic, Supabase). Read-only, server-side, auto-refreshing.

## Decisions (locked)

- **Gate source:** `ADMIN_EMAIL` env var, fallback to hardcoded
  `beleanrd@gmail.com`.
- **Gate fail:** `notFound()` (404) for logged-out OR non-founder — route looks
  nonexistent.
- **Auto-refresh:** client `router.refresh()` every 60s + manual Reload button +
  "Aktualisiert: HH:MM:SS". No full-page meta refresh.
- **Cram:** NOT in the plan split. Plan split is the real 3-way enum
  (free/pro/team); cram is its own card (total jobs + failed/stuck health line).
- **No migrations** — pure reads of existing tables.

## Verified facts (live schema)

- `users`: `id, email, plan ('free'|'pro'|'team'), created_at, …` — plan enum is
  exactly those three.
- `study_packs`: `id, user_id, exam_type, created_at, status, cram_job_id, …`
- `cram_jobs`: `id, user_id, status, failed_chunks, total_chunks, done_chunks,
  created_at, updated_at, …`
- `tutor_usage`: `user_id, period_start, messages_used, updated_at`
- `auth.users.last_sign_in_at` IS readable via the service role (active-user
  counts verified working).
- Gating pattern in repo: `getUser()` (`@/lib/dal`) + `createServiceClient()`
  (`@/lib/supabase/server`); `notFound()` already used in
  `dashboard/pack/[id]/page.tsx`.

## Architecture

Server component `src/app/admin/page.tsx`, standalone (NOT under the dashboard
layout — no sidebar). Flow:

1. `const user = await getUser()`.
2. `if (!user || !isFounder(user.email)) notFound();` — gate BEFORE any
   service-role work.
3. `const metrics = await getAdminMetrics(createServiceClient());` — all queries
   in one `Promise.all`.
4. Render metric cards + health/links + `<AdminAutoRefresh/>`.

Security: the service client is constructed only after the gate; the page is a
server component so the service-role key never reaches the browser. The only
client code is the dumb refresh timer (no data, no secrets).

## Files

**Create**
- `src/lib/admin/auth.ts` — `server-only`. `ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "beleanrd@gmail.com"`; `isFounder(email?: string | null): boolean` (trim + case-insensitive compare).
- `src/lib/admin/auth.test.ts` — `isFounder` matches founder (case/whitespace), rejects others/empty/null/undefined.
- `src/lib/admin/metrics.ts` — `server-only`. `getAdminMetrics(service): Promise<AdminMetrics>` (all SQL here) + pure helper `monthStart(now)` for the tutor month boundary. Exported `AdminMetrics` type.
- `src/lib/admin/metrics.test.ts` — pure tests for `monthStart` + any delta/shape helper (no DB).
- `src/app/admin/page.tsx` — gate + fetch + layout. `export const dynamic = "force-dynamic"` (never cache an ops page).
- `src/components/admin/MetricCard.tsx` — presentational: `{ label, value, sub?, icon, tone? }`.
- `src/components/admin/AdminAutoRefresh.tsx` — `"use client"`: `useEffect` 60s `router.refresh()`, Reload button, last-updated time.

## Metrics (queries)

All via service role, parallel:
- **Users:** `total = count(users)`; `today/7d/30d = count(users) where created_at >= boundary`.
- **Active:** `auth.users` `count(*) filter last_sign_in_at > now()-24h` and `>7d`.
- **Packs:** `today = count(study_packs) where created_at::date = today`; `total`; `byExamType = group by exam_type`.
- **Tutor:** `sum(messages_used) from tutor_usage where period_start >= monthStart`.
- **Plan split:** `group by plan` → `{ free, pro, team }`.
- **Cram health:** `total = count(cram_jobs)`; `failed = count where status='failed' OR failed_chunks>0`; `stuck = count where status in ('queued','processing') AND updated_at < now()-1h` (heuristic). Card shows total + a green/amber health line.

Counts use `.select("*", { count: "exact", head: true })` with range filters
(`.gte("created_at", boundary)` etc.) — no aggregates-over-HTTP awkwardness, no
new RPC, migration-free. Group-bys (plan split, exam_type) fetch the small
column and tally in JS. The `auth.users` active counts need a SQL aggregate the
PostgREST client can't express cleanly, so they go through ONE tiny read: the
metrics module is the single place that knows how. If `auth.users` aggregation
proves awkward via the JS client, fall back to selecting `last_sign_in_at` for
all users (small table) and bucketing in JS — still no migration. The metrics
module encapsulates all of this so the page stays clean.

## Health & links section

- **Status row:** Cram health (lucide `CheckCircle`/`AlertTriangle`, no emoji) —
  "Cram: keine Fehler" vs "Cram: N fehlgeschlagen / M hängen".
- **Links row:** PostHog, Vercel, Sentry, Anthropic Console, Supabase (lucide
  `ExternalLink`). Note line: „Echtzeit ‚wer ist online' → PostHog".
- Link targets: PostHog from `NEXT_PUBLIC_POSTHOG_HOST` if set, else
  `https://eu.posthog.com`; others to their dashboards (Vercel project, Sentry,
  console.anthropic.com, supabase.com/dashboard). Hardcoded dashboard URLs are
  fine (founder-only page).

## Styling / behavior

- Tokens: bg `#0F1322`, cards `#141930`, text `#EAEDF7`/dim `#9098B6`, accent
  deep-indigo `#2B3499`/`#6E80F2`, Sora headings via `var(--font-display)`,
  lucide icons, NO emojis.
- Grid: `grid-cols-2` (mobile) → `sm:grid-cols-3` → `lg:grid-cols-4`. Calm
  spacing, 12–16px radius. Mobile-friendly (checked at 380px).
- Read-only. No mutations, no admin actions in v1.

## Testing

- `isFounder`: founder (exact, different case, surrounding spaces) → true;
  other email / "" / null / undefined → false.
- `monthStart` + delta/shape helpers: pure unit tests.
- **Manual gate confirmation (deliverable #4):**
  1. Logged out → visit `/admin` → 404.
  2. Log in as a NON-founder account → `/admin` → 404.
  3. Log in as `beleanrd@gmail.com` → `/admin` → renders metrics.
  Also: confirm the service-role key is not in the client bundle (grep built JS
  / Network tab shows no service key).

## Env

- `ADMIN_EMAIL` (optional; defaults to founder). Add to Vercel **all scopes** if
  you ever change it. Documented in `.env.local.example`.

## Out of scope (YAGNI)

Websockets/presence, charts library, any mutation/admin action, new DB
tables/migrations, per-user drill-downs. "Who's online now" is PostHog's job —
this page links to it, doesn't duplicate it.
