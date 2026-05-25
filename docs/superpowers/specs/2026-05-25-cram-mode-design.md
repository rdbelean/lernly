# Cram-Mode — Design Spec

**Date:** 2026-05-25
**Status:** Approved (brainstorming) — ready for implementation planning
**Author:** rdb + Claude

---

## 1. Summary

A premium, paid "throw everything in" mode for students cramming for an exam. The student uploads **any amount** of course material; Lernly splits it into chunks, generates **one study pack per chunk** in the background (no request timeout, regardless of size or duration), shows live progress on the dashboard, and notifies the student (in-app + email) when done. Charged as a **flat one-time upcharge per cram-session**.

This is a flagship USP: "Wirf dein komplettes Klausur-Material rein — wir machen daraus deine Lernpakete, egal wie groß."

## 2. Goals

- Accept arbitrarily large uploads without hitting request/connection timeouts (the current synchronous `/api/generate` dies on large material — see `2026-05-25-storage-backed-uploads` work).
- Produce **multiple packs, one per file/chunk** (no risky cross-pack merging).
- Run generation **asynchronously** in the background; the student can close the tab and come back.
- Live dashboard status; in-app + email notification on completion.
- Monetize as a **flat premium price per cram-session** via the existing Stripe one-time-product mechanism.

## 3. Non-Goals

- Merging chunks into one giant coherent pack (explicitly rejected — multiple packs instead).
- Smart/semantic chapter detection (chunk by file + page-count only for v1).
- Moving normal single-pack generation to async (it stays synchronous, protected by the existing upfront size gate `MAX_PAGES_PER_PACK`/`MAX_CHARS_PER_PACK` in `src/app/api/generate/route.ts`). The shared `generatePack()` function (Phase 1) makes a future migration easy, but it is out of scope here.
- Real-time push (WebSocket/Supabase Realtime). Dashboard **polls**; email covers the "left the tab" case.

## 4. User Flow

1. On `/dashboard/new`, the student chooses **"Alles reinwerfen (Cram)"** (a mode toggle alongside the normal single-pack flow).
2. Drops in any number of files. Files upload **directly to Supabase Storage** (reuse the `study-uploads` bucket + `buildUploadPath` from the storage-uploads work).
3. Client calls `POST /api/cram/start` with the storage refs → server creates a `cram_jobs` row (`status='awaiting_payment'`), computes the chunk plan, and returns a **Stripe Checkout URL** for the flat cram price.
4. Student pays → Stripe redirects back to `/dashboard?cram=<jobId>`.
5. Stripe **webhook** (`/api/stripe/webhook`) receives `checkout.session.completed` for the cram product → flips the job to `status='queued'` and inserts one `study_packs` row per chunk (`status='queued'`).
6. **Vercel Cron** (`/api/cram/worker`, every minute) claims queued chunks, generates each via `generatePack()`, writes the pack content + `status='ready'`, bumps `cram_jobs.done_chunks`.
7. Dashboard lists the job's packs with a live **"X von Y fertig"** badge (polls every few seconds while active). Ready packs are immediately clickable.
8. When `done_chunks + failed_chunks == total_chunks` → job `status='done'` → send **"Deine Lernpakete sind fertig"** email (Resend).

If payment never completes, the job stays `awaiting_payment` and nothing is generated (a cleanup cron may expire stale `awaiting_payment` jobs + their uploads after 24h — see §10).

## 5. Data Model (Supabase migration)

New table:

```sql
create table public.cram_jobs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  status            text not null default 'awaiting_payment'
                      check (status in ('awaiting_payment','queued','processing','done','failed')),
  exam_type         text not null,
  extra_info        text,
  total_chunks      int  not null default 0,
  done_chunks       int  not null default 0,
  failed_chunks     int  not null default 0,
  chunk_plan        jsonb not null default '[]',  -- [{source_path,label,page_start,page_end}] computed at /api/cram/start
  stripe_session_id text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.cram_jobs enable row level security;
create policy cram_jobs_select_own on public.cram_jobs
  for select using (auth.uid() = user_id);
-- INSERT/UPDATE only via service role (start route + worker + webhook).
```

Extend `study_packs` (new nullable columns so existing single packs are unaffected):

```sql
alter table public.study_packs
  add column if not exists cram_job_id uuid references public.cram_jobs(id) on delete cascade,
  add column if not exists status text not null default 'ready'
      check (status in ('queued','processing','ready','failed')),
  add column if not exists chunk_label text,
  add column if not exists source_path text,   -- storage path of the source file
  add column if not exists page_start int,      -- null for whole-file / text chunks
  add column if not exists page_end int,
  add column if not exists attempts int not null default 0;
create index if not exists study_packs_queue_idx
  on public.study_packs (status, cram_job_id) where status in ('queued','processing');
```

> Existing single-generation packs default to `status='ready'`, so dashboard queries that filter `status='ready'` keep working unchanged.

Atomic claim RPC (prevents two cron runs grabbing the same chunk):

```sql
create or replace function public.claim_cram_chunks(p_limit int)
returns setof public.study_packs
language sql security definer set search_path = public as $$
  update public.study_packs sp
  set status = 'processing', attempts = sp.attempts + 1
  where sp.id in (
    select id from public.study_packs
    where status = 'queued'
    order by created_at
    for update skip locked
    limit p_limit
  )
  returning sp.*;
$$;
```

A small RPC `complete_cram_chunk(pack_id, ok boolean)` bumps `done_chunks`/`failed_chunks` and flips `cram_jobs.status` to `done` when `done+failed == total`.

## 6. Chunking (computed at `/api/cram/start`, materialized on payment)

`/api/cram/start` computes the plan from the storage refs + per-file page counts and stores it in `cram_jobs.chunk_plan`. The Stripe webhook later materializes one `queued` `study_packs` row per plan entry. Plan rules:

- **PDF, ≤ `CRAM_CHUNK_PAGES` (50) pages:** one chunk `(source_path, page_start=1, page_end=N)`.
- **PDF, > 50 pages:** split into consecutive ~50-page ranges → multiple chunks.
- **Text (.txt/.md):** one chunk per file (range = whole file). If a single text file exceeds `MAX_CHARS_PER_PACK` (250k), split by char ranges.
- Each chunk → one `study_packs` row (`status='queued'`, `cram_job_id`, range fields, `chunk_label` like `"Skript.pdf · S. 1–50"`).
- `cram_jobs.total_chunks` = number of chunks.

Page-range extraction uses **`pdf-lib`**: load the source PDF, copy the page subset into a temp `PDFDocument`, serialize to bytes → feed to the existing `extractPdfText` / vision path inside `generatePack()`. (`unpdf` stays for text extraction; `pdf-lib` only does the page slicing.)

A guard rail caps a single cram-session (e.g. `CRAM_MAX_CHUNKS = 30`); beyond that the start route returns a "bitte auf mehrere Sessions aufteilen" message before checkout.

## 7. Async Engine (Vercel Cron + Supabase queue)

- **Refactor first:** extract the core of `POST /api/generate` (the material-loop → analysis → `runGatedTasks` → Zod validation → save) into a reusable `generatePack(input): Promise<{ pack, id }>` in `src/lib/generatePack.ts`. Both the existing synchronous route and the cram worker call it. The existing route keeps its auth/quota/turnstile/size-gate wrapper.
- **Worker route** `POST /api/cram/worker`:
  - Auth: requires header `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron sends it). Reject otherwise.
  - `runtime='nodejs'`, `maxDuration=800` (same Fluid Compute requirement).
  - Calls `claim_cram_chunks(N)` (e.g. N=2). For each claimed chunk: download source from Storage (service role), slice page range (pdf-lib), `generatePack()`, persist pack content + `status='ready'`, `complete_cram_chunk(id, true)`. On throw: if `attempts < CRAM_MAX_ATTEMPTS` (3) leave it for re-claim by setting back to `queued`; else `status='failed'` + `complete_cram_chunk(id, false)`.
  - Returns a small JSON summary (claimed/done/failed counts) for observability.
- **Cron config** (`vercel.json`): `{ "crons": [{ "path": "/api/cram/worker", "schedule": "* * * * *" }] }` (every minute). Throughput: N chunks/run; a 6-chunk job finishes in a few minutes — acceptable for an async, notified flow.
- **Safety net:** because the worker only ever claims `queued` rows and re-queues transient failures, a crashed invocation self-heals on the next cron tick.

## 8. Billing

- New one-time Stripe product **`cram`** added to `CREDIT_PRODUCTS` / `VALID_CREDITS` and the price-id map (mirrors `sprint`). Price: **€6,99** (one env var `STRIPE_PRICE_CRAM`).
- `POST /api/cram/start` creates the `cram_jobs` row (`awaiting_payment`) with the computed `chunk_plan` persisted, then creates a Stripe Checkout session (mode `payment`) with `metadata: { cram_job_id }`, `success_url=/dashboard?cram=<id>`.
- The existing **webhook** (`/api/stripe/webhook`) gains a branch: on `checkout.session.completed` where `metadata.cram_job_id` is present → set job `queued` and insert one `queued` `study_packs` row per entry in `cram_jobs.chunk_plan`. Idempotent on `stripe_session_id` (re-delivered webhooks must not double-insert).
- Cost check: ~0,16€/pack → a 6-pack cram costs ~1€ against a €6,99 price; even 20 packs (~3,2€) keeps margin. `CRAM_MAX_CHUNKS=30` bounds worst-case cost.

## 9. Dashboard UX

- `/dashboard/new` gets a **mode toggle**: "Ein Paket" (current) | "Alles reinwerfen (Cram) · €6,99".
- Cram submit → upload to Storage → `POST /api/cram/start` → redirect to Stripe.
- `/dashboard` lists packs; cram packs are **grouped under their job** with a header badge **"Cram · X von Y fertig"**. While a job is `queued`/`processing`, the page **polls** `GET /api/cram/status?job=<id>` every ~4s and updates counts/states. Ready packs link to `/dashboard/pack/[id]`; `failed` chunks show "erneut versuchen" (re-queues that one row).
- A returning student sees the job state immediately (persisted), no live connection needed.

## 10. Notification

- **In-app:** the live badge + a "fertig"-state on the job header.
- **Email:** add **`resend`** (`RESEND_API_KEY`). When `complete_cram_chunk` flips a job to `done`, the worker sends one email: "Deine Lernpakete sind fertig (X Pakete)" with a dashboard link. Best-effort; failure to send is logged, not fatal.
- **Cleanup cron** (can share the worker or a second daily cron): delete `awaiting_payment` jobs older than 24h and remove their orphaned `study-uploads` objects.

## 11. New Dependencies / Config

- `pdf-lib` — PDF page-range slicing.
- `resend` — transactional email.
- Env: `CRON_SECRET`, `STRIPE_PRICE_CRAM`, `RESEND_API_KEY`.
- `vercel.json` with the cron entry.
- One Supabase migration (`cram_jobs`, `study_packs` columns, `claim_cram_chunks`, `complete_cram_chunk`).

## 12. Error Handling

- Per-chunk failure is isolated: `attempts` retry up to 3, then `failed`; other chunks still complete. Job ends `done` even with some `failed` (badge shows e.g. "5 von 6 fertig, 1 fehlgeschlagen").
- Payment-not-completed: job stays `awaiting_payment`, expired by cleanup cron; uploads removed.
- Worker auth: rejects without `CRON_SECRET`.
- Webhook: idempotent per `stripe_session_id` so retried webhooks don't double-enqueue.
- Oversized session (> `CRAM_MAX_CHUNKS`): rejected at `/api/cram/start` before payment.

## 13. Testing

- **Unit (node:test / `tsx --test`):** chunk-planner (files + page counts → chunk list with correct ranges/labels; oversized split; text-file char split; `CRAM_MAX_CHUNKS` guard). Pure function, fully testable.
- **Unit:** webhook cram branch builds the right queued rows from a plan (mock supabase).
- **Manual/integration:** enqueue a job, confirm cron claims & generates, dashboard polling reflects state, email fires, failed-chunk retry works.
- `generatePack()` refactor verified by the existing single-generation flow still working (regression).

## 14. Phasing (each phase shippable & testable)

1. **Foundation:** migration (tables/columns/RPCs) + refactor generation into `generatePack()` + `/api/cram/worker` + cron config. Test by manually inserting a `queued` pack row and watching the worker generate it.
2. **Paid flow:** `/dashboard/new` cram toggle + upload + chunk planner + `/api/cram/start` + `cram` Stripe product + webhook enqueue. End-to-end paid generation with in-app (no live polling yet).
3. **Live UX:** `/api/cram/status` + dashboard grouping, polling, badges, failed-chunk retry.
4. **Email:** Resend integration + completion email + `awaiting_payment` cleanup cron.

---

## Open Questions

None blocking. Tunables (defaults chosen): cram price €6,99, `CRAM_CHUNK_PAGES=50`, `CRAM_MAX_CHUNKS=30`, `CRAM_MAX_ATTEMPTS=3`, cron every minute claiming 2 chunks/run.
