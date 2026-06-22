# Anon-Trial / TikTok-Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple the anonymous free-pack quota from the visitor's IP (device-cookie keyed, with an IP ceiling as abuse backstop) so co-located TikTok visitors don't collide, and turn the post-trial dead-end into a signup CTA.

**Architecture:** A server-set `lernly_did` cookie is the per-device quota key (1 free pack). `check_anonymous_quota(device_id, ip)` enforces the device limit plus a generous IP ceiling (50/24h); Turnstile (already mandatory in prod) is the human gate. DB change is additive (new function overloads + nullable column) so it's applied before merge and the old code keeps working.

**Tech Stack:** Next.js 16 App Router (route handler + client component), Supabase Postgres (SECURITY DEFINER RPCs), `tsx --test` (node:test) for unit tests.

## Global Constraints

- Migration filenames: 14-digit timestamp `YYYYMMDDhhmmss_<name>.sql` (verbatim rule).
- Additive / backward-compatible migrations only; the shared prod DB is hit on apply, so the currently-deployed code must keep working (keep the old `check_anonymous_quota(text)` / `bump_anonymous_usage(text,text)` overloads).
- Never commit to `main`; work on branch `anon-trial-tiktok-gate` (already created).
- App chrome stays German; code + comments English.
- Free plan = **2 packs/month** (the anon signup CTA must say 2, not the stale "3").
- Device cookie is not a security boundary; do not present it as one in code comments.
- SECURITY DEFINER functions set `search_path = public`.

---

### Task 1: Device-trial helper lib (`src/lib/anonTrial.ts`)

Pure, unit-testable helpers: the cookie name, device-id validation, cookie parsing, and cookie options. This is the only fully unit-testable unit; later tasks consume it.

**Files:**
- Create: `src/lib/anonTrial.ts`
- Test: `src/lib/anonTrial.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ANON_DEVICE_COOKIE: string` (= `"lernly_did"`)
  - `isValidDeviceId(value: string | null | undefined): boolean`
  - `parseDeviceIdFromCookie(cookieHeader: string | null): string | null`
  - `deviceCookieOptions(): { httpOnly: boolean; secure: boolean; sameSite: "lax"; path: string; maxAge: number }`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/anonTrial.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ANON_DEVICE_COOKIE,
  isValidDeviceId,
  parseDeviceIdFromCookie,
  deviceCookieOptions,
} from "./anonTrial";

const VALID = "123e4567-e89b-12d3-a456-426614174000";

test("isValidDeviceId accepts a uuid, rejects junk/empty/nullish", () => {
  assert.equal(isValidDeviceId(VALID), true);
  assert.equal(isValidDeviceId("not-a-uuid"), false);
  assert.equal(isValidDeviceId(""), false);
  assert.equal(isValidDeviceId(null), false);
  assert.equal(isValidDeviceId(undefined), false);
});

test("parseDeviceIdFromCookie extracts a valid id from a Cookie header", () => {
  assert.equal(parseDeviceIdFromCookie(`${ANON_DEVICE_COOKIE}=${VALID}`), VALID);
  assert.equal(
    parseDeviceIdFromCookie(`foo=bar; ${ANON_DEVICE_COOKIE}=${VALID}; baz=1`),
    VALID,
  );
});

test("parseDeviceIdFromCookie returns null for missing/invalid", () => {
  assert.equal(parseDeviceIdFromCookie(null), null);
  assert.equal(parseDeviceIdFromCookie("other=1"), null);
  assert.equal(parseDeviceIdFromCookie(`${ANON_DEVICE_COOKIE}=garbage`), null);
});

test("deviceCookieOptions is HttpOnly, SameSite=Lax, 1-year", () => {
  const o = deviceCookieOptions();
  assert.equal(o.httpOnly, true);
  assert.equal(o.secure, true);
  assert.equal(o.sameSite, "lax");
  assert.equal(o.path, "/");
  assert.equal(o.maxAge, 365 * 24 * 60 * 60);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/anonTrial.test.ts`
Expected: FAIL — cannot find module `./anonTrial`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/anonTrial.ts
// Anonymous-trial device identity. The lernly_did cookie is the per-device key
// for the anonymous free-pack quota (see check_anonymous_quota). It is NOT a
// security boundary — clearing it grants another try; Turnstile + the IP
// ceiling are the real cost caps. It only stops honest co-located users (same
// campus / NAT IP) from colliding on a single IP-based quota.

export const ANON_DEVICE_COOKIE = "lernly_did";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A device id we mint is always a UUID. Reject anything else so a junk or
// tampered cookie falls back to "new device" instead of being trusted.
export function isValidDeviceId(value: string | null | undefined): boolean {
  return typeof value === "string" && UUID_RE.test(value);
}

// Pull a valid lernly_did out of a raw Cookie header, or null.
export function parseDeviceIdFromCookie(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${ANON_DEVICE_COOKIE}=([^;]+)`),
  );
  const value = match?.[1];
  return value && isValidDeviceId(value) ? value : null;
}

// Cookie options for persisting the device id (server-set, HttpOnly).
export function deviceCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/anonTrial.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/lib/anonTrial.ts src/lib/anonTrial.test.ts
git commit -m "feat(anon): device-trial cookie helpers (lernly_did)"
```

---

### Task 2: Additive DB migration (device-scoped anonymous quota)

Add `device_id` to `anonymous_generations` and new 2-arg/3-arg function overloads. The old overloads stay so the live code keeps working until the new code deploys.

**Files:**
- Create: `supabase/migrations/20260622191000_anon_device_quota.sql`

**Interfaces:**
- Produces (called from Task 3):
  - `check_anonymous_quota(p_device_id text, p_ip text) returns json` → `{ok:true}` | `{ok:false, reason:'anon_device_limit', retry_after_seconds:int}` | `{ok:false, reason:'anon_ip_ceiling', retry_after_seconds:int}`
  - `bump_anonymous_usage(p_device_id text, p_ip text, p_user_agent text) returns void`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260622191000_anon_device_quota.sql
-- =========================================================================
-- Device-scoped anonymous trial quota (TikTok-gate)
-- =========================================================================
-- The old quota was keyed on IP (1/IP/24h), so co-located visitors (campus /
-- dorm / carrier NAT) collided on one quota. Re-key the per-user quota on a
-- device cookie (lernly_did) and keep a generous IP ceiling as the abuse
-- backstop. ADDITIVE: new column + NEW function overloads (by arity); the old
-- check_anonymous_quota(text) / bump_anonymous_usage(text,text) stay so the
-- currently-deployed code keeps working. Apply BEFORE merging the new code.
-- =========================================================================

alter table public.anonymous_generations
  add column if not exists device_id text;

create index if not exists anonymous_generations_device_created_idx
  on public.anonymous_generations(device_id, created_at desc);

-- New 2-arg check: device limit first (the per-user key), then the IP ceiling.
create or replace function public.check_anonymous_quota(p_device_id text, p_ip text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_hours int := 24;
  v_device_limit int := 1;   -- free packs per device / window
  v_ip_ceiling   int := 50;  -- abuse backstop per IP / window
  v_device_count int;
  v_ip_count int;
  v_oldest timestamptz;
  v_retry_after int;
begin
  -- Device quota (per honest user). A blank device id can't be device-limited,
  -- so it falls through to the IP ceiling only.
  if p_device_id is not null and length(p_device_id) > 0 then
    select count(*) into v_device_count
      from public.anonymous_generations
      where device_id = p_device_id
        and created_at > now() - (v_window_hours || ' hours')::interval;
    if v_device_count >= v_device_limit then
      select min(created_at) into v_oldest
        from public.anonymous_generations
        where device_id = p_device_id
          and created_at > now() - (v_window_hours || ' hours')::interval;
      v_retry_after := ceil(extract(epoch from
        (v_window_hours || ' hours')::interval - (now() - v_oldest)))::int;
      return json_build_object(
        'ok', false, 'reason', 'anon_device_limit',
        'retry_after_seconds', v_retry_after
      );
    end if;
  end if;

  -- IP ceiling (abuse backstop, independent of device).
  if p_ip is not null and length(p_ip) > 0 then
    select count(*) into v_ip_count
      from public.anonymous_generations
      where ip_address = p_ip
        and created_at > now() - (v_window_hours || ' hours')::interval;
    if v_ip_count >= v_ip_ceiling then
      return json_build_object(
        'ok', false, 'reason', 'anon_ip_ceiling',
        'retry_after_seconds', 3600
      );
    end if;
  end if;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.check_anonymous_quota(text, text) from public;
grant execute on function public.check_anonymous_quota(text, text) to anon, authenticated;

-- New 3-arg bump: records device_id alongside ip + user agent.
create or replace function public.bump_anonymous_usage(
  p_device_id text, p_ip text, p_user_agent text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.anonymous_generations(device_id, ip_address, user_agent)
    values (p_device_id, coalesce(p_ip, ''), p_user_agent);
end;
$$;

revoke all on function public.bump_anonymous_usage(text, text, text) from public;
grant execute on function public.bump_anonymous_usage(text, text, text) to anon, authenticated;
```

- [ ] **Step 2: Sanity-check the SQL locally (syntax only)**

Run: `grep -c "create or replace function" supabase/migrations/20260622191000_anon_device_quota.sql`
Expected: `2`

- [ ] **Step 3: Commit (do NOT apply to prod yet — that's a gated manual step in Task 5)**

```bash
git add supabase/migrations/20260622191000_anon_device_quota.sql
git commit -m "feat(anon): additive migration for device-scoped quota + IP ceiling"
```

---

### Task 3: Wire the anonymous path in `/api/generate`

Read/mint the device id, call the new 2-arg quota function, map the two block reasons, bump with the device id, and set the cookie on the success response. Remove the now-unused `ANON_RATE_LIMIT_HOURS`.

**Files:**
- Modify: `src/app/api/generate/route.ts`

**Interfaces:**
- Consumes: `ANON_DEVICE_COOKIE`, `parseDeviceIdFromCookie`, `deviceCookieOptions` (Task 1); `check_anonymous_quota(device,ip)`, `bump_anonymous_usage(device,ip,ua)` (Task 2).
- Produces: a JSON error with `reason: "anon_signup_needed"` (HTTP 429) that the landing (Task 4) branches on; a `Set-Cookie: lernly_did=...` on the success response.

- [ ] **Step 1: Add the import**

Add after the existing `import { CRAM_ENABLED } ...` / other `@/lib` imports near the top:

```ts
import {
  ANON_DEVICE_COOKIE,
  parseDeviceIdFromCookie,
  deviceCookieOptions,
} from "@/lib/anonTrial";
```

- [ ] **Step 2: Declare the device id at function scope**

In `export async function POST(request: Request)`, next to the existing
`let reserved = false; let committed = false; let reservedUserId ...` block, add:

```ts
  let anonDeviceId: string | null = null;
```

- [ ] **Step 3: Replace the anon quota block**

Replace the current block (the `try { ... check_anonymous_quota ... }` that
starts at `const { data: anonQuota, error: anonErr } = await service.rpc("check_anonymous_quota", { p_ip: clientIp })` and ends at its `catch (e) { console.error("[/api/generate] anon rate-limit threw", e); }`) with:

```ts
      const deviceId =
        parseDeviceIdFromCookie(request.headers.get("cookie")) ??
        crypto.randomUUID();
      anonDeviceId = deviceId;
      try {
        const service = createServiceClient();
        const { data: anonQuota, error: anonErr } = await service.rpc(
          "check_anonymous_quota",
          { p_device_id: deviceId, p_ip: clientIp },
        );
        if (anonErr) {
          // Fails open (allows generation) — e.g. before the migration is
          // applied. Apply the migration before deploy so this stays closed.
          console.error("[/api/generate] anon quota check failed", anonErr);
        } else if (anonQuota && anonQuota.ok === false) {
          if (anonQuota.reason === "anon_device_limit") {
            return NextResponse.json(
              {
                error:
                  "Dein Gratis-Paket ist verbraucht. Erstell ein kostenloses Konto für 2 Pakete pro Monat — und um deine Pakete zu speichern.",
                reason: "anon_signup_needed",
              },
              { status: 429 },
            );
          }
          return NextResponse.json(
            {
              error:
                "Gerade zu viele Anfragen aus deinem Netzwerk. Bitte versuch es später nochmal.",
              reason: "anon_ip_ceiling",
              retryAfterSeconds: anonQuota.retry_after_seconds,
            },
            {
              status: 429,
              headers: {
                "Retry-After": String(anonQuota.retry_after_seconds ?? 3600),
              },
            },
          );
        }
      } catch (e) {
        console.error("[/api/generate] anon rate-limit threw", e);
      }
```

- [ ] **Step 4: Remove the now-unused `ANON_RATE_LIMIT_HOURS` constant**

Delete the line `const ANON_RATE_LIMIT_HOURS = 24;` (it was only used by the
old message, now replaced).

- [ ] **Step 5: Update the anon bump call**

Replace:

```ts
        const { error: anonBumpErr } = await service.rpc(
          "bump_anonymous_usage",
          { p_ip: clientIp, p_user_agent: userAgent.slice(0, 500) },
        );
```

with:

```ts
        const { error: anonBumpErr } = await service.rpc(
          "bump_anonymous_usage",
          {
            p_device_id: anonDeviceId,
            p_ip: clientIp,
            p_user_agent: userAgent.slice(0, 500),
          },
        );
```

- [ ] **Step 6: Set the device cookie on the success response**

Replace the final success return:

```ts
    return NextResponse.json({
      id: savedId ?? crypto.randomUUID(),
      saved: Boolean(savedId),
      pack,
      ...(wasTruncated ? { warning: MATERIAL_TRUNCATED_MSG } : {}),
    });
```

with:

```ts
    const res = NextResponse.json({
      id: savedId ?? crypto.randomUUID(),
      saved: Boolean(savedId),
      pack,
      ...(wasTruncated ? { warning: MATERIAL_TRUNCATED_MSG } : {}),
    });
    if (anonDeviceId) {
      res.cookies.set(ANON_DEVICE_COOKIE, anonDeviceId, deviceCookieOptions());
    }
    return res;
```

- [ ] **Step 7: Typecheck + tests + commit**

```bash
npx tsc --noEmit
npm test
git add src/app/api/generate/route.ts
git commit -m "feat(anon): device+ip quota in /api/generate, set lernly_did cookie"
```
Expected: tsc clean; tests still pass (158+4 from Task 1).

---

### Task 4: Landing signup CTA on `anon_signup_needed`

When the backend reports the device has used its free pack, show a signup CTA instead of the red error box.

**Files:**
- Modify: `src/app/landing-client.tsx`

**Interfaces:**
- Consumes: the `reason: "anon_signup_needed"` JSON from Task 3.
- Produces: nothing downstream.

- [ ] **Step 1: Add the `signupNeeded` state**

Next to `const [error, setError] = useState<string | null>(null);` add:

```ts
  const [signupNeeded, setSignupNeeded] = useState(false);
```

- [ ] **Step 2: Reset it at the start of a generation**

In `handleGenerate`, next to the existing `setError(null);` (just before the
`track("anon_generate_started", ...)` call) add:

```ts
    setSignupNeeded(false);
```

- [ ] **Step 3: Branch on the reason in the failure path**

Replace:

```ts
      if (!res.ok || !json.pack) {
        track("anon_generate_failed", {
          reason: json.reason ?? `http_${res.status}`,
        });
        throw new Error(
          json.error ??
            "Generierung fehlgeschlagen - bitte erneut versuchen.",
        );
      }
```

with:

```ts
      if (!res.ok || !json.pack) {
        track("anon_generate_failed", {
          reason: json.reason ?? `http_${res.status}`,
        });
        if (json.reason === "anon_signup_needed") {
          // Device used its free pack → convert the warm moment instead of a
          // dead-end error.
          setSignupNeeded(true);
          return;
        }
        throw new Error(
          json.error ??
            "Generierung fehlgeschlagen - bitte erneut versuchen.",
        );
      }
```

- [ ] **Step 4: Render the CTA next to the error box**

Find the existing error block (`{error && ( ... {error} ... )}`, around line 798)
and add immediately after it:

```tsx
      {signupNeeded && (
        <div
          className="mt-4 rounded-2xl p-4 text-[14px]"
          style={{
            background: "rgba(43, 52, 153, 0.16)",
            border: "1px solid rgba(91, 184, 216, 0.35)",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          <p className="mb-3 font-semibold">Dein Gratis-Paket ist verbraucht.</p>
          <p className="mb-3" style={{ color: "rgba(255,255,255,0.65)" }}>
            Erstell ein kostenloses Konto — 2 Pakete pro Monat und alle Pakete
            gespeichert.
          </p>
          <a
            href="/login?mode=register&next=/dashboard/claim"
            className="inline-flex items-center rounded-full px-5 py-2.5 text-[14px] font-semibold text-white"
            style={{ background: "var(--color-primary, #2B3499)" }}
          >
            Kostenloses Konto erstellen
          </a>
        </div>
      )}
```

- [ ] **Step 5: Typecheck + build + commit**

```bash
npx tsc --noEmit
npm run build
git add src/app/landing-client.tsx
git commit -m "feat(anon): signup CTA when the device's free trial is used up"
```
Expected: tsc clean; build green.

---

### Task 5: Verify end-to-end + apply migration

No code — the integration gate. The SQL + route + cookie logic can only be proven against a running DB.

- [ ] **Step 1: Apply the migration to the shared DB (gated manual step)**

This is the founder's call (touches the shared prod DB). It is additive and
backward-compatible, so it's applied before merging the code:

```bash
supabase db query --linked --file supabase/migrations/20260622191000_anon_device_quota.sql
```

- [ ] **Step 2: Push the branch + open a PR**

```bash
git push -u origin anon-trial-tiktok-gate
gh pr create --base main --head anon-trial-tiktok-gate \
  --title "Anon-trial / TikTok-gate: device-keyed quota + IP ceiling" \
  --body "Implements docs/superpowers/specs/2026-06-22-anon-trial-tiktok-gate-design.md. Requires the migration applied first."
```

- [ ] **Step 3: Verify on the Vercel preview (acceptance criteria)**

Against the preview URL, from the SAME network/IP:
- Browser A (fresh): generate one pack → succeeds; a `lernly_did` cookie is set.
- Browser A, second generate (same cookie) → blocked, shows the **signup CTA** (not a red error). [criterion 2]
- Browser B / incognito (different cookie, same IP) → generate succeeds. [criterion 1 — the collision fix]
- DevTools → Application → Cookies: `lernly_did` is HttpOnly, Secure, ~1-year expiry.

- [ ] **Step 4: Confirm no regression for logged-in users**

Logged-in generation still works (the anon branch is skipped) and counts against the normal quota.

---

## Self-Review

**Spec coverage:**
- Device-cookie per-user quota → Task 1 (helpers) + Task 3 (mint/read/set) + Task 2 (device count). ✓
- IP ceiling backstop (50) → Task 2 `v_ip_ceiling`. ✓
- Mandatory Turnstile → already live (unchanged); not re-implemented by design. ✓
- 1 free pack/device → Task 2 `v_device_limit := 1`. ✓
- Signup CTA instead of dead-end → Task 3 (reason) + Task 4 (UI). ✓
- Additive/backward-compatible DB, apply-before-merge → Task 2 (overloads) + Task 5 Step 1. ✓
- Cookie HttpOnly/Secure/Lax/1y → Task 1 `deviceCookieOptions` + Task 3 Step 6. ✓
- Free = 2 (not stale 3) → Task 3 Step 3 message. ✓
- Acceptance criteria 1–6 → Task 5 Steps 3–4. ✓

**Placeholder scan:** No TBD/TODO; all code blocks complete. The only location-relative instruction ("around line 798") is paired with a unique anchor string (`{error && ( ... )}`) and complete CTA code.

**Type consistency:** `anonDeviceId` (route) is `string | null`; `parseDeviceIdFromCookie` returns `string | null`; `crypto.randomUUID()` returns `string`, so `?? crypto.randomUUID()` yields `string` assigned into the `string | null` var — consistent. Quota reasons `anon_device_limit` / `anon_ip_ceiling` (SQL) map to response reasons `anon_signup_needed` / `anon_ip_ceiling`; the landing branches only on `anon_signup_needed`. Consistent.
