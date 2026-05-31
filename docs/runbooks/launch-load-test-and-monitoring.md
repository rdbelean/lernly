# Launch Runbook — Load-Testing & Monitoring

How to simulate a traffic spike, confirm Lernly holds, and know at a glance
whether things are healthy. Written for the TikTok-spike scenario.

Stack reminder: **Vercel** (serverless, auto-scales) + **Supabase**
(PostgREST-over-HTTP, no app-managed connection pool) + **Anthropic Tier 2**
(Sonnet & Haiku each: **1K RPM / 450K ITPM / 90K OTPM**).

---

## 0. The one-paragraph mental model

The website and API **scale horizontally on Vercel** — static pages and cheap
routes will not fall over from traffic. The only hard ceilings are:
1. **Anthropic token limits** (the real bottleneck) — protected by the
   concurrency cap (`GENERATION_MAX_CONCURRENCY`, default 3) + per-user quotas.
2. **Per-user/per-IP abuse limits** — anon generate (Turnstile + 1/IP/24h),
   magic-link (8/IP/h, 4/email/h).
3. **Supabase** — PostgREST is HTTP, so no connection exhaustion; the limit is
   request throughput on your Supabase plan, which is far above our volume.

So "load testing" here means two very different things, tested separately:
- **A. Spike of cheap traffic** (landing page, signups) — verify the site stays
  up and signups don't get rate-limited into the ground.
- **B. Spike of expensive traffic** (pack generations) — verify the concurrency
  cap serializes cleanly and users get the friendly "gerade viel los" message
  instead of 500s or a blown Anthropic bill.

---

## 1. Before you test — safety rules

- **Never load-test `/api/generate` against production for real.** Each call
  costs Anthropic money and burns real quota. Test the *cap behavior* with a
  zero-cost trick (§3), and test *real generation* only a handful of times.
- **Test on a Preview deployment** where possible (separate from prod traffic).
  Preview now has the Supabase env vars (added earlier).
- **Watch the dashboards live while testing** (§5) — the point is to see the
  metrics move, not just to get a 200.

---

## 2. Test A — cheap-traffic spike (landing + signups)

Goal: confirm the public site and auth survive a burst.

### 2a. Landing page throughput
Use a simple HTTP load tool. `oha` (nicest output) or `hey`:

```bash
# 200 concurrent, 2000 total requests against the landing page
npx oha -n 2000 -c 200 https://www.lernly-app.de/
# or:  hey -n 2000 -c 200 https://www.lernly-app.de/
```

**Healthy =** p95 latency stays reasonable (sub-second for the static landing),
**0% 5xx**, no Vercel "FUNCTION_INVOCATION_FAILED". Vercel adds instances
automatically; you should see throughput scale, not error.

> Note: the landing page is largely static/CDN-cached, so this mostly tests
> Vercel's edge — it will hold trivially. The more meaningful cheap test is auth.

### 2b. Magic-link rate limit (verify it triggers, don't actually spam users)
Hit the login action repeatedly from one IP with a throwaway email and confirm
the limiter kicks in after the threshold:

- Per-email cap: **4 / hour** → the 5th request in an hour returns the friendly
  "Zu viele Anfragen…" message (`MagicLinkState.error`), no email sent.
- Per-IP cap: **8 / hour** across different emails from one IP.

Easiest manual check: on the login page, request a link for `test+1@example.com`
five times quickly. The 5th should be refused. (Turnstile, if the site key is
set, will also gate this before the limiter.)

**Healthy =** limiter refuses past the threshold, real first-time users are
never blocked, and the limiter **fails open** if the RPC errors (by design).

---

## 3. Test B — expensive-traffic spike (the important one)

### 3a. Verify the concurrency cap WITHOUT spending a cent
Temporarily set the cap to **0** on a Preview deployment so *every* generation
is refused at the gate — before any Anthropic call:

1. Vercel → Project → Settings → Environment Variables → add
   `GENERATION_MAX_CONCURRENCY = 0` for **Preview**.
2. Redeploy the preview (or push an empty commit to the branch).
3. Trigger a generation in the preview UI.

**Healthy =** you get the friendly German **503** ("Gerade ist viel los — dein
Lernpaket kommt gleich"), `retryable: true`, `Retry-After: 20`, and **no
Anthropic call is made** (nothing in Anthropic usage, no slot leak). Then
**remove the override** so Preview is back to default 3.

### 3b. Verify the cap serializes a real burst (small, real, costs a little)
With the cap at the default 3, fire **5 concurrent real generations** (5 logged-in
test users, or 5 tabs) at the preview. Expected:
- 3 start immediately (3 slots).
- 2 get the friendly 503 + retry; on retry a few seconds later they succeed as
  slots free up.
- No 500s, no raw English errors, no Anthropic 429 surfacing to the user.

**Healthy =** the burst *serializes* into batches of 3 instead of all hitting
Anthropic at once. Watch the Anthropic dashboard (§5) — output tokens/min should
stay **under 90K OTPM** for Sonnet.

### 3c. The token math (why N=3, and when to raise it)
Per pack, worst case (material at the 480K-char cap, two-pass = all tasks):

| Model  | Output tokens/pack | Over ~1–2 min |
|--------|--------------------|----------------|
| Sonnet | ~52K (sim+blueprint+visualMap+quiz+essay) | ~26–52K/min |
| Haiku  | ~30K (cards+meta+analysis) | ~15–30K/min |

Sonnet OTPM (90K) is the binding limit. **N=3 → ~75K/min Sonnet output worst
case**, under 90K with margin. Realistic packs are ~half that.

**When to raise `GENERATION_MAX_CONCURRENCY`:** if the Anthropic dashboard shows
Sonnet OTPM sustained **well under 90K** during a real spike (say <50K with N=3),
bump to 4–5 and watch again. If you ever see Anthropic 429s in logs, drop it.

---

## 4. Background jobs (cram) under load
Cram generation is already async (Vercel cron `* * * * *`, claims 2 chunks/run,
`maxDuration=800`). A spike of cram purchases **queues** rather than spikes
Anthropic — the worker drains 2 chunks/minute. No load test needed; just watch:
- `cram_jobs` rows moving `queued → processing → ready`.
- Anthropic usage from the worker stays bounded (2 chunks/min).

If the queue grows faster than it drains during a big push, raise the worker's
`CLAIM_PER_RUN` (currently 2) — but that competes with `/api/generate` for the
same OTPM budget, so do it only if interactive generation volume is low.

---

## 5. Dashboards — where to look & what "healthy" means

| What | Where | Healthy | Alarm |
|------|-------|---------|-------|
| **Anthropic tokens/min** | console.anthropic.com → Usage (watch **Sonnet OTPM**) | < 90K OTPM, < 450K ITPM, < 1K RPM | sustained near limit → 429s; raise cap-awareness / queue |
| **Anthropic spend** | console.anthropic.com → Billing; set a **monthly budget + email alert** | tracks expected (~€0.16/pack) | sudden spike = abuse or a retry loop |
| **App errors / 5xx** | Sentry (once DSN set) → Issues; Vercel → Deployment → Logs | near-zero 5xx; friendly 503s are fine | spike in 500s or `FUNCTION_INVOCATION_FAILED` |
| **Function duration / invocations** | Vercel → Observability → Functions | `/api/generate` < 800s, completes | timeouts (hit 800s) = material too large / Anthropic slow |
| **Traffic** | Vercel → Analytics (⚠️ not installed yet — see §6) | scales with campaign | — |
| **DB health** | Supabase → Reports (API requests, errors) | request rate healthy, low error % | 4xx/5xx from PostgREST, slow queries |
| **DB connections** | Supabase → Database → Roles/Pooler | not a concern (HTTP/PostgREST) — monitor only if you ever add direct Postgres | — |
| **Slot table** | Supabase SQL: `select count(*) from generation_slots;` | ≤ N (3) at any time; **0 when idle** | stuck > N or never draining = release bug (TTL self-heals in 15 min) |
| **Rate-limit table** | Supabase SQL: `select count(*) from rate_limit_events;` | small, self-sweeping | unbounded growth = sweep not running |
| **Product funnel** | PostHog (already wired) | signups/generations tracked | drop-off spikes |

### Quick live health SQL (Supabase SQL editor)
```sql
-- live generation slots in use (should be 0..3)
select count(*) as slots_in_use from public.generation_slots;
-- cram backlog
select status, count(*) from public.cram_jobs group by status;
-- packs created in the last hour (spike visibility)
select count(*) from public.study_packs where created_at > now() - interval '1 hour';
-- magic-link request volume in the last hour (abuse visibility)
select count(*) from public.rate_limit_events
  where bucket like 'magiclink:%' and created_at > now() - interval '1 hour';
```

---

## 6. Monitoring gaps to close before launch

1. **Sentry DSN** — Sentry is wired but **dormant**. Create a project at
   sentry.io, set `NEXT_PUBLIC_SENTRY_DSN` (and optionally `SENTRY_ORG` /
   `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` for source maps) in Vercel → redeploy.
   Then add an **alert rule**: "notify on any new issue" → email. Without the DSN
   you have **no runtime error visibility** beyond raw Vercel logs.

2. **Uptime monitor** — none today. Set up **BetterStack** (better-uptime) or
   **UptimeRobot**:
   - Monitor URL: `https://www.lernly-app.de/` (HTTP 200, every 1–3 min).
   - Optional deeper check: `https://www.lernly-app.de/login` (auth page renders).
   - Alert channel: email + (optional) SMS/Telegram.
   - **Don't** point an uptime check at `/api/generate` (it would cost money) —
     a cheap public route is the right liveness signal.

3. **Vercel Analytics** — not installed. `npm i @vercel/analytics` and render
   `<Analytics/>` in the root layout if you want first-party traffic/Web-Vitals
   in the Vercel dashboard (PostHog already covers product analytics, so this is
   optional).

4. **Anthropic budget alert** — set a monthly spend cap + email alert in the
   Anthropic console. This is your early-warning for an abuse/retry-loop spike.

---

## 7. "We're getting hammered" — fast levers (no deploy needed)
All env-var changes on Vercel (redeploy or instant for non-`NEXT_PUBLIC_`):
- **Generations brushing Anthropic limits** → lower `GENERATION_MAX_CONCURRENCY`
  (e.g. 2). Excess users get the friendly retry message, not errors.
- **Anon-generation abuse** → it's already Turnstile + 1/IP/24h; if needed,
  disable anonymous generation entirely via `ANONYMOUS_GENERATION_ENABLED`.
- **Magic-link spam** → already capped; tighten the constants in
  `src/app/login/actions.ts` (`MAGICLINK_*`) if a botnet rotates IPs.
- **Something on fire** → Vercel lets you instantly roll back to a previous
  production deployment (Deployments → ⋯ → Promote/Rollback).

---

## 8. Pre-launch checklist
- [ ] Sentry DSN set in Vercel + alert rule created
- [ ] Uptime monitor live (BetterStack/UptimeRobot) on `/`
- [ ] Anthropic monthly budget + email alert configured
- [ ] Cap behavior verified on Preview (`GENERATION_MAX_CONCURRENCY=0` → friendly 503), override removed
- [ ] One real 5-concurrent burst on Preview serializes cleanly (batches of 3)
- [ ] Magic-link limiter refuses past threshold; first-time users unaffected
- [ ] Turnstile keys set in prod (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`) or accept it no-ops
- [ ] Glance at the §5 SQL on the live DB — slots drain to 0, no cram backlog
```
