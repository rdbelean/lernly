# Storage-Backed Uploads (fix "Request Entity Too Large") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authenticated users generate study packs from large lecture PDFs by uploading files directly to Supabase Storage (bypassing Vercel's ~4.5 MB request-body limit), and stop the cryptic `Unexpected token 'R', "Request En"… is not valid JSON` crash.

**Architecture:** Today the browser POSTs raw files as `multipart/form-data` to `/api/generate`. Vercel rejects any body > ~4.5 MB with a plain-text `Request Entity Too Large` (413) before the function runs; the client then calls `res.json()` on that non-JSON body and crashes. New flow: the browser uploads each file straight to a private Supabase Storage bucket (`study-uploads`, RLS-scoped to `<uid>/…`), then POSTs a tiny JSON body containing only the storage paths. `/api/generate` downloads the files server-side with the service role (validating ownership), runs the unchanged generation pipeline, then deletes the uploads. The legacy multipart path stays for the (UI-unreachable, gated) anonymous flow. A `parseJsonResponse` helper hardens the client against any non-JSON response.

**Tech Stack:** Next.js 15 App Router (route handler, `runtime = "nodejs"`), Supabase (`@supabase/ssr` browser/server clients + service-role client, Storage), TypeScript, `node:test` via `tsx --test`.

---

## File Structure

**Create:**
- `src/lib/safeJson.ts` — `parseJsonResponse(res)` + `friendlyHttpError(status, snippet)`. Pure, no deps. Used client-side to never crash on a non-JSON response.
- `src/lib/safeJson.test.ts` — unit tests for the above.
- `src/lib/uploads.ts` — `STUDY_UPLOADS_BUCKET` constant + `sanitizeUploadName()` + `buildUploadPath(userId, name)`. Shared by client and server (no `server-only`).
- `src/lib/uploads.test.ts` — unit tests for the path helpers.
- `supabase/migrations/20260525_study_uploads_bucket.sql` — create the private bucket + RLS policies on `storage.objects`.

**Modify:**
- `src/app/api/generate/route.ts` — branch on `Content-Type`: JSON (storage refs, auth-required, ownership-checked, service-role download) vs legacy multipart; best-effort cleanup of uploads in a `finally`.
- `src/app/dashboard/new/page.tsx` — `submit()`: upload files to Storage, POST JSON refs, parse the response with `parseJsonResponse`.

**Out of scope (documented, intentional):** the anonymous generation path keeps using multipart (it is gated by `ANONYMOUS_GENERATION_ENABLED` and not reachable from the current UI, which redirects anonymous users to `/login` before any generate request).

---

### Task 1: `parseJsonResponse` helper (client never crashes on non-JSON)

**Files:**
- Create: `src/lib/safeJson.ts`
- Test: `src/lib/safeJson.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/safeJson.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJsonResponse, friendlyHttpError } from "./safeJson";

test("parseJsonResponse parses a valid JSON body", async () => {
  const res = new Response(JSON.stringify({ ok: true, id: "x" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  assert.deepEqual(await parseJsonResponse(res), { ok: true, id: "x" });
});

test("parseJsonResponse returns {} for an empty body", async () => {
  const res = new Response("", { status: 200 }); // 204 can't carry a body in undici
  assert.deepEqual(await parseJsonResponse(res), {});
});

test("parseJsonResponse throws a friendly error on a non-JSON 413", async () => {
  const res = new Response("Request Entity Too Large", { status: 413 });
  await assert.rejects(() => parseJsonResponse(res), /zu groß/);
});

test("parseJsonResponse throws a friendly error on an HTML 5xx page", async () => {
  const res = new Response("<!DOCTYPE html><html>error</html>", { status: 500 });
  await assert.rejects(() => parseJsonResponse(res), /Server-Fehler/);
});

test("friendlyHttpError maps 413 to a size message", () => {
  assert.match(friendlyHttpError(413, "Request Entity Too Large"), /zu groß/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/safeJson.test.ts`
Expected: FAIL — `Cannot find module './safeJson'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/safeJson.ts`:

```ts
// Read a fetch Response as JSON without ever throwing the opaque
// "Unexpected token 'R', \"Request En\"... is not valid JSON" error. Platform
// layers (Vercel's 4.5 MB body cap → 413 "Request Entity Too Large", gateway
// 5xx HTML pages) return non-JSON bodies; turn those into clear messages.
export async function parseJsonResponse<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    const snippet = text.slice(0, 140).replace(/\s+/g, " ").trim();
    throw new Error(friendlyHttpError(res.status, snippet));
  }
}

export function friendlyHttpError(status: number, snippet: string): string {
  if (status === 413) {
    return "Die Dateien sind zu groß für den Upload. Bitte kleinere oder weniger Dateien wählen.";
  }
  if (status === 504 || status === 524 || status === 408) {
    return "Zeitüberschreitung bei der Generierung. Bitte mit weniger oder kleineren Dateien erneut versuchen.";
  }
  if (status >= 500) {
    return "Server-Fehler bei der Generierung. Bitte in ein paar Minuten erneut versuchen.";
  }
  return snippet
    ? `Unerwartete Antwort (HTTP ${status}): ${snippet}`
    : `Unerwartete Antwort (HTTP ${status}).`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/safeJson.test.ts`
Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/safeJson.ts src/lib/safeJson.test.ts
git commit -m "feat(client): add parseJsonResponse to harden non-JSON responses"
```

---

### Task 2: Upload path helpers (`src/lib/uploads.ts`)

**Files:**
- Create: `src/lib/uploads.ts`
- Test: `src/lib/uploads.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/uploads.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STUDY_UPLOADS_BUCKET,
  sanitizeUploadName,
  buildUploadPath,
} from "./uploads";

test("bucket id is stable", () => {
  assert.equal(STUDY_UPLOADS_BUCKET, "study-uploads");
});

test("sanitizeUploadName strips path separators, unsafe chars and leading dots", () => {
  assert.equal(sanitizeUploadName("../etc/pa ss wörd.pdf"), "etc_pa_ss_w_rd.pdf");
  assert.equal(sanitizeUploadName("Lecture 01.pdf"), "Lecture_01.pdf");
});

test("buildUploadPath nests under the user id with a random prefix", () => {
  const path = buildUploadPath("user-123", "Lecture 01.pdf");
  assert.match(path, /^user-123\/[^/]+-Lecture_01\.pdf$/);
  // first folder segment must equal the uid (RLS depends on this)
  assert.equal(path.split("/")[0], "user-123");
});

test("buildUploadPath produces unique paths for the same name", () => {
  const a = buildUploadPath("u", "x.pdf");
  const b = buildUploadPath("u", "x.pdf");
  assert.notEqual(a, b);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/uploads.test.ts`
Expected: FAIL — `Cannot find module './uploads'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/uploads.ts`:

```ts
// Shared (browser + server) helpers for the raw study-material upload bucket.
// The first path segment MUST be the user id — the Storage RLS policies in
// supabase/migrations/20260525_study_uploads_bucket.sql key off it.
export const STUDY_UPLOADS_BUCKET = "study-uploads";

export function sanitizeUploadName(name: string): string {
  // Collapse anything that isn't a word char / dot / dash to "_", then drop
  // leading dots+underscores (avoids ".." and hidden-file-looking names).
  const cleaned = name.replace(/[^\w.\-]+/g, "_").replace(/^[._]+/, "");
  return cleaned.slice(-120) || "datei";
}

export function buildUploadPath(userId: string, name: string): string {
  const rand =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${userId}/${rand}-${sanitizeUploadName(name)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/uploads.test.ts`
Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/uploads.ts src/lib/uploads.test.ts
git commit -m "feat(uploads): add study-uploads bucket constant + path helpers"
```

---

### Task 3: Supabase Storage bucket + RLS migration

**Files:**
- Create: `supabase/migrations/20260525_study_uploads_bucket.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260525_study_uploads_bucket.sql`:

```sql
-- Private bucket for raw study-material uploads. The browser uploads here
-- directly (bypassing Vercel's ~4.5 MB request-body cap); /api/generate
-- downloads with the service role and deletes the files afterwards.
insert into storage.buckets (id, name, public, file_size_limit)
values ('study-uploads', 'study-uploads', false, 26214400) -- 25 MB / file
on conflict (id) do nothing;

-- RLS: an authenticated user may only touch objects inside their own folder,
-- i.e. the first path segment equals their uid ("<uid>/<random>-<name>").
-- Server-side service-role access bypasses these policies.
drop policy if exists "study_uploads_insert_own" on storage.objects;
create policy "study_uploads_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'study-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "study_uploads_select_own" on storage.objects;
create policy "study_uploads_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'study-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "study_uploads_delete_own" on storage.objects;
create policy "study_uploads_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'study-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

- [ ] **Step 2: Apply the migration to the linked Supabase project**

Run: `npx supabase db push`
Expected: applies `20260525_study_uploads_bucket.sql` without error.

> If `db push` complains about already-applied migrations or unrelated drift, apply just this file via the Supabase SQL editor (paste the SQL above) instead. Verify the bucket exists: `npx supabase storage ls` should list `study-uploads`, or check Storage in the Supabase dashboard.

- [ ] **Step 3: Verify the Supabase project-level upload size limit**

In the Supabase dashboard → Storage → Settings, confirm the **global upload file size limit** is ≥ 25 MB (default is 50 MB). The bucket-level `file_size_limit` we set (25 MB) only takes effect under the global cap.
Expected: global limit ≥ 25 MB. No code change needed if already so.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260525_study_uploads_bucket.sql
git commit -m "feat(storage): add private study-uploads bucket with per-user RLS"
```

---

### Task 4: `/api/generate` — accept storage refs, download server-side, clean up

**Files:**
- Modify: `src/app/api/generate/route.ts`

- [ ] **Step 1: Add the import and the two new types**

Add to the import block (after the existing `import { MODEL_FOR, HAIKU } from "@/lib/taskModels";` line):

```ts
import { STUDY_UPLOADS_BUCKET } from "@/lib/uploads";
```

Add these type declarations directly above `export async function POST(request: Request) {`:

```ts
// A file from either upload path, normalized to what the pipeline needs
// (the validation loop reads .name/.size; the material loop calls .arrayBuffer()).
type SourceFile = {
  name: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

type GenerateJsonBody = {
  examType?: ExamType;
  extraInfo?: string;
  userApiKey?: string;
  files?: { path: string; name?: string; size?: number; type?: string }[];
};
```

- [ ] **Step 2: Declare the cleanup list before the `try`**

Replace:

```ts
  const t0 = Date.now();
  const deadline = t0 + GENERATION_BUDGET_MS;
  try {
```

with:

```ts
  const t0 = Date.now();
  const deadline = t0 + GENERATION_BUDGET_MS;
  const uploadedPaths: string[] = [];
  try {
```

- [ ] **Step 3: Replace the multipart-only input parsing with dual-mode parsing**

Replace this block (currently the first statements inside the `try`):

```ts
    const formData = await request.formData();

    const examType = formData.get("examType") as ExamType | null;
    const extraInfo = (formData.get("extraInfo") as string | null) ?? "";
    const userApiKeyRaw = (formData.get("userApiKey") as string | null) ?? "";
    const userApiKey = userApiKeyRaw.trim();
    const files = formData
      .getAll("files")
      .filter((v): v is File => v instanceof File);
    const turnstileToken =
      (formData.get("cf-turnstile-response") as string | null) ?? null;
    const clientIp = extractClientIp(request);
    const userAgent = request.headers.get("user-agent") ?? "";
```

with:

```ts
    const clientIp = extractClientIp(request);
    const userAgent = request.headers.get("user-agent") ?? "";
    const contentType = request.headers.get("content-type") ?? "";

    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const isAnonymous = !user;

    let examType: ExamType | null;
    let extraInfo = "";
    let userApiKey = "";
    let turnstileToken: string | null = null;
    let files: SourceFile[] = [];

    if (contentType.includes("application/json")) {
      // Storage-backed path: the browser uploaded the raw files straight to
      // Supabase Storage (bypassing Vercel's ~4.5 MB body cap) and sends only
      // their storage paths here.
      if (!user) {
        return NextResponse.json(
          {
            error: "Bitte einloggen, um ein Lernpaket zu erstellen.",
            reason: "auth_required",
          },
          { status: 401 },
        );
      }
      let body: GenerateJsonBody;
      try {
        body = (await request.json()) as GenerateJsonBody;
      } catch {
        return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
      }
      examType = body.examType ?? null;
      extraInfo = body.extraInfo ?? "";
      userApiKey = (body.userApiKey ?? "").trim();
      const refs = Array.isArray(body.files) ? body.files : [];
      const service = createServiceClient();
      for (const ref of refs) {
        // Ownership guard: service-role downloads bypass RLS, so enforce that
        // the path lives inside the requesting user's folder.
        if (typeof ref?.path !== "string" || !ref.path.startsWith(`${user.id}/`)) {
          return NextResponse.json(
            { error: "Ungültiger Datei-Verweis." },
            { status: 400 },
          );
        }
        uploadedPaths.push(ref.path);
        const dl = await service.storage
          .from(STUDY_UPLOADS_BUCKET)
          .download(ref.path);
        if (dl.error || !dl.data) {
          return NextResponse.json(
            { error: `Datei nicht gefunden: ${ref.name ?? ref.path}` },
            { status: 400 },
          );
        }
        const blob = dl.data;
        files.push({
          name: ref.name ?? ref.path.split("/").pop() ?? "datei",
          size: blob.size,
          arrayBuffer: () => blob.arrayBuffer(),
        });
      }
    } else {
      // Legacy multipart path (anonymous / back-compat). Subject to Vercel's
      // body-size cap, but anonymous generation sends at most one small file.
      const formData = await request.formData();
      examType = formData.get("examType") as ExamType | null;
      extraInfo = (formData.get("extraInfo") as string | null) ?? "";
      userApiKey = ((formData.get("userApiKey") as string | null) ?? "").trim();
      turnstileToken =
        (formData.get("cf-turnstile-response") as string | null) ?? null;
      files = formData
        .getAll("files")
        .filter((v): v is File => v instanceof File);
    }
```

- [ ] **Step 4: Remove the now-duplicate auth lookup**

Delete this block (it moved up in Step 3 — leaving it causes a "redeclaration of `supabase`/`user`/`isAnonymous`" TypeScript error):

```ts
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isAnonymous = !user;
```

- [ ] **Step 5: Add the cleanup `finally`**

Replace the end of the function:

```ts
    return NextResponse.json({ error: message }, { status });
  }
}
```

with:

```ts
    return NextResponse.json({ error: message }, { status });
  } finally {
    // Best-effort cleanup: by this point the buffers are already in memory /
    // sent to Claude, so the raw uploads are no longer needed.
    if (uploadedPaths.length > 0) {
      try {
        await createServiceClient()
          .storage.from(STUDY_UPLOADS_BUCKET)
          .remove(uploadedPaths);
      } catch (cleanupErr) {
        console.error("[/api/generate] upload cleanup failed", cleanupErr);
      }
    }
  }
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0, no new errors. (`files` is `SourceFile[]`; the validation loop's `f.name`/`f.size` and the material loop's `await file.arrayBuffer()` all satisfy `SourceFile`. `File` is structurally assignable to `SourceFile`, so the multipart branch typechecks.)

- [ ] **Step 7: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat(generate): accept storage-backed file refs, download + cleanup server-side"
```

---

### Task 5: Dashboard — upload to Storage, POST JSON refs, parse safely

**Files:**
- Modify: `src/app/dashboard/new/page.tsx`

- [ ] **Step 1: Add imports**

Add to the import block (after `import { track } from "@/lib/analytics";`):

```ts
import { STUDY_UPLOADS_BUCKET, buildUploadPath } from "@/lib/uploads";
import { parseJsonResponse } from "@/lib/safeJson";
```

- [ ] **Step 2: Add the response type**

Add directly below the existing `const ACCEPTED_MIME = { ... };` constants block (above the component), or above the component function:

```ts
type GenerateApiResponse = {
  error?: string;
  reason?: string;
  used?: number;
  limit?: number;
  plan?: string;
  saved?: boolean;
  id?: string;
  pack?: { flashcards?: unknown[]; simulator?: { questions?: unknown[] } };
};
```

- [ ] **Step 3: Replace `submit()`**

Replace the entire current `submit` function:

```ts
  const submit = async () => {
    if (files.length === 0) {
      setError("Mindestens eine Datei hochladen.");
      return;
    }
    setBusy(true);
    setError(null);
    setCompleted(false);

    const fd = new FormData();
    fd.set("examType", examType);
    if (extraInfo.trim()) fd.set("extraInfo", extraInfo.trim());
    for (const file of files) fd.append("files", file);

    const t0 = Date.now();
    try {
      const res = await fetch("/api/generate", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        if (json.reason === "quota_exceeded" && typeof json.limit === "number") {
          setQuotaHit({
            used: json.used,
            limit: json.limit,
            plan: json.plan ?? "free",
          });
          setBusy(false);
          return;
        }
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      track("auth_generate_completed", {
        duration_ms: Date.now() - t0,
        cards: json.pack?.flashcards?.length,
        quiz: json.pack?.simulator?.questions?.length,
        exam_type: examType,
        file_count: files.length,
      });
      setCompleted(true);
      if (json.saved && json.id) {
        // small delay so the user sees completion tick
        setTimeout(() => router.push(`/dashboard/pack/${json.id}`), 500);
      } else {
        throw new Error(
          "Pack wurde generiert, konnte aber nicht gespeichert werden.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      setBusy(false);
    }
  };
```

with:

```ts
  const submit = async () => {
    if (files.length === 0) {
      setError("Mindestens eine Datei hochladen.");
      return;
    }
    setBusy(true);
    setError(null);
    setCompleted(false);

    const t0 = Date.now();
    try {
      const { createClient } = await import("@/lib/supabase/browser");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login?next=/dashboard/new";
        return;
      }

      // 1) Upload each file straight to Storage — bypasses Vercel's ~4.5 MB
      //    request-body cap so large lecture PDFs go through.
      const refs: { path: string; name: string; size: number; type: string }[] =
        [];
      for (const file of files) {
        const path = buildUploadPath(user.id, file.name);
        const { error: upErr } = await supabase.storage
          .from(STUDY_UPLOADS_BUCKET)
          .upload(path, file, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });
        if (upErr) {
          throw new Error(`Upload fehlgeschlagen (${file.name}): ${upErr.message}`);
        }
        refs.push({ path, name: file.name, size: file.size, type: file.type });
      }

      // 2) Kick off generation with a tiny JSON body (only the storage refs).
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examType,
          extraInfo: extraInfo.trim() || undefined,
          files: refs,
        }),
      });
      const json = await parseJsonResponse<GenerateApiResponse>(res);
      if (!res.ok) {
        if (json.reason === "quota_exceeded" && typeof json.limit === "number") {
          setQuotaHit({
            used: json.used ?? 0,
            limit: json.limit,
            plan: json.plan ?? "free",
          });
          setBusy(false);
          return;
        }
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      track("auth_generate_completed", {
        duration_ms: Date.now() - t0,
        cards: json.pack?.flashcards?.length,
        quiz: json.pack?.simulator?.questions?.length,
        exam_type: examType,
        file_count: files.length,
      });
      setCompleted(true);
      if (json.saved && json.id) {
        // small delay so the user sees completion tick
        setTimeout(() => router.push(`/dashboard/pack/${json.id}`), 500);
      } else {
        throw new Error(
          "Pack wurde generiert, konnte aber nicht gespeichert werden.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      setBusy(false);
    }
  };
```

> `QuotaHitDetails` requires `used: number`, so `json.used ?? 0` (vs the old untyped `json.used`) keeps the type happy.

- [ ] **Step 4: Typecheck + lint the changed file**

Run: `npx tsc --noEmit && npx eslint src/app/dashboard/new/page.tsx src/lib/uploads.ts src/lib/safeJson.ts`
Expected: `tsc` exit 0; eslint reports no new errors for these files.

- [ ] **Step 5: Run the unit suite**

Run: `npm test`
Expected: all tests pass (existing + `safeJson` + `uploads`).

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/new/page.tsx
git commit -m "feat(dashboard): upload files to Storage, send JSON refs, parse safely"
```

---

### Task 6: Manual end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm the bucket + policies exist**

In the Supabase dashboard: Storage shows a private `study-uploads` bucket; Auth → Policies (or `storage.objects`) shows the three `study_uploads_*` policies.

- [ ] **Step 2: Generate with a small file (regression)**

Logged in, go to `/dashboard/new`, upload a small (<1 MB) PDF or `.txt`, pick an exam type, generate.
Expected: object briefly appears under `study-uploads/<uid>/…`, generation completes, redirect to `/dashboard/pack/<id>`, and the object is gone afterward (cleanup).

- [ ] **Step 3: Generate with a large file (the original bug)**

Upload a real lecture PDF **> 5 MB** (previously triggered `Unexpected token 'R', "Request En"…`).
Expected: generation completes (no JSON-parse error). This must run on Vercel or `vercel dev` — plain `next dev` does not enforce the 4.5 MB body cap, so it cannot reproduce the original failure.

- [ ] **Step 4: Confirm graceful failure for a non-JSON response**

Temporarily impossible to hit 413 now (uploads go to Storage), but verify the hardening: in `submit()` you can momentarily point the fetch at a URL returning HTML/5xx, or trust the `safeJson` unit tests. Confirm the UI shows a readable German message, never `Unexpected token`.

- [ ] **Step 5: Deploy**

```bash
git push
```
Then verify on the deployed site (lernly-app.de) with a >5 MB PDF.

---

## Notes / Risks

- **Vercel limit is hard.** The ~4.5 MB serverless request-body cap cannot be raised by config; uploading to Storage is the supported way around it. This is why this approach (not "raise the limit") was chosen.
- **Orphaned uploads.** If generation is killed mid-flight (timeout/crash) before the `finally`, an upload can linger. Mitigation deferred (YAGNI): optionally add a Storage lifecycle rule later to auto-expire objects older than ~24 h. Not required for this fix.
- **Anonymous path unchanged.** Still multipart, still subject to the 4.5 MB cap, but it is gated and not reachable from the current UI. If anonymous generation is ever re-enabled in the UI, it will need its own (non-RLS) upload strategy — out of scope here.
