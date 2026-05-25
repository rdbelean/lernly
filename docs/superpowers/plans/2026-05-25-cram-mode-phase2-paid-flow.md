# Cram-Mode Phase 2 — Paid Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the end-to-end paid cram flow: a student picks "Alles reinwerfen (Cram)", uploads any amount of material, pays a flat €6,99, and the upload is split into chunks and queued for the Phase 1 worker to generate.

**Architecture:** A pure chunk-planner (`src/lib/cramPlan.ts`) turns per-file page/char counts into a `chunk_plan`. `/api/cram/start` computes that plan (downloading files from Storage to read PDF page counts via `pdf-lib`), creates a `cram_jobs` row (`awaiting_payment`), and opens a Stripe Checkout session carrying `cram_job_id` in metadata. The existing Stripe webhook gains a branch: on payment for a session with `cram_job_id`, it flips the job to `queued` and materializes one `queued` `study_packs` row per plan entry — which the Phase 1 cron worker then picks up. `/dashboard/new` gets a mode toggle and a cram submit path that uploads to Storage (reusing the existing helper) and redirects to Stripe.

**Tech Stack:** Next.js App Router, Supabase (service role), Stripe (one-time `payment` checkout + webhook), `pdf-lib` (page counts), `node:test` via `tsx --test`.

**Depends on Phase 1** (`docs/superpowers/plans/2026-05-25-cram-mode-phase1-foundation.md`): `cram_jobs` + `study_packs` queue columns + the worker already exist and are deployed.

**Scope note:** This is Phase 2 of 4. It does NOT include live dashboard polling/badges (Phase 3) or email (Phase 4). After payment, the student lands on `/dashboard` and sees packs appear as the worker finishes them (no live polling yet — a manual refresh shows progress). Phases 3–4 are planned separately.

---

## File Structure

**Create:**
- `src/lib/cramPlan.ts` — `planChunks(files, opts)` pure function + types `CramFileMeta`, `ChunkPlanEntry`. One responsibility: file metadata → chunk plan.
- `src/lib/cramPlan.test.ts` — unit tests.
- `src/app/api/cram/start/route.ts` — auth + page counting + plan + `cram_jobs` insert + Stripe checkout.

**Modify:**
- `src/lib/stripe.ts` — add `getCramPriceId()` + `CRAM_PRICE_EUR`.
- `src/app/api/stripe/webhook/route.ts` — add the `cram_job_id` branch in `checkout.session.completed`.
- `src/app/dashboard/new/page.tsx` — mode toggle + cram submit path.
- `.env.local.example` — `STRIPE_PRICE_CRAM`.
- `supabase/migrations/20260525_pack_summaries_ready_only.sql` (create) — restrict `list_pack_summaries()` to `status = 'ready'` so in-progress cram rows don't pollute the dashboard before Phase 3.

---

### Task 1: Chunk planner (`src/lib/cramPlan.ts`)

**Files:**
- Create: `src/lib/cramPlan.ts`
- Test: `src/lib/cramPlan.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/cramPlan.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { planChunks, CRAM_CHUNK_PAGES, CRAM_MAX_CHUNKS } from "./cramPlan";

const opts = { chunkPages: CRAM_CHUNK_PAGES, maxChunks: CRAM_MAX_CHUNKS };

test("small PDF becomes one whole-file chunk", () => {
  const plan = planChunks(
    [{ path: "u/a.pdf", name: "a.pdf", pages: 12, chars: 0, isPdf: true }],
    opts,
  );
  assert.equal(plan.length, 1);
  assert.deepEqual(plan[0], {
    source_path: "u/a.pdf",
    label: "a.pdf",
    page_start: 1,
    page_end: 12,
  });
});

test("large PDF splits into chunkPages-sized ranges with labels", () => {
  const plan = planChunks(
    [{ path: "u/big.pdf", name: "big.pdf", pages: 120, chars: 0, isPdf: true }],
    { chunkPages: 50, maxChunks: 30 },
  );
  assert.equal(plan.length, 3); // 1-50, 51-100, 101-120
  assert.deepEqual(plan.map((c) => [c.page_start, c.page_end]), [
    [1, 50],
    [51, 100],
    [101, 120],
  ]);
  assert.equal(plan[0].label, "big.pdf · S. 1–50");
  assert.equal(plan[2].label, "big.pdf · S. 101–120");
});

test("text file becomes one whole-file chunk with null page range", () => {
  const plan = planChunks(
    [{ path: "u/notes.txt", name: "notes.txt", pages: 0, chars: 4000, isPdf: false }],
    opts,
  );
  assert.equal(plan.length, 1);
  assert.deepEqual(plan[0], {
    source_path: "u/notes.txt",
    label: "notes.txt",
    page_start: null,
    page_end: null,
  });
});

test("multiple files accumulate into multiple chunks", () => {
  const plan = planChunks(
    [
      { path: "u/a.pdf", name: "a.pdf", pages: 30, chars: 0, isPdf: true },
      { path: "u/b.pdf", name: "b.pdf", pages: 80, chars: 0, isPdf: true },
    ],
    { chunkPages: 50, maxChunks: 30 },
  );
  // a.pdf → 1 chunk; b.pdf → 2 chunks
  assert.equal(plan.length, 3);
});

test("exceeding maxChunks throws a CramTooLargeError", () => {
  assert.throws(
    () =>
      planChunks(
        [{ path: "u/huge.pdf", name: "huge.pdf", pages: 5000, chars: 0, isPdf: true }],
        { chunkPages: 50, maxChunks: 30 },
      ),
    /CramTooLargeError/,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/cramPlan.test.ts`
Expected: FAIL — `Cannot find module './cramPlan'`.

- [ ] **Step 3: Implement**

Create `src/lib/cramPlan.ts`:

```ts
// Pure chunk planner: turns per-file metadata into a cram chunk plan.
// One chunk per file; PDFs over `chunkPages` split into page ranges. Text files
// become a single whole-file chunk (page range null). Throws if the plan would
// exceed `maxChunks` (caller surfaces "split into multiple sessions").
export const CRAM_CHUNK_PAGES = 50;
export const CRAM_MAX_CHUNKS = 30;

export class CramTooLargeError extends Error {
  constructor(public chunkCount: number, public maxChunks: number) {
    super(`CramTooLargeError: ${chunkCount} > ${maxChunks}`);
    this.name = "CramTooLargeError";
  }
}

export type CramFileMeta = {
  path: string;
  name: string;
  pages: number; // 0 for non-PDF
  chars: number; // best-effort; only used for non-PDF sizing
  isPdf: boolean;
};

export type ChunkPlanEntry = {
  source_path: string;
  label: string;
  page_start: number | null;
  page_end: number | null;
};

export function planChunks(
  files: CramFileMeta[],
  opts: { chunkPages: number; maxChunks: number },
): ChunkPlanEntry[] {
  const plan: ChunkPlanEntry[] = [];
  for (const f of files) {
    if (!f.isPdf || f.pages <= 0) {
      plan.push({ source_path: f.path, label: f.name, page_start: null, page_end: null });
      continue;
    }
    if (f.pages <= opts.chunkPages) {
      plan.push({ source_path: f.path, label: f.name, page_start: 1, page_end: f.pages });
      continue;
    }
    for (let start = 1; start <= f.pages; start += opts.chunkPages) {
      const end = Math.min(start + opts.chunkPages - 1, f.pages);
      plan.push({
        source_path: f.path,
        label: `${f.name} · S. ${start}–${end}`,
        page_start: start,
        page_end: end,
      });
    }
  }
  if (plan.length > opts.maxChunks) {
    throw new CramTooLargeError(plan.length, opts.maxChunks);
  }
  return plan;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/cramPlan.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cramPlan.ts src/lib/cramPlan.test.ts
git commit -m "feat(cram): chunk planner (per-file + page-range split)"
```

---

### Task 2: Cram Stripe price helper

**Files:**
- Modify: `src/lib/stripe.ts`
- Modify: `.env.local.example`

- [ ] **Step 1: Add the cram price helper**

In `src/lib/stripe.ts`, after the `getCreditPriceId(...)` function, add:

```ts
// Cram-mode is a one-time premium upcharge — NOT a pack_credit. It triggers
// background job processing, so it has its own price + the webhook keys off the
// cram_job_id metadata (not off a credit product).
export const CRAM_PRICE_EUR = 6.99;

export function getCramPriceId(): string | null {
  return process.env.STRIPE_PRICE_CRAM ?? null;
}
```

- [ ] **Step 2: Document the env var**

Add to `.env.local.example` under the one-time credit-pack price IDs:

```
STRIPE_PRICE_CRAM=price_...               # Cram-Session (alles reinwerfen) 6,99€ einmalig
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/stripe.ts .env.local.example
git commit -m "feat(cram): cram one-time price helper + STRIPE_PRICE_CRAM"
```

---

### Task 3: `/api/cram/start` route

**Files:**
- Create: `src/app/api/cram/start/route.ts`

- [ ] **Step 1: Implement**

Create `src/app/api/cram/start/route.ts`:

```ts
import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { getStripe, getCramPriceId } from "@/lib/stripe";
import {
  createClient as createSupabaseServer,
  createServiceClient,
} from "@/lib/supabase/server";
import { STUDY_UPLOADS_BUCKET } from "@/lib/uploads";
import {
  planChunks,
  CramTooLargeError,
  CRAM_CHUNK_PAGES,
  CRAM_MAX_CHUNKS,
  type CramFileMeta,
} from "@/lib/cramPlan";
import type { ExamType } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60; // counting pages only — no LLM work here

type StartBody = {
  examType?: ExamType;
  extraInfo?: string;
  files?: { path: string; name?: string }[];
};

export async function POST(request: Request) {
  const stripe = getStripe();
  const priceId = getCramPriceId();
  if (!stripe || !priceId) {
    return NextResponse.json({ error: "Cram-Mode ist noch nicht konfiguriert." }, { status: 503 });
  }

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: StartBody;
  try {
    body = (await request.json()) as StartBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const examType = body.examType;
  const refs = Array.isArray(body.files) ? body.files : [];
  if (!examType) return NextResponse.json({ error: "Prüfungstyp fehlt." }, { status: 400 });
  if (refs.length === 0) return NextResponse.json({ error: "Keine Dateien." }, { status: 400 });

  const service = createServiceClient();

  // Read per-file page counts (PDFs) / sizes (text) to build the plan.
  const metas: CramFileMeta[] = [];
  for (const ref of refs) {
    if (typeof ref?.path !== "string" || !ref.path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Ungültiger Datei-Verweis." }, { status: 400 });
    }
    const name = ref.name ?? ref.path.split("/").pop() ?? "datei";
    const isPdf = name.toLowerCase().endsWith(".pdf");
    const dl = await service.storage.from(STUDY_UPLOADS_BUCKET).download(ref.path);
    if (dl.error || !dl.data) {
      return NextResponse.json({ error: `Datei nicht gefunden: ${name}` }, { status: 400 });
    }
    const buf = Buffer.from(await dl.data.arrayBuffer());
    let pages = 0;
    if (isPdf) {
      try {
        pages = (await PDFDocument.load(buf)).getPageCount();
      } catch {
        return NextResponse.json({ error: `PDF konnte nicht gelesen werden: ${name}` }, { status: 422 });
      }
    }
    metas.push({ path: ref.path, name, pages, chars: isPdf ? 0 : buf.byteLength, isPdf });
  }

  let plan;
  try {
    plan = planChunks(metas, { chunkPages: CRAM_CHUNK_PAGES, maxChunks: CRAM_MAX_CHUNKS });
  } catch (e) {
    if (e instanceof CramTooLargeError) {
      return NextResponse.json(
        {
          error: `Das ist sehr viel Material (${e.chunkCount} Pakete). Bitte teile es auf mehrere Cram-Sessions auf (max. ${e.maxChunks} Pakete pro Session).`,
          reason: "cram_too_large",
        },
        { status: 413 },
      );
    }
    throw e;
  }

  // Create the job (awaiting_payment) with the plan persisted.
  const { data: job, error: jobErr } = await service
    .from("cram_jobs")
    .insert({
      user_id: user.id,
      status: "awaiting_payment",
      exam_type: examType,
      extra_info: body.extraInfo ?? null,
      total_chunks: plan.length,
      chunk_plan: plan,
    })
    .select("id")
    .single();
  if (jobErr || !job) {
    console.error("[cram/start] job insert failed", jobErr);
    return NextResponse.json({ error: "Konnte Job nicht anlegen." }, { status: 500 });
  }

  // Ensure a Stripe customer (same pattern as /api/stripe/checkout).
  const { data: profile } = await service.from("users").select("stripe_customer_id").eq("id", user.id).single();
  let customerId = profile?.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
    customerId = customer.id;
    await service.from("users").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?cram=${job.id}`,
    cancel_url: `${origin}/dashboard/new?cram_cancelled=1`,
    client_reference_id: user.id,
    metadata: { user_id: user.id, cram_job_id: job.id as string },
  });

  // Record the session id so the webhook can be idempotent.
  await service.from("cram_jobs").update({ stripe_session_id: session.id }).eq("id", job.id);

  if (!session.url) return NextResponse.json({ error: "Keine Checkout-URL." }, { status: 500 });
  return NextResponse.json({ url: session.url, jobId: job.id });
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/cram/start/route.ts`
Expected: tsc exit 0; eslint clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cram/start/route.ts
git commit -m "feat(cram): /api/cram/start — plan chunks, create job, open checkout"
```

---

### Task 4: Webhook branch — materialize chunks on payment

**Files:**
- Modify: `src/app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Add a cram handler function**

In `src/app/api/stripe/webhook/route.ts`, add this function alongside `grantCreditsFromSession` (inside `POST`, same scope, so it can use `service`):

```ts
  async function activateCramJob(session: Stripe.Checkout.Session): Promise<void> {
    const jobId = session.metadata?.cram_job_id;
    if (!jobId) return;

    // Idempotent: only materialize from an awaiting_payment job. A re-delivered
    // webhook finds the job already 'queued' and does nothing.
    const { data: job } = await service
      .from("cram_jobs")
      .select("id, user_id, status, chunk_plan")
      .eq("id", jobId)
      .single();
    if (!job || job.status !== "awaiting_payment") return;

    const plan = (job.chunk_plan ?? []) as {
      source_path: string;
      label: string;
      page_start: number | null;
      page_end: number | null;
    }[];

    const rows = plan.map((c) => ({
      user_id: job.user_id,
      cram_job_id: job.id,
      status: "queued",
      source_path: c.source_path,
      page_start: c.page_start,
      page_end: c.page_end,
      chunk_label: c.label,
      title: "wird erstellt …",
      exam_type: "essay", // overwritten by the worker with the real pack
      pack_data: {},
    }));

    const { error: insErr } = await service.from("study_packs").insert(rows);
    if (insErr) {
      console.error("[stripe webhook] cram chunk insert failed", insErr);
      return;
    }
    await service.from("cram_jobs").update({ status: "queued", updated_at: new Date().toISOString() }).eq("id", job.id);
  }
```

- [ ] **Step 2: Branch on cram in the payment case**

Replace the `else if (session.mode === "payment")` arm:

```ts
      } else if (session.mode === "payment") {
        await grantCreditsFromSession(session);
      }
```

with:

```ts
      } else if (session.mode === "payment") {
        if (session.metadata?.cram_job_id) {
          await activateCramJob(session);
        } else {
          await grantCreditsFromSession(session);
        }
      }
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/stripe/webhook/route.ts`
Expected: tsc exit 0; eslint clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "feat(cram): webhook materializes queued chunks on cram payment"
```

---

### Task 5: Hide in-progress cram packs from the dashboard list

The dashboard lists packs via the `list_pack_summaries()` RPC (`src/app/dashboard/page.tsx:292`), which returns ALL of the user's `study_packs` with no status filter. Once Task 4 starts inserting `queued` cram rows (empty `pack_data`, title "wird erstellt …"), they would appear as broken packs. Restrict the RPC to finished packs until Phase 3 adds the proper grouped UI.

**Files:**
- Create: `supabase/migrations/20260525_pack_summaries_ready_only.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260525_pack_summaries_ready_only.sql`:

```sql
-- Restrict the dashboard pack list to finished packs. Cram-mode introduces
-- queued/processing/failed study_packs rows (empty pack_data) that must not
-- show as normal packs until Phase 3's grouped UI lands.
create or replace function public.list_pack_summaries()
returns table (
  id          uuid,
  title       text,
  exam_type   text,
  created_at  timestamptz,
  card_count  int
)
language sql
security definer
set search_path = public
as $$
  select
    sp.id,
    sp.title,
    sp.exam_type,
    sp.created_at,
    coalesce(jsonb_array_length(sp.pack_data->'flashcards'), 0)::int as card_count
  from public.study_packs sp
  where sp.user_id = auth.uid()
    and sp.status = 'ready'
  order by sp.created_at desc;
$$;

grant execute on function public.list_pack_summaries() to authenticated;
```

- [ ] **Step 2: Apply (user step)**

Run: `npx supabase db push` (or paste into the Supabase SQL editor). Existing single packs all have `status='ready'` (Phase 1 default), so this is non-breaking.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260525_pack_summaries_ready_only.sql
git commit -m "feat(cram): list_pack_summaries returns only ready packs"
```

---

### Task 6: `/dashboard/new` — cram mode toggle + submit

**Files:**
- Modify: `src/app/dashboard/new/page.tsx`

- [ ] **Step 1: Add cram mode state + toggle UI**

Add a state near the existing ones: `const [mode, setMode] = useState<"single" | "cram">("single");`. Above the exam-type / dropzone area, render a two-button toggle:

```tsx
<div className="mb-6 flex gap-2">
  <button
    type="button"
    onClick={() => setMode("single")}
    className={`rounded-lg px-4 py-2 text-[14px] font-semibold ${mode === "single" ? "bg-white text-[color:var(--color-ln-bg-bot)]" : "border border-white/15 text-white"}`}
  >
    Ein Paket
  </button>
  <button
    type="button"
    onClick={() => setMode("cram")}
    className={`rounded-lg px-4 py-2 text-[14px] font-semibold ${mode === "cram" ? "bg-white text-[color:var(--color-ln-bg-bot)]" : "border border-white/15 text-white"}`}
  >
    Alles reinwerfen (Cram) · €6,99
  </button>
</div>
{mode === "cram" && (
  <p className="mb-4 text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
    Wirf dein komplettes Klausur-Material rein — wir machen pro Kapitel ein Lernpaket.
    Läuft im Hintergrund; du bekommst Bescheid, wenn alles fertig ist.
  </p>
)}
```

- [ ] **Step 2: Add the cram submit handler**

Add `submitCram` next to the existing `submit`. It reuses the existing storage-upload loop, then calls `/api/cram/start` and redirects to Stripe:

```ts
  const submitCram = async () => {
    if (files.length === 0) {
      setError("Mindestens eine Datei hochladen.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { createClient } = await import("@/lib/supabase/browser");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login?next=/dashboard/new";
        return;
      }
      const refs: { path: string; name: string }[] = [];
      for (const file of files) {
        const path = buildUploadPath(user.id, file.name);
        const { error: upErr } = await supabase.storage
          .from(STUDY_UPLOADS_BUCKET)
          .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
        if (upErr) throw new Error(`Upload fehlgeschlagen (${file.name}): ${upErr.message}`);
        refs.push({ path, name: file.name });
      }
      const res = await fetch("/api/cram/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examType, extraInfo: extraInfo.trim() || undefined, files: refs }),
      });
      const json = await parseJsonResponse<{ url?: string; error?: string }>(res);
      if (!res.ok || !json.url) throw new Error(json.error ?? `HTTP ${res.status}`);
      window.location.href = json.url; // → Stripe checkout
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      setBusy(false);
    }
  };
```

- [ ] **Step 3: Wire the primary button to the active mode**

Find the existing submit button (the one calling `submit`) and change its handler to:

```ts
onClick={mode === "cram" ? submitCram : submit}
```

and make its label mode-aware, e.g. `{mode === "cram" ? "Alles reinwerfen · €6,99 →" : "<existing label>"}`. (`parseJsonResponse`, `STUDY_UPLOADS_BUCKET`, `buildUploadPath` are already imported in this file from Phase storage work — verify the imports exist; if `parseJsonResponse` import is missing, add `import { parseJsonResponse } from "@/lib/safeJson";`.)

- [ ] **Step 4: Typecheck + lint + build**

Run: `npx tsc --noEmit && npx eslint src/app/dashboard/new/page.tsx && npm run build`
Expected: tsc 0; no NEW eslint errors (the pre-existing `set-state-in-effect` at line ~68 is unrelated); build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/new/page.tsx
git commit -m "feat(cram): /dashboard/new mode toggle + cram upload→checkout flow"
```

---

### Task 7: Verification + user setup (Stripe product)

**Files:** none (config + manual).

- [ ] **Step 1: Run the full suite**

Run: `npm test`
Expected: all tests pass (Phase 1's 56 + 5 cramPlan = 61).

- [ ] **Step 1b: Apply the pack-summaries migration** (user): `npx supabase db push` (or SQL editor) — Task 5's migration must be live before any cram rows are created in production.

- [ ] **Step 2: User — create the Stripe product + price**

In Stripe Dashboard → Products → Add product: "Lernly Cram-Session", one-time price **€6,99**. Copy the price API ID (`price_…`) into `STRIPE_PRICE_CRAM` in `.env.local` AND the Vercel env. Redeploy.

- [ ] **Step 3: Manual end-to-end (test mode)**

Logged in on the deployed site (Stripe test keys): `/dashboard/new` → "Alles reinwerfen" → drop a multi-file / large PDF → pay with a Stripe test card (`4242 4242 4242 4242`) → land on `/dashboard?cram=<id>`. Verify in Supabase: the `cram_jobs` row flips `awaiting_payment → queued`, N `study_packs` rows appear `queued`, and within a few minutes the cron worker flips them to `ready`.

- [ ] **Step 4: Verify cancel path**

Start a cram checkout, cancel → lands on `/dashboard/new?cram_cancelled=1`; the `cram_jobs` row stays `awaiting_payment` (no packs created).

---

## Notes / Next Phases

- **Phase 3 (live UX):** `GET /api/cram/status?job=<id>` + dashboard grouping under the job with a live "X von Y fertig" badge (polling), ready packs clickable, failed-chunk retry button.
- **Phase 4 (email + cleanup):** `resend` completion email when a job flips to `done` (sent from the worker), plus a daily cron to expire `awaiting_payment` jobs older than 24h and delete their orphaned uploads.
- **Known v1 limitation:** very large text (.txt/.md) files become a single chunk (no char-range split); if such a chunk overflows generation it is marked `failed` (doesn't block the rest). Rare for students; revisit if it shows up.
