# Cram-Mode Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the async generation backbone for cram-mode: DB queue tables, a reusable `generatePack()` extracted from the current route, a PDF page-slicer, and a cron-driven worker that turns a `queued` pack row into a finished pack — all testable by manually enqueuing one row.

**Architecture:** Extract the generation core (`buildMaterialBlocks` + `generatePack`) out of `src/app/api/generate/route.ts` into `src/lib/generatePack.ts` so both the existing synchronous route and the new worker share it. Add `cram_jobs` + queue columns on `study_packs` + atomic claim/complete RPCs. A Vercel Cron route (`/api/cram/worker`) claims `queued` rows (`FOR UPDATE SKIP LOCKED`), downloads the source from Storage, slices the page range with `pdf-lib`, generates via `generatePack()`, and marks the pack `ready`.

**Tech Stack:** Next.js App Router (route handlers, `runtime='nodejs'`, `maxDuration=800`), Supabase (Postgres + Storage + service role), Anthropic SDK, `pdf-lib` (new), `unpdf` (existing), `node:test` via `tsx --test`.

**Scope note:** This is Phase 1 of 4 (see `docs/superpowers/specs/2026-05-25-cram-mode-design.md`). It deliberately does NOT include the chunk planner, billing, dashboard UI, or email — those are Phases 2–4, planned separately once these interfaces are concrete. Phase 1 is verifiable by inserting one `queued` `study_packs` row by hand and watching the worker complete it.

---

## File Structure

**Create:**
- `supabase/migrations/20260525_cram_foundation.sql` — `cram_jobs`, `study_packs` queue columns, `claim_cram_chunks()`, `complete_cram_chunk()`.
- `src/lib/generatePack.ts` — moved generation core: `buildMaterialBlocks()`, `generatePack()`, plus the generation internals they depend on (TASKS, `runTask`, `runTaskOnce`, `runAnalysisPass`, `runGatedTasks`, `extractPdfText`, the shrink/timeout constants). Exports `buildMaterialBlocks`, `generatePack`, and the `SourceFile` type.
- `src/lib/pdfSlice.ts` — `slicePdfPages(buffer, startPage, endPage)` using `pdf-lib`.
- `src/lib/pdfSlice.test.ts` — unit tests for the slicer.
- `src/app/api/cram/worker/route.ts` — cron-driven queue worker.
- `vercel.json` — cron schedule.

**Modify:**
- `src/app/api/generate/route.ts` — import `buildMaterialBlocks`/`generatePack` instead of the inlined logic; keep input parsing, auth, quota, turnstile, size gate, save, response.
- `package.json` — add `pdf-lib`.
- `.env.local.example` — document `CRON_SECRET`.

---

### Task 1: Database migration — queue tables, columns, RPCs

**Files:**
- Create: `supabase/migrations/20260525_cram_foundation.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Cram-mode foundation: job table + per-chunk queue on study_packs + claim/complete RPCs.

create table if not exists public.cram_jobs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  status            text not null default 'awaiting_payment'
                      check (status in ('awaiting_payment','queued','processing','done','failed')),
  exam_type         text not null,
  extra_info        text,
  total_chunks      int  not null default 0,
  done_chunks       int  not null default 0,
  failed_chunks     int  not null default 0,
  chunk_plan        jsonb not null default '[]'::jsonb,
  stripe_session_id text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.cram_jobs enable row level security;
drop policy if exists cram_jobs_select_own on public.cram_jobs;
create policy cram_jobs_select_own on public.cram_jobs
  for select using (auth.uid() = user_id);
-- No INSERT/UPDATE policy: only the service role (start route, webhook, worker) writes.

alter table public.study_packs
  add column if not exists cram_job_id uuid references public.cram_jobs(id) on delete cascade,
  add column if not exists status text not null default 'ready'
      check (status in ('queued','processing','ready','failed')),
  add column if not exists chunk_label text,
  add column if not exists source_path text,
  add column if not exists page_start int,
  add column if not exists page_end int,
  add column if not exists attempts int not null default 0;

create index if not exists study_packs_queue_idx
  on public.study_packs (status, cram_job_id) where status in ('queued','processing');

-- Atomically claim up to p_limit queued chunks: flip to 'processing', bump attempts,
-- skip rows another worker already locked. Returns the claimed rows.
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

-- Mark one chunk done/failed and roll the parent job's counters + status forward.
create or replace function public.complete_cram_chunk(p_pack_id uuid, p_ok boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_job uuid;
begin
  select cram_job_id into v_job from public.study_packs where id = p_pack_id;
  if v_job is null then return; end if;

  if p_ok then
    update public.cram_jobs set done_chunks = done_chunks + 1, updated_at = now() where id = v_job;
  else
    update public.cram_jobs set failed_chunks = failed_chunks + 1, updated_at = now() where id = v_job;
  end if;

  update public.cram_jobs
  set status = 'done', updated_at = now()
  where id = v_job and status <> 'done'
    and done_chunks + failed_chunks >= total_chunks;
end;
$$;

revoke all on function public.claim_cram_chunks(int) from public, anon, authenticated;
revoke all on function public.complete_cram_chunk(uuid, boolean) from public, anon, authenticated;
-- service role bypasses RLS and calls these; no role grants needed.
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push`
Expected: applies `20260525_cram_foundation.sql` cleanly. (If `db push` needs auth, paste the SQL into the Supabase dashboard SQL editor — same pattern as the storage-uploads migration.)

- [ ] **Step 3: Verify schema**

In the Supabase SQL editor:
```sql
select column_name from information_schema.columns
where table_name = 'study_packs' and column_name in
  ('cram_job_id','status','chunk_label','source_path','page_start','page_end','attempts');
select proname from pg_proc where proname in ('claim_cram_chunks','complete_cram_chunk');
```
Expected: 7 columns + 2 functions listed.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260525_cram_foundation.sql
git commit -m "feat(cram): DB foundation — cram_jobs, queue columns, claim/complete RPCs"
```

---

### Task 2: Extract `generatePack()` + `buildMaterialBlocks()` into a shared module

This is a refactor with no behavior change. The goal: the existing single-pack route and the new worker both call the same generation core.

**Files:**
- Create: `src/lib/generatePack.ts`
- Modify: `src/app/api/generate/route.ts`

- [ ] **Step 1: Create `src/lib/generatePack.ts` by moving the generation core**

Move the following **verbatim** out of `src/app/api/generate/route.ts` into the new file (cut from the route, paste here), keeping their implementations identical:

- Constants: `VISION_CHARS_PER_PAGE`, `VISION_MAX_PAGES`, `VISION_MAX_TOTAL_PAGES`, `PDF_CHAR_BUDGET`, `ANALYSIS_MAX_TOKENS`, `ANALYSIS_BUDGET_MS`, `ANALYSIS_HEADER`, `GENERATION_BUDGET_MS`, `PER_ATTEMPT_TIMEOUT_MS`, `MAX_ATTEMPTS`, `MIN_ATTEMPT_MS`, `SAFETY_MS`, `BASE_BACKOFF_MS`, `MAX_BACKOFF_MS`, `SHRINK_DIRECTIVE`, `MATERIAL_TOO_LARGE_MSG`, `TASKS`, `TaskKey`.
- Functions: `extractPdfText`, `stripHtml`, `deriveQuizletExport`, `runTaskOnce`, `runTask`, `runAnalysisOnce`, `runAnalysisPass`, `runGatedTasks` (and the `runOne`/grouping helpers inside it).
- Keep their imports (`Anthropic`, prompts, `shouldUseTwoPass`, `activeTasksFor`, `StudyPackSchema`, `Flashcard`, `parseModelJson`, `shouldUseVision`, retry helpers, `MODEL_FOR`, `HAIKU`) — move the needed `import` lines into `generatePack.ts`.

Add the shared `SourceFile` type and two new exported functions at the bottom:

```ts
export type SourceFile = {
  name: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export type MaterialResult = {
  blocks: Anthropic.Messages.ContentBlockParam[];
  totalChars: number;
  totalPages: number;
  visionPagesUsed: number;
  fileSummaries: string[];
  perFile: { name: string; pages: number }[];
};

// Build the Anthropic content blocks for a set of files (extraction + vision
// decision + char budgeting + cache_control). No anonymous/quota checks — the
// caller enforces those. Throws Error(message) if a PDF can't be read.
export async function buildMaterialBlocks(
  files: SourceFile[],
  examType: ExamType,
  extraInfo: string,
): Promise<MaterialResult> {
  let totalChars = 0;
  let totalPages = 0;
  let visionPagesUsed = 0;
  const fileSummaries: string[] = [];
  const perFile: { name: string; pages: number }[] = [];
  const blocks: Anthropic.Messages.ContentBlockParam[] = [];

  blocks.push({
    type: "text",
    text: [
      `Prüfungsformat: ${EXAM_LABEL[examType]}`,
      extraInfo.trim() ? `Zusatzinfos zur Prüfung: ${extraInfo.trim()}` : "",
      "",
      "=== KURSMATERIAL ===",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name;
    const isPdf = name.toLowerCase().endsWith(".pdf");
    let text: string;
    let pageInfo = "";
    let pageCount = 0;
    if (isPdf) {
      const extracted = await extractPdfText(buffer, name); // throws on unreadable
      text = extracted.text;
      pageCount = extracted.pages;
      pageInfo = ` (${extracted.pages} Seiten)`;
    } else {
      text = buffer.toString("utf-8");
    }
    perFile.push({ name, pages: pageCount });
    totalPages += pageCount;

    const charsPerPage = pageCount > 0 ? text.length / pageCount : Infinity;
    const useVision = shouldUseVision({
      isPdf,
      isAnonymous: false,
      charsPerPage,
      pages: pageCount,
      visionPagesSoFar: visionPagesUsed,
      charsPerPageThreshold: VISION_CHARS_PER_PAGE,
      maxPages: VISION_MAX_PAGES,
      maxTotalPages: VISION_MAX_TOTAL_PAGES,
    });
    if (useVision) {
      visionPagesUsed += pageCount;
      blocks.push({ type: "text", text: `--- ${name}${pageInfo} (bild-lastiges PDF, als Dokument gesendet) ---` });
      blocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
      });
      fileSummaries.push(`${name}${pageInfo}: VISION (${pageCount} Seiten)`);
    } else {
      let t = text;
      if (t.length > PDF_CHAR_BUDGET) {
        t = t.slice(0, PDF_CHAR_BUDGET) + `\n\n[... ${name} wurde nach ${PDF_CHAR_BUDGET.toLocaleString("de-DE")} Zeichen gekürzt ...]`;
      }
      totalChars += t.length;
      blocks.push({ type: "text", text: `--- ${name}${pageInfo} ---\n${t}` });
      fileSummaries.push(`${name}${pageInfo}: ${t.length.toLocaleString("de-DE")} Zeichen`);
    }
  }

  const last = blocks[blocks.length - 1];
  if (last) (last as Anthropic.Messages.TextBlockParam).cache_control = { type: "ephemeral" };

  return { blocks, totalChars, totalPages, visionPagesUsed, fileSummaries, perFile };
}

// Run analysis (optional) + the gated task fan-out + merge + Zod validation.
// Returns the validated StudyPack. Throws Error on schema failure / 0 cards
// (callers map to their own error response).
export async function generatePack(opts: {
  client: Anthropic;
  blocks: Anthropic.Messages.ContentBlockParam[];
  examType: ExamType;
  deadline: number;
  twoPass: boolean;
}): Promise<StudyPack> {
  const { client, blocks, examType, deadline, twoPass } = opts;
  let brief = "";
  if (twoPass) {
    const analysisDeadline = Math.min(deadline, Date.now() + ANALYSIS_BUDGET_MS);
    brief = await runAnalysisPass(client, blocks, analysisDeadline).catch(() => "");
  }
  const byKey = await runGatedTasks(client, blocks, deadline, examType, brief || undefined);

  const cards = (byKey.cards as { flashcards?: Flashcard[] } | undefined)?.flashcards ?? [];
  const meta = byKey.meta as { courseTitle?: string; overview?: unknown; authors?: unknown; schedule?: unknown } | undefined;
  const visualMap = (byKey.visualMap as unknown) ?? null;
  const merged = {
    courseTitle: meta?.courseTitle,
    examType,
    flashcards: cards,
    overview: meta?.overview,
    authors: meta?.authors,
    schedule: meta?.schedule,
    quizletExport: deriveQuizletExport(cards),
    ...(visualMap ? { visualMap } : {}),
    ...(byKey.blueprint ? { essayBlueprint: (byKey.blueprint as { essayBlueprint?: unknown }).essayBlueprint } : {}),
    ...(byKey.simulator ? { simulator: (byKey.simulator as { simulator?: unknown }).simulator } : {}),
    ...(byKey.openQuestions ? { openQuestions: (byKey.openQuestions as { openQuestions?: unknown }).openQuestions } : {}),
  };
  const parsed = StudyPackSchema.safeParse(merged);
  if (!parsed.success) throw new Error("schema_validation_failed");
  if (parsed.data.flashcards.length === 0) throw new Error("zero_flashcards");
  return parsed.data;
}
```

Add the imports `generatePack.ts` needs at the top, including `import { StudyPackSchema, type ExamType, type Flashcard, type StudyPack } from "@/lib/schema";`. Move the `EXAM_LABEL` const from the route into this module **and export it** (`export const EXAM_LABEL`), because `buildMaterialBlocks` uses it here AND the route still needs it for its `examType` validation (so the route imports it back). Leave `ALLOWED_FILE` in the route (only used there).

- [ ] **Step 2: Refactor the route to use the shared functions**

In `src/app/api/generate/route.ts`, replace the inlined file loop (the `let totalChars/totalPages/visionPagesUsed` block + `materialBlocks.push(...)` intro + the `for (const file of files)` loop + the `cache_control` block) with:

```ts
    let material;
    try {
      material = await buildMaterialBlocks(files, examType, extraInfo);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Konnte Material nicht lesen." },
        { status: 422 },
      );
    }
    const { totalChars, totalPages, visionPagesUsed, fileSummaries, perFile } = material;
    const materialBlocks = material.blocks;

    // Anonymous per-file page cap (was inline in the loop).
    if (isAnonymous) {
      const over = perFile.find((f) => f.pages > ANON_MAX_PAGES);
      if (over) {
        return NextResponse.json(
          { error: `Ohne Account ist max. ${ANON_MAX_PAGES} Seiten pro PDF erlaubt — ${over.name} hat ${over.pages}. Logge dich ein, um größere PDFs hochzuladen.`, reason: "anonymous_page_limit" },
          { status: 413 },
        );
      }
    }
```

Keep the existing `if (isAnonymous && totalChars > ANON_MAX_CHARS)` check and the `if (totalPages > MAX_PAGES_PER_PACK || totalChars > MAX_CHARS_PER_PACK)` size gate exactly as they are (they now read from `material`). Replace the `useTwoPass` + analysis + `runGatedTasks` + merge + `StudyPackSchema.safeParse` + 0-card block with:

```ts
    const useTwoPass = shouldUseTwoPass({ isAnonymous, usesByok, plan: userPlan });
    let pack: StudyPack;
    try {
      pack = await generatePack({
        client,
        blocks: materialBlocks,
        examType,
        deadline,
        twoPass: useTwoPass,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "schema_validation_failed")
        return NextResponse.json({ error: "Das generierte Lernpaket entspricht nicht dem erwarteten Schema." }, { status: 502 });
      if (msg === "zero_flashcards")
        return NextResponse.json({ error: "Die Generierung lieferte keine Karteikarten — bitte erneut versuchen." }, { status: 502 });
      throw e; // MaxTokensError (incl. MATERIAL_TOO_LARGE_MSG) etc. → handled by the outer catch
    }
```

Then the save block uses `pack` instead of `parsed.data` (replace `parsed.data` → `pack` in the insert and response). Update the route's imports: remove now-unused imports that moved out (e.g. `shouldUseVision`, `parseModelJson`, prompt task constants, `retryWithBudget`/`classifyError`, `MODEL_FOR`/`HAIKU`, `Flashcard` if unused) and add `import { buildMaterialBlocks, generatePack, EXAM_LABEL, type SourceFile } from "@/lib/generatePack";` and keep the `StudyPack` import. Remove the route's now-moved local `EXAM_LABEL` and `SourceFile` definitions (use the imported ones).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. Fix any "unused import" / "cannot find name" errors by moving the symbol to the module that uses it. (Common: `MaxTokensError` is still referenced in the route's outer catch + finally — keep its import in the route; it is also used in `generatePack.ts` via `runTask` — import it in both.)

- [ ] **Step 4: Run the unit suite + lint**

Run: `npm test && npx eslint src/lib/generatePack.ts src/app/api/generate/route.ts`
Expected: 53 tests pass; no new eslint errors (pre-existing `set-state-in-effect` warnings elsewhere are unrelated).

- [ ] **Step 5: Regression-check the existing flow builds**

Run: `npm run build`
Expected: build succeeds; `/api/generate` and `/dashboard/new` still compile. (Behavior is unchanged — this task only moved code.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/generatePack.ts src/app/api/generate/route.ts
git commit -m "refactor(generate): extract buildMaterialBlocks + generatePack into shared lib"
```

---

### Task 3: PDF page-slicer (`pdf-lib`)

**Files:**
- Create: `src/lib/pdfSlice.ts`
- Test: `src/lib/pdfSlice.test.ts`
- Modify: `package.json` (add `pdf-lib`)

- [ ] **Step 1: Install pdf-lib**

Run: `npm install pdf-lib`
Expected: `pdf-lib` added to `dependencies`.

- [ ] **Step 2: Write the failing test**

Create `src/lib/pdfSlice.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { slicePdfPages } from "./pdfSlice";

async function makePdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([200, 200]);
  return Buffer.from(await doc.save());
}

test("slicePdfPages returns only the requested 1-based inclusive range", async () => {
  const src = await makePdf(10);
  const out = await slicePdfPages(src, 3, 5);
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 3); // pages 3,4,5
});

test("slicePdfPages clamps an out-of-range end to the last page", async () => {
  const src = await makePdf(4);
  const out = await slicePdfPages(src, 3, 99);
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 2); // pages 3,4
});

test("slicePdfPages with full range returns all pages", async () => {
  const src = await makePdf(6);
  const out = await slicePdfPages(src, 1, 6);
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 6);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx tsx --test src/lib/pdfSlice.test.ts`
Expected: FAIL — `Cannot find module './pdfSlice'`.

- [ ] **Step 4: Implement**

Create `src/lib/pdfSlice.ts`:

```ts
import { PDFDocument } from "pdf-lib";

// Return a new PDF containing pages [startPage, endPage] (1-based, inclusive),
// clamped to the document's real page count.
export async function slicePdfPages(
  buffer: Buffer,
  startPage: number,
  endPage: number,
): Promise<Buffer> {
  const src = await PDFDocument.load(buffer);
  const n = src.getPageCount();
  const start = Math.max(1, Math.min(startPage, n));
  const end = Math.max(start, Math.min(endPage, n));
  const out = await PDFDocument.create();
  const indices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
  const copied = await out.copyPages(src, indices);
  copied.forEach((p) => out.addPage(p));
  return Buffer.from(await out.save());
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsx --test src/lib/pdfSlice.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/pdfSlice.ts src/lib/pdfSlice.test.ts package.json package-lock.json
git commit -m "feat(cram): add pdf-lib page-range slicer"
```

---

### Task 4: Cron worker route

**Files:**
- Create: `src/app/api/cram/worker/route.ts`

- [ ] **Step 1: Implement the worker**

Create `src/app/api/cram/worker/route.ts`:

```ts
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/server";
import { STUDY_UPLOADS_BUCKET } from "@/lib/uploads";
import { slicePdfPages } from "@/lib/pdfSlice";
import {
  buildMaterialBlocks,
  generatePack,
  type SourceFile,
} from "@/lib/generatePack";
import type { ExamType } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 800;

const CLAIM_PER_RUN = 2;
const MAX_ATTEMPTS = 3;
const GEN_BUDGET_MS = 700_000;

type QueuedPack = {
  id: string;
  cram_job_id: string;
  source_path: string;
  page_start: number | null;
  page_end: number | null;
  chunk_label: string | null;
  attempts: number;
};

export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const service = createServiceClient();
  const client = new Anthropic();

  const { data: claimed, error: claimErr } = await service.rpc("claim_cram_chunks", {
    p_limit: CLAIM_PER_RUN,
  });
  if (claimErr) {
    console.error("[cram/worker] claim failed", claimErr);
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }
  const rows = (claimed ?? []) as QueuedPack[];

  let done = 0;
  let failed = 0;
  for (const row of rows) {
    // Fetch what we need to know about the parent job (exam type / extra info).
    const { data: job } = await service
      .from("cram_jobs")
      .select("exam_type, extra_info")
      .eq("id", row.cram_job_id)
      .single();
    const examType = (job?.exam_type ?? "essay") as ExamType;
    const extraInfo = job?.extra_info ?? "";

    try {
      const dl = await service.storage.from(STUDY_UPLOADS_BUCKET).download(row.source_path);
      if (dl.error || !dl.data) throw new Error(`download_failed: ${row.source_path}`);
      let buffer = Buffer.from(await dl.data.arrayBuffer());
      if (row.source_path.toLowerCase().endsWith(".pdf") && row.page_start && row.page_end) {
        buffer = await slicePdfPages(buffer, row.page_start, row.page_end);
      }
      const name = row.chunk_label ?? row.source_path.split("/").pop() ?? "material.pdf";
      const file: SourceFile = {
        name: name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`,
        size: buffer.byteLength,
        arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      };
      const material = await buildMaterialBlocks([file], examType, extraInfo);
      const pack = await generatePack({
        client,
        blocks: material.blocks,
        examType,
        deadline: Date.now() + GEN_BUDGET_MS,
        twoPass: true,
      });

      const { error: upErr } = await service
        .from("study_packs")
        .update({ status: "ready", title: pack.courseTitle, exam_type: pack.examType, pack_data: pack })
        .eq("id", row.id);
      if (upErr) throw new Error(`save_failed: ${upErr.message}`);

      await service.rpc("complete_cram_chunk", { p_pack_id: row.id, p_ok: true });
      done++;
    } catch (e) {
      console.error(`[cram/worker] chunk ${row.id} failed (attempt ${row.attempts})`, e);
      if (row.attempts >= MAX_ATTEMPTS) {
        await service.from("study_packs").update({ status: "failed" }).eq("id", row.id);
        await service.rpc("complete_cram_chunk", { p_pack_id: row.id, p_ok: false });
        failed++;
      } else {
        // Re-queue for the next cron tick.
        await service.from("study_packs").update({ status: "queued" }).eq("id", row.id);
      }
    }
  }

  return NextResponse.json({ claimed: rows.length, done, failed });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Lint**

Run: `npx eslint src/app/api/cram/worker/route.ts`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cram/worker/route.ts
git commit -m "feat(cram): cron worker that claims + generates queued chunks"
```

---

### Task 5: Cron config + secret

**Files:**
- Create: `vercel.json`
- Modify: `.env.local.example`

- [ ] **Step 1: Add the cron schedule**

Create `vercel.json`:

```json
{
  "crons": [{ "path": "/api/cram/worker", "schedule": "* * * * *" }]
}
```

> Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when `CRON_SECRET` is set in the project env. Set `CRON_SECRET` to a random string in the Vercel dashboard (Project → Settings → Environment Variables) and in `.env.local` for local testing.

- [ ] **Step 2: Document the env var**

Add to `.env.local.example`:

```
# Cron worker auth (Vercel Cron sends this as a Bearer token)
CRON_SECRET=replace-with-a-long-random-string
```

- [ ] **Step 3: Commit**

```bash
git add vercel.json .env.local.example
git commit -m "feat(cram): vercel cron schedule + CRON_SECRET"
```

---

### Task 6: Manual end-to-end verification (no UI yet)

**Files:** none.

- [ ] **Step 1: Apply migration to the linked project** (if not already): `npx supabase db push` (or dashboard SQL editor).

- [ ] **Step 2: Seed a job + queued chunk by hand.** In the Supabase SQL editor (replace `<UID>` with a real `users.id`, and `<PATH>` with an object already in the `study-uploads` bucket, e.g. uploaded via the normal flow):

```sql
with j as (
  insert into public.cram_jobs (user_id, status, exam_type, total_chunks)
  values ('<UID>', 'queued', 'essay', 1) returning id
)
insert into public.study_packs (user_id, cram_job_id, status, source_path, page_start, page_end, chunk_label, title, exam_type, pack_data)
select '<UID>', j.id, 'queued', '<PATH>', null, null, 'Test-Chunk', 'pending', 'essay', '{}'::jsonb from j;
```

- [ ] **Step 3: Trigger the worker locally.**

Run (dev server up via `npm run dev`):
```bash
curl -s -X POST http://localhost:3000/api/cram/worker -H "Authorization: Bearer $(grep '^CRON_SECRET=' .env.local | cut -d= -f2)"
```
Expected: JSON `{ "claimed": 1, "done": 1, "failed": 0 }` after the generation completes (can take 30–90s — leave it).

- [ ] **Step 4: Verify the row finished.**

```sql
select status, title, jsonb_array_length(pack_data->'flashcards') as cards from public.study_packs where chunk_label = 'Test-Chunk';
select status, done_chunks, total_chunks from public.cram_jobs order by created_at desc limit 1;
```
Expected: pack `status='ready'` with a real title + cards; job `status='done'`, `done_chunks=1`.

- [ ] **Step 5: Verify auth rejection.**

Run: `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/cram/worker`
Expected: `401`.

---

## Notes / Next Phases

- **Phase 2 (paid flow):** chunk planner (`src/lib/cramPlan.ts`, unit-tested) + `/dashboard/new` cram toggle + upload + `/api/cram/start` + `cram` Stripe product in `src/lib/stripe.ts` + webhook branch in `src/app/api/stripe/webhook/route.ts` that materializes `queued` rows from `chunk_plan`.
- **Phase 3 (live UX):** `/api/cram/status` + dashboard grouping/polling/badges + failed-chunk retry.
- **Phase 4 (email):** `resend` + completion email in `complete_cram_chunk` path (worker sends when a job flips to `done`) + `awaiting_payment` cleanup cron.
- Each gets its own plan in `docs/superpowers/plans/` once this phase lands and the interfaces are real.
