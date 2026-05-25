# Cram-Mode Phase 3 — Live Dashboard UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show cram jobs live on the dashboard — packs grouped under their job with an "X von Y fertig" badge that updates by polling, finished packs immediately clickable, and a retry button for failed chunks.

**Architecture:** The dashboard is a server component, so live updates come from a new **client** component `CramJobsPanel` that polls `GET /api/cram/status` every ~4s while any job is active (and stops when none are). `study_packs`/`cram_jobs` both have `select_own` RLS, so the status route reads the user's own data. `study_packs` has **no UPDATE policy**, so retry goes through `POST /api/cram/retry` → a security-definer RPC `requeue_cram_chunk` that re-queues the failed chunk and rolls the job counters back; the Phase 1 cron worker then re-processes it.

**Tech Stack:** Next.js App Router (server page + client component), Supabase (RLS select-own + one security-definer RPC), `node:test` via `tsx --test`.

**Depends on:** Phases 1 (`cram_jobs`, queue columns, worker) and 2 (`/api/cram/start`, webhook materialization) — both deployed.

**Scope note:** Phase 3 of 4. No email (Phase 4). After this, a crammer watches packs complete live and can open finished ones immediately.

---

## File Structure

**Create:**
- `supabase/migrations/20260525_requeue_cram_chunk.sql` — `requeue_cram_chunk(p_pack_id)` RPC.
- `src/app/api/cram/status/route.ts` — GET: the user's recent cram jobs + their chunk summaries.
- `src/app/api/cram/retry/route.ts` — POST `{ packId }`: ownership-checked re-queue of a failed chunk.
- `src/components/dashboard/CramJobsPanel.tsx` — client component: polling + grouped rendering + retry.

**Modify:**
- `src/app/dashboard/page.tsx` — render `<CramJobsPanel />` after the quota bar (line ~407).

---

### Task 1: `requeue_cram_chunk` RPC migration

**Files:**
- Create: `supabase/migrations/20260525_requeue_cram_chunk.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Re-queue a single failed cram chunk: only acts on a 'failed' chunk, resets it
-- to 'queued' (attempts 0 so the worker re-claims it), and rolls the parent
-- job's failed counter back + un-marks it 'done'. Ownership is enforced by the
-- caller (the /api/cram/retry route) before this runs.
create or replace function public.requeue_cram_chunk(p_pack_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_job uuid;
begin
  update public.study_packs
    set status = 'queued', attempts = 0
    where id = p_pack_id and status = 'failed' and cram_job_id is not null
    returning cram_job_id into v_job;
  if v_job is null then
    return false;
  end if;
  update public.cram_jobs
    set failed_chunks = greatest(failed_chunks - 1, 0),
        status = 'queued',
        updated_at = now()
    where id = v_job;
  return true;
end;
$$;

revoke all on function public.requeue_cram_chunk(uuid) from public, anon, authenticated;
```

- [ ] **Step 2: Apply (user step)**

Run: `npx supabase db push` (or Supabase SQL editor).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260525_requeue_cram_chunk.sql
git commit -m "feat(cram): requeue_cram_chunk RPC for failed-chunk retry"
```

---

### Task 2: `GET /api/cram/status`

**Files:**
- Create: `src/app/api/cram/status/route.ts`

- [ ] **Step 1: Implement**

Create `src/app/api/cram/status/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient as createSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ChunkRow = {
  id: string;
  cram_job_id: string | null;
  chunk_label: string | null;
  status: string;
};

export async function GET() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // RLS (cram_jobs_select_own) scopes this to the caller. Show jobs from the
  // last 24h so a finished cram session stays visible briefly after completion.
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: jobs, error } = await supabase
    .from("cram_jobs")
    .select("id, status, total_chunks, done_chunks, failed_chunks, created_at")
    .neq("status", "awaiting_payment")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) {
    console.error("[cram/status] jobs query failed", error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  const jobIds = (jobs ?? []).map((j) => j.id);
  let chunks: ChunkRow[] = [];
  if (jobIds.length > 0) {
    const { data: chunkRows } = await supabase
      .from("study_packs")
      .select("id, cram_job_id, chunk_label, status")
      .in("cram_job_id", jobIds)
      .order("created_at", { ascending: true });
    chunks = (chunkRows ?? []) as ChunkRow[];
  }

  const shaped = (jobs ?? []).map((j) => ({
    id: j.id,
    status: j.status,
    total: j.total_chunks,
    done: j.done_chunks,
    failed: j.failed_chunks,
    createdAt: j.created_at,
    chunks: chunks
      .filter((c) => c.cram_job_id === j.id)
      .map((c) => ({ id: c.id, label: c.chunk_label, status: c.status })),
  }));

  return NextResponse.json({ jobs: shaped });
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/cram/status/route.ts`
Expected: tsc 0; eslint clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cram/status/route.ts
git commit -m "feat(cram): GET /api/cram/status — user's cram jobs + chunks"
```

---

### Task 3: `POST /api/cram/retry`

**Files:**
- Create: `src/app/api/cram/retry/route.ts`

- [ ] **Step 1: Implement**

Create `src/app/api/cram/retry/route.ts`:

```ts
import { NextResponse } from "next/server";
import {
  createClient as createSupabaseServer,
  createServiceClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { packId?: string };
  try {
    body = (await request.json()) as { packId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const packId = body.packId;
  if (!packId) return NextResponse.json({ error: "packId fehlt." }, { status: 400 });

  // Ownership check via the caller's RLS-scoped client (study_packs_select_own).
  const { data: pack } = await supabase
    .from("study_packs")
    .select("id, status, cram_job_id")
    .eq("id", packId)
    .single();
  if (!pack || !pack.cram_job_id) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  if (pack.status !== "failed") {
    return NextResponse.json({ error: "Nur fehlgeschlagene Pakete können wiederholt werden." }, { status: 409 });
  }

  // Re-queue atomically via service role (study_packs has no UPDATE RLS policy).
  const service = createServiceClient();
  const { data: ok, error } = await service.rpc("requeue_cram_chunk", { p_pack_id: packId });
  if (error) {
    console.error("[cram/retry] requeue failed", error);
    return NextResponse.json({ error: "Konnte nicht wiederholen." }, { status: 500 });
  }
  return NextResponse.json({ requeued: Boolean(ok) });
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/cram/retry/route.ts`
Expected: tsc 0; eslint clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cram/retry/route.ts
git commit -m "feat(cram): POST /api/cram/retry — re-queue a failed chunk"
```

---

### Task 4: `CramJobsPanel` client component

**Files:**
- Create: `src/components/dashboard/CramJobsPanel.tsx`

- [ ] **Step 1: Implement**

Create `src/components/dashboard/CramJobsPanel.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseJsonResponse } from "@/lib/safeJson";

type Chunk = { id: string; label: string | null; status: string };
type Job = {
  id: string;
  status: string;
  total: number;
  done: number;
  failed: number;
  createdAt: string;
  chunks: Chunk[];
};

const POLL_MS = 4000;

function jobActive(j: Job): boolean {
  return j.status === "queued" || j.status === "processing";
}

export default function CramJobsPanel() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/cram/status", { cache: "no-store" });
      const json = await parseJsonResponse<{ jobs?: Job[] }>(res);
      setJobs(json.jobs ?? []);
    } catch {
      /* transient — keep last state, try again next tick */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll only while at least one job is active; stop otherwise.
  useEffect(() => {
    const anyActive = jobs.some(jobActive);
    if (anyActive && !timer.current) {
      timer.current = setInterval(() => void load(), POLL_MS);
    } else if (!anyActive && timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [jobs, load]);

  const retry = async (packId: string) => {
    try {
      await fetch("/api/cram/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      void load();
    } catch {
      /* ignore; next poll reflects state */
    }
  };

  if (!loaded || jobs.length === 0) return null;

  return (
    <div className="mb-10 flex flex-col gap-4">
      {jobs.map((job) => {
        const finished = job.done + job.failed;
        const active = jobActive(job);
        return (
          <div
            key={job.id}
            className="overflow-hidden rounded-2xl"
            style={{ background: "rgba(20,22,28,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-white">
                {active && (
                  <span
                    className="inline-block h-3 w-3 animate-spin rounded-full"
                    style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }}
                    aria-hidden
                  />
                )}
                <span>Cram-Paket</span>
              </div>
              <div className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>
                {job.done} von {job.total} fertig
                {job.failed > 0 && (
                  <span style={{ color: "rgba(255,170,120,0.95)" }}> · {job.failed} fehlgeschlagen</span>
                )}
              </div>
            </div>
            <ul className="divide-y divide-white/5 border-t border-white/5">
              {job.chunks.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13.5px]">
                  <span className="min-w-0 truncate text-white/85">{c.label ?? "Paket"}</span>
                  {c.status === "ready" ? (
                    <a href={`/dashboard/pack/${c.id}`} className="shrink-0 font-semibold text-white underline-offset-2 hover:underline">
                      Öffnen →
                    </a>
                  ) : c.status === "failed" ? (
                    <button
                      type="button"
                      onClick={() => retry(c.id)}
                      className="shrink-0 rounded-full border border-white/20 px-3 py-1 text-[12px] font-medium text-white hover:bg-white/10"
                    >
                      Erneut versuchen
                    </button>
                  ) : (
                    <span className="shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>
                      wird erstellt …
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/components/dashboard/CramJobsPanel.tsx`
Expected: tsc 0; eslint clean (no `set-state-in-effect`: `load()` sets state inside an async callback invoked from the effect, not synchronously in the effect body — if the linter still flags it, wrap the initial `void load()` in a `queueMicrotask(() => void load())` to satisfy the rule).

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/CramJobsPanel.tsx
git commit -m "feat(cram): CramJobsPanel — live polling, grouped chunks, retry"
```

---

### Task 5: Wire the panel into the dashboard

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Import the panel**

Add near the top imports of `src/app/dashboard/page.tsx`:

```ts
import CramJobsPanel from "@/components/dashboard/CramJobsPanel";
```

- [ ] **Step 2: Render it after the quota bar**

Immediately AFTER the quota-bar block (the `<div>` that closes at line ~407, right before `{allPacks.length === 0 ? (`), insert:

```tsx
        <CramJobsPanel />
```

So the structure becomes: header → quota bar → `<CramJobsPanel />` → packs list. The panel renders nothing when the user has no recent cram jobs, so non-cram users see no change.

- [ ] **Step 3: Typecheck + lint + build**

Run: `npx tsc --noEmit && npx eslint src/app/dashboard/page.tsx && npm run build`
Expected: tsc 0; no new eslint errors; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat(cram): show CramJobsPanel on the dashboard"
```

---

### Task 6: Verification

**Files:** none.

- [ ] **Step 1: Full suite + build**

Run: `npm test && npm run build`
Expected: 61 tests pass; build succeeds with `/api/cram/status` and `/api/cram/retry` listed.

- [ ] **Step 2: Apply the RPC migration** (user): `npx supabase db push` (or SQL editor) — Task 1's `requeue_cram_chunk`.

- [ ] **Step 3: Manual** (after a Phase 2 cram checkout): on `/dashboard`, the cram job appears with a spinner + "0 von N fertig"; as the cron worker finishes chunks the badge climbs and rows flip to "Öffnen →" without a manual refresh; closing/reopening the tab shows the same state. Force a failure (e.g. temporarily break a chunk) → row shows "Erneut versuchen" → clicking it re-queues and the worker regenerates it.

- [ ] **Step 4: Confirm non-cram users unaffected:** a user with no cram jobs sees the dashboard exactly as before (panel renders null).

---

## Notes / Next Phase

- **Phase 4 (email + cleanup):** `resend` completion email when a job flips to `done` (sent from the worker after `complete_cram_chunk` marks done), plus a daily cron to expire `awaiting_payment` jobs older than 24h and delete their orphaned `study-uploads` objects.
- **Polling cost:** the panel only polls while a job is active and stops once all are done/failed, so an idle dashboard makes no repeated calls.
