# Private /admin Founder Ops Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A private, founder-only `/admin` page showing own-DB ops metrics (users, active, packs, tutor, plan split, cram health) plus a health/links row, server-gated to the founder email, read-only, auto-refreshing.

**Architecture:** Server component at `src/app/admin/page.tsx` (standalone, no dashboard layout). It calls `getUser()`, and if the user isn't the founder it returns `notFound()` BEFORE constructing the service client. After the gate, `getAdminMetrics(createServiceClient())` runs all reads in parallel and the page renders metric cards + health/links + a tiny client auto-refresh component. Service-role key stays server-side (server component); the only client code is a dumb 60s `router.refresh()` timer.

**Tech Stack:** Next.js 16 App Router (RSC), Supabase (`@supabase/supabase-js` 2.104.1 service client; `auth.admin.listUsers` for active counts — migration-free), Tailwind v4 design tokens, lucide-react, `node:test` via `tsx --test`.

**Spec:** `docs/superpowers/specs/2026-06-01-admin-ops-dashboard-design.md`

**Conventions:**
- Tests: `node:test` + `node:assert/strict`, run with `npx tsx --test <file>` / `npm test`.
- No DB migrations (pure reads). No mutations.
- Server-only modules start with `import "server-only";`.
- Design tokens: bg `#0F1322`, card `#141930`, text `var(--color-text)`, dim `var(--color-text-dim)`, accent `var(--color-primary)`/`--color-primary-bright`, `var(--font-display)` for headings. lucide icons, NO emojis.
- CLAUDE.md: work on branch `feat/admin-ops-dashboard` (already created), never commit to main.

---

## File Structure

**Create:**
- `src/lib/admin/auth.ts` — founder gate (`ADMIN_EMAIL`, `isFounder`).
- `src/lib/admin/auth.test.ts` — gate tests.
- `src/lib/admin/metrics.ts` — `getAdminMetrics(service)` + `AdminMetrics` type + pure `monthStartISO(now)`.
- `src/lib/admin/metrics.test.ts` — pure helper tests.
- `src/components/admin/MetricCard.tsx` — presentational card.
- `src/components/admin/AdminAutoRefresh.tsx` — client 60s refresh + button + timestamp.
- `src/app/admin/page.tsx` — gate + fetch + layout.

**Modify:**
- `.env.local.example` — document optional `ADMIN_EMAIL`.

---

## Task 1: Founder gate (`isFounder`) — TDD

**Files:** Create `src/lib/admin/auth.ts`, `src/lib/admin/auth.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/admin/auth.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { isFounder } from "./auth";

test("isFounder accepts the founder email exactly", () => {
  assert.equal(isFounder("beleanrd@gmail.com"), true);
});

test("isFounder is case-insensitive and trims whitespace", () => {
  assert.equal(isFounder("  BELEANRD@Gmail.com  "), true);
});

test("isFounder rejects other emails", () => {
  assert.equal(isFounder("someone@else.com"), false);
});

test("isFounder rejects empty / null / undefined", () => {
  assert.equal(isFounder(""), false);
  assert.equal(isFounder(null), false);
  assert.equal(isFounder(undefined), false);
});
```

- [ ] **Step 2: Run it — expect FAIL**

Run: `npx tsx --test src/lib/admin/auth.test.ts`
Expected: cannot find module `./auth` / `isFounder` not a function.

- [ ] **Step 3: Implement**

Create `src/lib/admin/auth.ts`:

```ts
import "server-only";

// Founder-only gate for /admin. ADMIN_EMAIL overrides the hardcoded default so
// the allowed address can change without a code deploy; the fallback keeps the
// page locked to the founder even if the env var is never set.
export const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ?? "beleanrd@gmail.com"
)
  .trim()
  .toLowerCase();

export function isFounder(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}
```

- [ ] **Step 4: Run it — expect PASS**

Run: `npx tsx --test src/lib/admin/auth.test.ts`
Expected: 4 tests pass.

> Note: `import "server-only"` resolves fine under `tsx --test` (it's a no-op
> outside the Next bundler). If the test runner ever errors on it, that's a
> signal the module is being imported from a client component — not the case
> here.

- [ ] **Step 5: Commit**

```bash
cd /Users/rdb/lernly
git add src/lib/admin/auth.ts src/lib/admin/auth.test.ts
git commit -m "feat(admin): founder-email gate (isFounder)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Metrics helper `monthStartISO` — TDD

**Files:** Create `src/lib/admin/metrics.ts` (helper + type only for now), `src/lib/admin/metrics.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/admin/metrics.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { monthStartISO } from "./metrics";

test("monthStartISO returns the first instant of the month (UTC)", () => {
  const iso = monthStartISO(new Date("2026-06-15T13:45:00.000Z"));
  assert.equal(iso, "2026-06-01T00:00:00.000Z");
});

test("monthStartISO handles January", () => {
  const iso = monthStartISO(new Date("2026-01-31T23:59:59.000Z"));
  assert.equal(iso, "2026-01-01T00:00:00.000Z");
});
```

- [ ] **Step 2: Run it — expect FAIL**

Run: `npx tsx --test src/lib/admin/metrics.test.ts`
Expected: cannot find module / export.

- [ ] **Step 3: Implement the helper + type (DB function comes in Task 3)**

Create `src/lib/admin/metrics.ts`:

```ts
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// First instant of `now`'s month, UTC, as an ISO string — the boundary for
// "tutor messages this month" (tutor_usage.period_start).
export function monthStartISO(now: Date): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
}

export type AdminMetrics = {
  users: { total: number; today: number; last7d: number; last30d: number };
  active: { last24h: number; last7d: number };
  packs: { today: number; total: number; byExamType: Record<string, number> };
  tutorMessagesThisMonth: number;
  planSplit: { free: number; pro: number; team: number };
  cram: { total: number; failed: number; stuck: number };
};

// getAdminMetrics is added in Task 3.
export async function getAdminMetrics(
  service: SupabaseClient,
): Promise<AdminMetrics> {
  void service;
  throw new Error("not implemented");
}
```

- [ ] **Step 4: Run it — expect PASS**

Run: `npx tsx --test src/lib/admin/metrics.test.ts`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/rdb/lernly
git add src/lib/admin/metrics.ts src/lib/admin/metrics.test.ts
git commit -m "feat(admin): metrics module scaffold + monthStartISO helper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Implement `getAdminMetrics` (the real reads)

**Files:** Modify `src/lib/admin/metrics.ts`

Context: counts use `.select("*", { count: "exact", head: true })` + range
filters (returns `{ count }`, no rows). Group-bys select the one small column
and tally in JS. Active-user counts come from `service.auth.admin.listUsers`
(reads `auth.users.last_sign_in_at`; migration-free). Date boundaries are ISO
strings compared against `created_at`. `today` = since UTC midnight.

- [ ] **Step 1: Replace the stub `getAdminMetrics` with the implementation**

In `src/lib/admin/metrics.ts`, replace the entire stub function:

```ts
export async function getAdminMetrics(
  service: SupabaseClient,
): Promise<AdminMetrics> {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const dayMs = 24 * 60 * 60 * 1000;
  const todayStart = iso(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
  );
  const d7 = iso(new Date(now.getTime() - 7 * dayMs));
  const d30 = iso(new Date(now.getTime() - 30 * dayMs));
  const d1 = iso(new Date(now.getTime() - dayMs));
  const monthStart = monthStartISO(now);

  // Small helper: exact head-count with optional filters.
  const countUsers = async (gte?: string) => {
    let q = service
      .from("users")
      .select("*", { count: "exact", head: true });
    if (gte) q = q.gte("created_at", gte);
    const { count } = await q;
    return count ?? 0;
  };
  const countPacks = async (gte?: string) => {
    let q = service
      .from("study_packs")
      .select("*", { count: "exact", head: true });
    if (gte) q = q.gte("created_at", gte);
    const { count } = await q;
    return count ?? 0;
  };

  const [
    usersTotal,
    usersToday,
    users7,
    users30,
    packsTotal,
    packsToday,
    packRows,
    planRows,
    tutorRows,
    cramRows,
    authList,
  ] = await Promise.all([
    countUsers(),
    countUsers(todayStart),
    countUsers(d7),
    countUsers(d30),
    countPacks(),
    countPacks(todayStart),
    service.from("study_packs").select("exam_type"),
    service.from("users").select("plan"),
    service.from("tutor_usage").select("messages_used").gte("period_start", monthStart),
    service.from("cram_jobs").select("status, failed_chunks, updated_at"),
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  // Packs by exam_type
  const byExamType: Record<string, number> = {};
  for (const r of (packRows.data ?? []) as { exam_type: string | null }[]) {
    const k = r.exam_type ?? "unknown";
    byExamType[k] = (byExamType[k] ?? 0) + 1;
  }

  // Plan split (enum is free/pro/team)
  const planSplit = { free: 0, pro: 0, team: 0 };
  for (const r of (planRows.data ?? []) as { plan: string | null }[]) {
    if (r.plan === "pro") planSplit.pro++;
    else if (r.plan === "team") planSplit.team++;
    else planSplit.free++;
  }

  // Tutor messages this month
  const tutorMessagesThisMonth = (
    (tutorRows.data ?? []) as { messages_used: number | null }[]
  ).reduce((sum, r) => sum + (r.messages_used ?? 0), 0);

  // Cram health
  const cramAll = (cramRows.data ?? []) as {
    status: string | null;
    failed_chunks: number | null;
    updated_at: string | null;
  }[];
  const cram = {
    total: cramAll.length,
    failed: cramAll.filter(
      (c) => c.status === "failed" || (c.failed_chunks ?? 0) > 0,
    ).length,
    stuck: cramAll.filter(
      (c) =>
        (c.status === "queued" || c.status === "processing") &&
        c.updated_at != null &&
        new Date(c.updated_at).getTime() < now.getTime() - 60 * 60 * 1000,
    ).length,
  };

  // Active users from auth.users.last_sign_in_at (bucketed in JS)
  const authUsers = authList.data?.users ?? [];
  const active = {
    last24h: authUsers.filter(
      (u) => u.last_sign_in_at && u.last_sign_in_at >= d1,
    ).length,
    last7d: authUsers.filter(
      (u) => u.last_sign_in_at && u.last_sign_in_at >= d7,
    ).length,
  };

  return {
    users: { total: usersTotal, today: usersToday, last7d: users7, last30d: users30 },
    active,
    packs: { today: packsToday, total: packsTotal, byExamType },
    tutorMessagesThisMonth,
    planSplit,
    cram,
  };
}
```

> **Pagination note (documented limit, not silent):** `listUsers` fetches up to
> 1000 users/page; we read page 1 only. With <1000 users this is exact. Add a
> `// TODO: paginate when total > 1000` comment right above the `listUsers` call
> so the cap is visible. The user-total card still uses the exact `public.users`
> count, so only the *active* buckets are subject to this cap.

- [ ] **Step 2: Add the pagination TODO comment**

Immediately above the `service.auth.admin.listUsers(...)` line, add:
```ts
    // TODO: paginate when total users > 1000 (active buckets only read page 1).
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "admin/metrics" || echo "no metrics errors"`
Expected: "no metrics errors".

- [ ] **Step 4: Re-run the helper test (still green)**

Run: `npx tsx --test src/lib/admin/metrics.test.ts`
Expected: 2 pass (the helper is unchanged; the DB function isn't unit-tested — it's exercised by the manual check in Task 7).

- [ ] **Step 5: Commit**

```bash
cd /Users/rdb/lernly
git add src/lib/admin/metrics.ts
git commit -m "feat(admin): implement getAdminMetrics (users/active/packs/tutor/plan/cram)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `MetricCard` presentational component

**Files:** Create `src/components/admin/MetricCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { LucideIcon } from "lucide-react";

// Presentational metric tile. Big number + label + optional sub-line, on the
// app's card surface. `tone` colors the sub-line for health signals.
export default function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "good" | "warn";
}) {
  const subColor =
    tone === "warn"
      ? "var(--color-cat-coral)"
      : tone === "good"
        ? "var(--color-cat-teal)"
        : "var(--color-text-faint)";
  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: "#141930",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon
            size={15}
            strokeWidth={1.75}
            color="var(--color-text-faint)"
            aria-hidden
          />
        )}
        <span
          className="text-[11px] uppercase tracking-[0.16em]"
          style={{ color: "var(--color-text-faint)" }}
        >
          {label}
        </span>
      </div>
      <div
        className="mt-2 text-[28px] font-semibold leading-none"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-2 text-[12.5px]" style={{ color: subColor }}>
          {sub}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit 2>&1 | grep MetricCard || echo "ok"`
Run: `npx eslint src/components/admin/MetricCard.tsx`
Expected: clean. (Confirm `--color-cat-coral`/`--color-cat-teal` exist in globals.css — they do, used by the dashboard quota bar.)

- [ ] **Step 3: Commit**

```bash
cd /Users/rdb/lernly
git add src/components/admin/MetricCard.tsx
git commit -m "feat(admin): MetricCard presentational tile

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `AdminAutoRefresh` client component

**Files:** Create `src/components/admin/AdminAutoRefresh.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

// Re-runs the server component's queries every 60s via router.refresh(), plus a
// manual Reload button and a "last updated" clock. No data flows through here —
// it just triggers a server re-render, so no secrets are exposed client-side.
export default function AdminAutoRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [updated, setUpdated] = useState<string>("");

  const refresh = () => startTransition(() => router.refresh());

  // Stamp the time on mount and on every successful refresh cycle.
  useEffect(() => {
    setUpdated(new Date().toLocaleTimeString("de-DE"));
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
      setUpdated(new Date().toLocaleTimeString("de-DE"));
    }, 60_000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px]" style={{ color: "var(--color-text-faint)" }}>
        Aktualisiert: {updated || "…"}
      </span>
      <button
        type="button"
        onClick={() => {
          refresh();
          setUpdated(new Date().toLocaleTimeString("de-DE"));
        }}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition disabled:opacity-50"
        style={{ background: "var(--color-surface-2)", color: "var(--color-text)" }}
      >
        <RefreshCw size={13} strokeWidth={1.9} aria-hidden />
        {pending ? "Lädt…" : "Neu laden"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit 2>&1 | grep AdminAutoRefresh || echo "ok"`
Run: `npx eslint src/components/admin/AdminAutoRefresh.tsx`
Expected: clean. (The repo's eslint flags `setState` synchronously inside an effect in some files, but here `setUpdated` runs inside `setInterval`/handlers, not synchronously in the effect body — should be clean. If it flags the mount `setUpdated`, wrap it the same way other components do or accept the existing-pattern warning.)

- [ ] **Step 3: Commit**

```bash
cd /Users/rdb/lernly
git add src/components/admin/AdminAutoRefresh.tsx
git commit -m "feat(admin): AdminAutoRefresh (60s router.refresh + reload button)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: The `/admin` page (gate + fetch + layout)

**Files:** Create `src/app/admin/page.tsx`

Context: mirrors the gating pattern from `dashboard/settings/page.tsx`
(`getUser()` + `createServiceClient()`), but fails with `notFound()` instead of
`redirect`. `force-dynamic` so an ops page is never cached.

- [ ] **Step 1: Create the page**

```tsx
import { notFound } from "next/navigation";
import {
  Users,
  UserCheck,
  FileStack,
  MessageSquare,
  CreditCard,
  Zap,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getUser } from "@/lib/dal";
import { createServiceClient } from "@/lib/supabase/server";
import { isFounder } from "@/lib/admin/auth";
import { getAdminMetrics } from "@/lib/admin/metrics";
import MetricCard from "@/components/admin/MetricCard";
import AdminAutoRefresh from "@/components/admin/AdminAutoRefresh";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXAM_LABEL: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  essay: "Essay",
  open_questions: "Offene Fragen",
  oral: "Mündlich",
  open_book: "Open Book",
  unknown: "Unbekannt",
};

const LINKS: { label: string; href: string }[] = [
  { label: "PostHog", href: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.posthog.com" },
  { label: "Vercel", href: "https://vercel.com/rdbeleans-projects/lernly" },
  { label: "Sentry", href: "https://sentry.io/" },
  { label: "Anthropic", href: "https://console.anthropic.com/" },
  { label: "Supabase", href: "https://supabase.com/dashboard/project/ickucmnxschbbfpvsrze" },
];

export default async function AdminPage() {
  const user = await getUser();
  if (!user || !isFounder(user.email)) {
    notFound();
  }

  const metrics = await getAdminMetrics(createServiceClient());
  const cramHealthy = metrics.cram.failed === 0 && metrics.cram.stuck === 0;
  const examEntries = Object.entries(metrics.packs.byExamType).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1
          className="text-[26px] font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}
        >
          Lernly — Ops
        </h1>
        <AdminAutoRefresh />
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard
          label="Nutzer gesamt"
          value={metrics.users.total}
          sub={`+${metrics.users.today} heute · +${metrics.users.last7d} (7T) · +${metrics.users.last30d} (30T)`}
          icon={Users}
        />
        <MetricCard
          label="Aktiv (24h)"
          value={metrics.active.last24h}
          sub={`${metrics.active.last7d} in 7 Tagen`}
          icon={UserCheck}
        />
        <MetricCard
          label="Pakete heute"
          value={metrics.packs.today}
          sub={`${metrics.packs.total} gesamt`}
          icon={FileStack}
        />
        <MetricCard
          label="Tutor-Nachrichten"
          value={metrics.tutorMessagesThisMonth}
          sub="diesen Monat"
          icon={MessageSquare}
        />
        <MetricCard
          label="Plan: Free"
          value={metrics.planSplit.free}
          icon={Users}
        />
        <MetricCard
          label="Plan: Pro"
          value={metrics.planSplit.pro}
          icon={CreditCard}
        />
        <MetricCard
          label="Plan: Team"
          value={metrics.planSplit.team}
          icon={CreditCard}
        />
        <MetricCard
          label="Cram-Jobs"
          value={metrics.cram.total}
          sub={
            cramHealthy
              ? "keine Fehler"
              : `${metrics.cram.failed} fehlgeschlagen · ${metrics.cram.stuck} hängen`
          }
          tone={cramHealthy ? "good" : "warn"}
          icon={Zap}
        />
      </div>

      {/* Packs by exam type */}
      {examEntries.length > 0 && (
        <div
          className="mt-6 rounded-2xl border p-5"
          style={{ background: "#141930", borderColor: "rgba(255,255,255,0.06)" }}
        >
          <p
            className="mb-3 text-[11px] uppercase tracking-[0.16em]"
            style={{ color: "var(--color-text-faint)" }}
          >
            Pakete nach Prüfungsformat
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {examEntries.map(([type, n]) => (
              <span key={type} className="text-[14px]" style={{ color: "var(--color-text-dim)" }}>
                <span style={{ color: "var(--color-text)", fontWeight: 600 }}>{n}</span>{" "}
                {EXAM_LABEL[type] ?? type}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Health + links */}
      <div
        className="mt-6 rounded-2xl border p-5"
        style={{ background: "#141930", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          {cramHealthy ? (
            <CheckCircle2 size={16} strokeWidth={1.9} color="var(--color-cat-teal)" aria-hidden />
          ) : (
            <AlertTriangle size={16} strokeWidth={1.9} color="var(--color-cat-coral)" aria-hidden />
          )}
          <span className="text-[14px]" style={{ color: "var(--color-text)" }}>
            {cramHealthy
              ? "Cram: keine Fehler"
              : `Cram: ${metrics.cram.failed} fehlgeschlagen, ${metrics.cram.stuck} hängen`}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition hover:text-white"
              style={{ background: "var(--color-surface-2)", color: "var(--color-text-dim)" }}
            >
              {l.label}
              <ExternalLink size={12} strokeWidth={1.9} aria-hidden />
            </a>
          ))}
        </div>

        <p className="mt-3 text-[12px]" style={{ color: "var(--color-text-faint)" }}>
          Echtzeit „wer ist online" → PostHog. Diese Seite zeigt Zahlen,
          Wachstum und Health aus der eigenen DB.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "admin/page" || echo "no admin page errors"`
Expected: "no admin page errors". Confirm `--color-surface-2` exists in globals.css (it does — used by DashboardShell).

- [ ] **Step 3: Lint**

Run: `npx eslint src/app/admin/page.tsx`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
cd /Users/rdb/lernly
git add src/app/admin/page.tsx
git commit -m "feat(admin): /admin page — founder-gated metrics + health/links

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Env docs + full verification + manual gate check

**Files:** Modify `.env.local.example`

- [ ] **Step 1: Document the optional env var**

Append to `.env.local.example`:
```
# --- Admin ops dashboard (/admin) ---
# Founder email allowed to view /admin. Defaults to beleanrd@gmail.com if unset.
ADMIN_EMAIL=
```

- [ ] **Step 2: Full suite + typecheck + lint + build**

```bash
cd /Users/rdb/lernly
npm test                 # expect all pass incl. admin auth + metrics tests
npx tsc --noEmit         # expect 0 errors
npx eslint src/app/admin src/lib/admin src/components/admin
npm run build            # expect success; /admin shows as ƒ (Dynamic)
```
Expected: tests green, tsc 0 errors, lint clean on the new files, build OK.

- [ ] **Step 3: Confirm the service-role key is NOT in the client bundle**

```bash
cd /Users/rdb/lernly
grep -rl "SUPABASE_SERVICE_ROLE_KEY" .next/static 2>/dev/null && echo "LEAK!" || echo "no service key in client bundle ✓"
```
Expected: "no service key in client bundle ✓". (The page is a server component; the only client file is AdminAutoRefresh, which imports no secrets.)

- [ ] **Step 4: Manual gate verification (local dev) — use webapp-testing skill**

Start `npm run dev`. Using the `superpowers:webapp-testing` skill (real browser),
or manual session cookies, verify the gate three ways:
1. **Logged out** → GET `/admin` → **404** (Next not-found page).
2. **Logged in as a NON-founder** (any test account ≠ founder) → `/admin` → **404**.
3. **Logged in as `beleanrd@gmail.com`** → `/admin` → renders the metric grid +
   health/links; numbers are plausible vs the live DB; auto-refresh updates the
   "Aktualisiert" time after 60s; Reload button works; layout is clean at 380px.

Document the three outcomes. This is deliverable #4.

- [ ] **Step 5: Commit env doc (+ any fixups)**

```bash
cd /Users/rdb/lernly
git add .env.local.example
git commit -m "docs(admin): document optional ADMIN_EMAIL env var

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review notes (author)

- **Spec coverage:** `/admin` gated server-side → Task 1 + 6. Service-role reads → Task 3 + 6. Metric cards (users/active/packs/tutor/plan/cram) → Task 3 + 6. Health/links + PostHog note → Task 6. Auto-refresh → Task 5. Design tokens / mobile grid → Task 4 + 6. Founder-email env+fallback → Task 1. 404 on non-founder → Task 6. No migrations/mutations → whole plan is reads. Gate confirmation (deliverable #4) → Task 7 Step 4.
- **Type consistency:** `AdminMetrics` defined in Task 2, implemented in Task 3, consumed in Task 6 (field names match: `users.{total,today,last7d,last30d}`, `active.{last24h,last7d}`, `packs.{today,total,byExamType}`, `tutorMessagesThisMonth`, `planSplit.{free,pro,team}`, `cram.{total,failed,stuck}`). `isFounder(email: string|null|undefined)` (Task 1) called with `user.email` in Task 6. `MetricCard` props (Task 4) match all call sites in Task 6.
- **No placeholders:** every code step is complete; the only intentional "throw not implemented" stub in Task 2 is replaced in Task 3.
- **Token safety:** server component + `force-dynamic`; Task 7 Step 3 greps the built bundle to prove no service-key leak.
