# Launch Runbook — Load-Testing & Monitoring

How to simulate a traffic spike, confirm Lernly holds, and know at a glance
whether things are healthy. Written for the TikTok-spike scenario.

Stack reminder: **Vercel** (serverless, auto-scales) + **Supabase**
(PostgREST-over-HTTP, no app-managed connection pool) + **Anthropic Tier 2**
(Sonnet & Haiku each: **1K RPM / 450K ITPM / 90K OTPM**).

> ⛔ **MONEY-SAFETY RULE — read first.**
> **Never load-test the real `/api/generate` (or `/api/tutor`, `/api/cram`)**.
> Each generation costs ~**€0.16** in Anthropic spend and consumes your Tier-2
> rate limits. A load tool firing hundreds of them would burn real money and
> could rate-limit your live users. This guide tests **only cheap paths against
> real infra**, and tests the **cap / rate-limit / overload logic against a
> mock** (or the DB RPCs directly) — **zero Anthropic calls, zero spend.**

---

## 0. The one-paragraph mental model

The website and cheap API routes **scale horizontally on Vercel** — static
pages, dashboard, auth will not fall over from traffic. The only hard ceilings:
1. **Anthropic token limits** (the real bottleneck) — protected in code by the
   concurrency cap (`GENERATION_MAX_CONCURRENCY`, default 3) + per-user quotas.
   We verify this **without calling Anthropic**.
2. **Per-user/per-IP abuse limits** — anon generate (Turnstile + 1/IP/24h),
   magic-link (8/IP/h, 4/email/h). Verified via the DB RPCs, no email/LLM sent.
3. **Supabase** — PostgREST is HTTP, so no app connection pool to exhaust; the
   limit is request throughput on your Supabase plan, far above our volume.

"Load testing" = two separate things:
- **A. Cheap-traffic spike** (landing/dashboard/auth/static) → real load, safe.
- **B. Expensive-path logic** (cap, rate-limit, overload→friendly-503) → tested
  against a **mock**, never the live model.

---

## 1. Test A — cheap-traffic spike (safe, real infra)

These routes cost nothing per request. Hammer them for real.

Tool: `oha` (nice output) or `hey`.

```bash
# Landing (static/CDN — should be trivial)
npx oha -n 5000 -c 200 https://www.lernly-app.de/

# Auth page render (server component)
npx oha -n 2000 -c 100 https://www.lernly-app.de/login

# A static legal page (pure static)
npx oha -n 2000 -c 100 https://www.lernly-app.de/impressum
```

For an **authenticated** route under load (dashboard), you need a session
cookie. Grab one from your browser DevTools (the `sb-…-auth-token` cookies) and:

```bash
npx oha -n 1000 -c 50 -H "cookie: <paste sb-…-auth-token cookies>" \
  https://www.lernly-app.de/dashboard
```

> ⚠️ Even the dashboard does a few Supabase reads per request — keep this test
> modest (hundreds, not millions) so you load-test the app, not your Supabase
> quota. The dashboard does **no** Anthropic calls, so it's money-safe.

**Healthy:** 0% 5xx, p95 latency reasonable (landing sub-second; dashboard a few
hundred ms), throughput scales as Vercel adds instances.
**Alarm:** any `FUNCTION_INVOCATION_FAILED` / 500s, p95 climbing without
throughput rising, or Supabase error rate spiking (§4).

---

## 2. Test B — cap / rate-limit / overload logic (mocked, zero spend)

The expensive-path *protections* live in two places, both testable without
Anthropic:
- **The mechanism is the DB RPCs** (`acquire_generation_slot`,
  `check_rate_limit`) → test them directly (§2a). This IS the real logic the
  route runs.
- **The route wiring** (gate → friendly 503; overload → friendly 503) → test
  with the Anthropic call **mocked** (§2b) or via the env trick (§2c).

### 2a. Test the DB gates directly — the real mechanism, no LLM
Run in the Supabase SQL editor (or `supabase db query --linked`). These are the
exact functions `/api/generate` and `requestMagicLink` call.

```sql
-- CONCURRENCY CAP: acquire 3 (N=3), 4th must fail, release frees one.
select public.acquire_generation_slot(3) as a1,   -- true
       public.acquire_generation_slot(3) as a2,   -- true
       public.acquire_generation_slot(3) as a3,   -- true
       public.acquire_generation_slot(3) as a4;   -- FALSE  ← cap works
select public.release_generation_slot();
select public.acquire_generation_slot(3) as after_release; -- true
delete from public.generation_slots;              -- cleanup test slots

-- TTL self-heal: a leaked slot older than the TTL is swept on next acquire.
insert into public.generation_slots (acquired_at) values (now() - interval '20 minutes');
select public.acquire_generation_slot(3) as should_be_true_after_sweep; -- true
delete from public.generation_slots;

-- RATE LIMIT: max 4/window for one email → 5th false.
select public.check_rate_limit('magiclink:email:loadtest@x.de', 4, 3600); -- t
select public.check_rate_limit('magiclink:email:loadtest@x.de', 4, 3600); -- t
select public.check_rate_limit('magiclink:email:loadtest@x.de', 4, 3600); -- t
select public.check_rate_limit('magiclink:email:loadtest@x.de', 4, 3600); -- t
select public.check_rate_limit('magiclink:email:loadtest@x.de', 4, 3600); -- FALSE
delete from public.rate_limit_events where bucket = 'magiclink:email:loadtest@x.de';
```

**Healthy:** the Nth+1 call returns `false` every time; tables drain to 0 after
cleanup. (These were smoke-tested green when the migrations were applied.)

### 2b. Test the route wiring with a MOCKED Anthropic client
To prove the route returns the friendly 503 / serializes without spending: stub
the model call so it returns instantly and for free. `generatePack` takes an
injected `client`, and the route builds it from `@anthropic-ai/sdk`. In a local
test, replace the client's `messages.stream` with a fake that resolves canned
JSON. Pattern (node:test, `tsx --test`):

```ts
// Pseudo-shape — a fake Anthropic client that never hits the network.
const fakeClient = {
  messages: {
    stream: () => ({
      finalMessage: async () => ({
        content: [{ type: "text", text: '{"flashcards":[]}' }],
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 10 },
      }),
    }),
  },
} as unknown as import("@anthropic-ai/sdk").default;

// To simulate Anthropic OVERLOAD (verify friendly 503 path), throw instead:
const overloadedClient = {
  messages: { stream: () => { const e: any = new Error("overloaded"); e.status = 529; throw e; } },
} as any;
```

Drive `generatePack({ client: fakeClient, ... })` for the happy path, and
`overloadedClient` to confirm the route maps 429/529 → `BUSY_MSG` + 503 +
`retryable`. **No real key, no spend.** (If you want this as a committed test,
ask and I'll add `src/app/api/generate/route.test.ts` with the client injected.)

### 2c. End-to-end cap check on Preview — zero Anthropic, env trick
Prove the gate rejects *before* any model call, on a real deployment:
1. Vercel → Preview env → set `GENERATION_MAX_CONCURRENCY = 0`, redeploy.
2. Trigger one generation in the preview UI.
3. **Expect:** friendly German **503** ("Gerade ist viel los…"), `retryable:true`,
   `Retry-After: 20`, and **nothing in the Anthropic dashboard** (the gate
   returns before the call). Slot table stays empty.
4. **Remove the override** → Preview back to default 3.

This is the safest full-stack proof: the cap blocks at cap=0, so no call is ever
made, so it costs nothing.

### 2d. Magic-link end-to-end (one throwaway email, not a load test)
On the login page, request a link for `test+1@example.com` **5 times**. The 5th
returns the friendly "Zu viele Anfragen…" message, no further email sent.
Turnstile (if site key set) gates before the limiter. This sends ≤4 real emails
— fine; do **not** script thousands.

### 2e. The token math (why N=3, when to raise it)
Per pack, worst case (material at the 480K-char cap, two-pass = all tasks):

| Model  | Output tokens/pack | Spread over ~1–2 min |
|--------|--------------------|----------------------|
| Sonnet | ~52K (sim+blueprint+visualMap+quiz+essay) | ~26–52K/min |
| Haiku  | ~30K (cards+meta+analysis)                 | ~15–30K/min |

Sonnet OTPM (90K) binds. **N=3 → ~75K/min Sonnet worst case**, under 90K with
margin; realistic packs ~half. Raise the cap only after the Anthropic dashboard
shows sustained Sonnet OTPM **well under 90K** during a real (organic) spike.

---

## 3. Background jobs (cram) under load — no test needed
Cram is already async (Vercel cron `* * * * *`, claims 2 chunks/run,
`maxDuration=800`). A spike of purchases **queues** instead of spiking Anthropic;
the worker drains ~2 chunks/min. Just watch `cram_jobs` move
`queued → processing → ready` (SQL in §4). Don't load-test it — same money rule.

---

## 4. Dashboards — explicit healthy vs alarm

### Anthropic (console.anthropic.com → Usage / Billing)
| Metric | Healthy | ⚠️ Watch | 🔴 Alarm |
|--------|---------|----------|----------|
| **Sonnet OTPM** | < 60K/min | 60–85K/min | > 85K or any 429s in logs → lower `GENERATION_MAX_CONCURRENCY` |
| **Sonnet/Haiku ITPM** | < 300K/min | 300–420K | > 420K |
| **RPM** | < 200 | 200–800 | > 800 (won't happen at our volume) |
| **429 rate** | 0 | occasional, auto-retried | sustained 429 → cap too high or Anthropic-side incident |
| **Spend/day** | ~€0.16 × packs | 2× expected | ≫ expected = abuse / retry loop → check logs, set budget alert |

Set a **monthly budget + email alert** in Anthropic billing — your earliest
abuse warning.

### Vercel (Observability → Functions / Logs; Analytics)
| Metric | Healthy | ⚠️ Watch | 🔴 Alarm |
|--------|---------|----------|----------|
| **5xx error rate** | < 0.5% | 0.5–2% | > 2% or any `FUNCTION_INVOCATION_FAILED` |
| **Function duration `/api/generate`** | < 120s typical | 120–600s (big/vision PDFs) | hitting 800s = timeouts → material too large / Anthropic slow |
| **Function duration cheap routes** | < 500ms | 0.5–2s | > 2s sustained = downstream (Supabase) slow |
| **Invocations** | scales with campaign | — | flatlines while traffic rises = errors upstream |
| **Friendly 503s** | expected during a spike (this is the cap working) | — | only alarming if they appear with **no** traffic |

### Supabase (Reports / Database)
| Metric | Healthy | ⚠️ Watch | 🔴 Alarm |
|--------|---------|----------|----------|
| **API (PostgREST) error %** | < 1% | 1–5% | > 5% 4xx/5xx |
| **Query/response time** | < 100ms p95 | 100–500ms | > 500ms p95 = missing index / overload |
| **Connections** | N/A — HTTP/PostgREST, no app pool | — | only relevant if you ever add direct Postgres (`pg`/Prisma) |
| **`generation_slots` count** | 0 idle, ≤ 3 under load | briefly = 3 | stuck > 3 or never draining (TTL heals in ~15 min) = release bug |
| **`rate_limit_events` count** | small, self-sweeping | growing during a spike | unbounded growth = sweep not firing |

### Live health SQL (paste into Supabase SQL editor)
```sql
select count(*) as slots_in_use from public.generation_slots;            -- 0..3
select status, count(*) from public.cram_jobs group by status;           -- backlog
select count(*) as packs_last_hour from public.study_packs
  where created_at > now() - interval '1 hour';                          -- spike size
select count(*) as magiclink_last_hour from public.rate_limit_events
  where bucket like 'magiclink:%' and created_at > now() - interval '1 hour'; -- abuse
```

### PostHog (already wired) — product funnel: signups, generations, drop-off.

---

## 5. Monitoring gaps to close before launch
1. **Sentry DSN** — wired but dormant. Create a sentry.io project → set
   `NEXT_PUBLIC_SENTRY_DSN` (+ optional `SENTRY_ORG`/`SENTRY_PROJECT`/
   `SENTRY_AUTH_TOKEN` for source maps) in Vercel → redeploy. Add an alert rule
   "notify on any new issue" → email. Without it you have no runtime error
   visibility beyond raw Vercel logs.
2. **Uptime monitor** — none. BetterStack or UptimeRobot, HTTP 200 on
   `https://www.lernly-app.de/` every 1–3 min, email/SMS alert. **Do NOT** point
   it at `/api/generate` (costs money) — a cheap public route is the right
   liveness signal.
3. **Vercel Analytics** — optional (`npm i @vercel/analytics` + `<Analytics/>`);
   PostHog already covers product analytics.
4. **Anthropic budget alert** — set the monthly cap + email (see §4).

---

## 6. "We're getting hammered" — fast levers (no code change)
- **Generations brushing Anthropic limits** → lower `GENERATION_MAX_CONCURRENCY`
  (e.g. 2). Excess users get the friendly retry, not errors.
- **Anon-generation abuse** → already Turnstile + 1/IP/24h; can fully disable via
  `ANONYMOUS_GENERATION_ENABLED`.
- **Magic-link spam** → already capped; tighten `MAGICLINK_*` in
  `src/app/login/actions.ts` if a botnet rotates IPs.
- **Something on fire** → Vercel → Deployments → Promote/Rollback to a previous
  good production deploy (instant).

---

## 7. Pre-launch checklist
- [ ] Cheap-path load test (Test A) — 0% 5xx, latency healthy
- [ ] DB-gate tests (§2a) — cap rejects 4th, rate-limit rejects 5th, tables drain
- [ ] Cap end-to-end on Preview (§2c) — `=0` → friendly 503, no Anthropic call, override removed
- [ ] Magic-link manual check (§2d) — 5th refused, first users unaffected
- [ ] Sentry DSN set + alert rule
- [ ] Uptime monitor live on `/`
- [ ] Anthropic monthly budget + alert
- [ ] Turnstile keys in prod (or accept no-op)
- [ ] Glanced at §4 live SQL — slots drain to 0, no cram backlog
- [ ] **Never pointed a load tool at `/api/generate`** ✅
```
