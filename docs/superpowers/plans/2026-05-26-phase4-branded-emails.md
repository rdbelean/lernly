# Phase 4 — Branded Emails + Cleanup Cron Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send professional, on-brand Lernly emails via Resend — a cram-completion email from our code and a branded Supabase magic-link email — plus a daily cleanup cron for unpaid cram jobs.

**Architecture:** One reusable email-safe HTML layout (`src/lib/email/`) renders every Lernly-sent email (indigo header + logo, white body, bulletproof CTA, footer). A safe `sendEmail()` wraps the `resend` SDK and no-ops if unconfigured. The worker, after a cram job flips to `done`, sends the completion email exactly once (guarded by a new `done_notified_at` column). A `/api/cram/cleanup` route (CRON_SECRET-protected, daily trigger) expires unpaid jobs + their uploads. The magic-link email is branded via a committed HTML template the user pastes into Supabase (Auth sends through Resend SMTP).

**Tech Stack:** Next.js App Router, Supabase (service role + auth admin), `resend` (new), `node:test` via `tsx --test`.

**Builds on:** cram-mode Phases 1–3 (deployed). Spec: `docs/superpowers/specs/2026-05-26-phase4-branded-emails-design.md`.

---

## File Structure

**Create:**
- `src/lib/email/brand.ts` — brand constants (from-address, logo URL, colors, footer links).
- `src/lib/email/layout.ts` — `renderEmail()` email-safe HTML builder.
- `src/lib/email/layout.test.ts` — unit tests.
- `src/lib/email/send.ts` — `sendEmail()` Resend wrapper (safe no-op if unconfigured).
- `supabase/migrations/20260526_cram_done_notified.sql` — `cram_jobs.done_notified_at`.
- `src/app/api/cram/cleanup/route.ts` — daily cleanup of unpaid jobs + uploads.
- `docs/email-templates/supabase-magic-link.html` — branded magic-link template (pasted into Supabase by the user).

**Modify:**
- `src/app/api/cram/worker/route.ts` — send the cram-done email once per completed job.
- `.env.local.example` — `RESEND_API_KEY`.
- `package.json` — add `resend`.

---

### Task 1: Brand constants + email layout (+ tests) + sender

**Files:**
- Create: `src/lib/email/brand.ts`, `src/lib/email/layout.ts`, `src/lib/email/layout.test.ts`, `src/lib/email/send.ts`
- Modify: `package.json` (add `resend`)

- [ ] **Step 1: Install resend**

Run: `npm install resend`
Expected: `resend` added to `dependencies`.

- [ ] **Step 2: Create brand constants**

Create `src/lib/email/brand.ts`:

```ts
// Single source of truth for Lernly email branding.
export const EMAIL_FROM = "Lernly <noreply@lernly-app.de>";
export const APP_URL = "https://www.lernly-app.de";
export const LOGO_URL = `${APP_URL}/lernly-logo-2048.png`;
export const BRAND = {
  headerGradient: "linear-gradient(135deg,#4A6CF7,#2E45B8)",
  headerSolid: "#4A6CF7", // Outlook fallback (ignores gradient)
  cta: "#4A6CF7",
  ink: "#1a2647",
  muted: "#5b6478",
  pageBg: "#eef0f5",
  footerBg: "#f4f5f8",
  footerInk: "#8a93a6",
} as const;
export const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
```

- [ ] **Step 3: Write the failing test**

Create `src/lib/email/layout.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderEmail } from "./layout";

test("renderEmail includes heading, preheader, body and logo", () => {
  const html = renderEmail({
    preheader: "Vorschautext",
    heading: "Hallo Welt",
    bodyHtml: "<p>Inhalt hier</p>",
  });
  assert.match(html, /Vorschautext/);
  assert.match(html, /Hallo Welt/);
  assert.match(html, /Inhalt hier/);
  assert.match(html, /lernly-logo-2048\.png/);
  assert.match(html, /<!doctype html>/i);
});

test("renderEmail renders a CTA button only when ctaUrl is given", () => {
  const withCta = renderEmail({
    preheader: "p",
    heading: "h",
    bodyHtml: "b",
    ctaText: "Los geht's",
    ctaUrl: "https://www.lernly-app.de/dashboard",
  });
  assert.match(withCta, /https:\/\/www\.lernly-app\.de\/dashboard/);
  assert.match(withCta, /Los geht's/);

  const noCta = renderEmail({ preheader: "p", heading: "h", bodyHtml: "b" });
  assert.doesNotMatch(noCta, /Los geht's/);
});

test("renderEmail escapes nothing in bodyHtml (caller supplies safe HTML)", () => {
  const html = renderEmail({ preheader: "p", heading: "h", bodyHtml: "<strong>fett</strong>" });
  assert.match(html, /<strong>fett<\/strong>/);
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx tsx --test src/lib/email/layout.test.ts`
Expected: FAIL — `Cannot find module './layout'`.

- [ ] **Step 5: Implement the layout**

Create `src/lib/email/layout.ts`:

```ts
import { APP_URL, BRAND, FONT_STACK, LOGO_URL } from "./brand";

export type EmailParams = {
  preheader: string;
  heading: string;
  bodyHtml: string; // caller-supplied safe HTML
  ctaText?: string;
  ctaUrl?: string;
};

export function renderEmail({
  preheader,
  heading,
  bodyHtml,
  ctaText,
  ctaUrl,
}: EmailParams): string {
  const cta =
    ctaUrl && ctaText
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 4px;"><tr><td bgcolor="${BRAND.cta}" style="border-radius:10px;">
        <a href="${ctaUrl}" style="display:inline-block;padding:13px 26px;font-family:${FONT_STACK};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${ctaText}</a>
      </td></tr></table>`
      : "";

  return `<!doctype html>
<html lang="de"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
</head>
<body style="margin:0;padding:0;background:${BRAND.pageBg};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.pageBg};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e7ee;">
    <tr><td style="background:${BRAND.headerSolid};background:${BRAND.headerGradient};padding:28px;text-align:center;">
      <img src="${LOGO_URL}" width="150" alt="Lernly" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;width:150px;max-width:60%;height:auto;">
    </td></tr>
    <tr><td style="padding:32px;font-family:${FONT_STACK};">
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.ink};">${heading}</h1>
      <div style="font-size:15px;line-height:1.6;color:${BRAND.muted};">${bodyHtml}</div>
      ${cta}
    </td></tr>
    <tr><td style="background:${BRAND.footerBg};padding:20px 32px;font-family:${FONT_STACK};font-size:12px;line-height:1.6;color:${BRAND.footerInk};text-align:center;">
      Lernly — dein KI-Lernassistent<br>
      <a href="${APP_URL.replace("www.", "")}/impressum" style="color:${BRAND.footerInk};">Impressum</a> ·
      <a href="${APP_URL.replace("www.", "")}/datenschutz" style="color:${BRAND.footerInk};">Datenschutz</a> ·
      info@lernly-app.de<br>
      Du erhältst diese E-Mail, weil du ein Lernly-Konto hast.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx tsx --test src/lib/email/layout.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 7: Implement the sender**

Create `src/lib/email/send.ts`:

```ts
import "server-only";
import { Resend } from "resend";
import { EMAIL_FROM } from "./brand";

// Best-effort transactional send. No-ops (never throws) when RESEND_API_KEY is
// unset, so a missing/failed email never breaks generation or the worker.
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY unset — skipping send:", subject);
    return { ok: false };
  }
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({ from: EMAIL_FROM, to, subject, html });
    if (error) {
      console.error("[email] send failed:", error);
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] send threw:", e);
    return { ok: false };
  }
}
```

- [ ] **Step 8: Typecheck + lint + full suite**

Run: `npx tsc --noEmit && npx eslint src/lib/email/*.ts && npm test`
Expected: tsc 0; eslint clean; tests pass (61 + 3 new = 64).

- [ ] **Step 9: Commit**

```bash
git add src/lib/email package.json package-lock.json
git commit -m "feat(email): branded Resend email layout + safe sender"
```

---

### Task 2: `done_notified_at` migration

**Files:**
- Create: `supabase/migrations/20260526_cram_done_notified.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260526_cram_done_notified.sql`:

```sql
-- Guard so the cram-done email is sent exactly once per job, even when the
-- final chunks complete concurrently across worker invocations.
alter table public.cram_jobs add column if not exists done_notified_at timestamptz;
```

- [ ] **Step 2: Apply (user step)**

Run: `npx supabase db push` (or Supabase SQL editor).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260526_cram_done_notified.sql
git commit -m "feat(cram): done_notified_at column for once-only completion email"
```

---

### Task 3: Send the cram-done email from the worker

**Files:**
- Modify: `src/app/api/cram/worker/route.ts`

- [ ] **Step 1: Add the notification helper + imports**

In `src/app/api/cram/worker/route.ts`, add imports near the top:

```ts
import { renderEmail } from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/send";
import { APP_URL } from "@/lib/email/brand";
```

Add this helper function above the `POST` handler (it uses the same `service` client type the route already creates):

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

// Send the "packs ready" email exactly once, the moment a job reaches 'done'.
// The conditional UPDATE atomically claims the notification (only one invocation
// wins), so concurrent workers can't double-send.
async function notifyJobDoneOnce(service: SupabaseClient, jobId: string): Promise<void> {
  const { data: claimed } = await service
    .from("cram_jobs")
    .update({ done_notified_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "done")
    .is("done_notified_at", null)
    .select("id, user_id");
  if (!claimed || claimed.length === 0) return; // not done yet, or already notified

  const userId = claimed[0].user_id as string;
  const { data: udata } = await service.auth.admin.getUserById(userId);
  const email = udata?.user?.email;
  if (!email) return;

  const { data: chunks } = await service
    .from("study_packs")
    .select("status")
    .eq("cram_job_id", jobId);
  const ready = (chunks ?? []).filter((c) => c.status === "ready").length;
  const failed = (chunks ?? []).filter((c) => c.status === "failed").length;

  const failedLine =
    failed > 0
      ? `<p style="margin:14px 0 0;">${failed} ${failed === 1 ? "Paket konnte" : "Pakete konnten"} nicht erstellt werden — im Dashboard kannst du sie erneut versuchen.</p>`
      : "";
  const html = renderEmail({
    preheader: `${ready} Lernpakete sind fertig`,
    heading: "Deine Lernpakete sind fertig 🎉",
    bodyHtml: `<p style="margin:0;">Wir haben <strong>${ready} Lernpaket${ready === 1 ? "" : "e"}</strong> aus deinem Material erstellt. Viel Erfolg beim Lernen!</p>${failedLine}`,
    ctaText: "Zu deinen Paketen →",
    ctaUrl: `${APP_URL}/dashboard`,
  });
  await sendEmail({ to: email, subject: "Deine Lernpakete sind fertig 🎉", html });
}
```

- [ ] **Step 2: Call it after the processing loop**

In the `POST` handler, after the `for (const row of rows) { ... }` loop and before `return NextResponse.json(...)`, add:

```ts
  // Notify once for any job that just reached 'done' during this run.
  const touchedJobIds = [...new Set(rows.map((r) => r.cram_job_id))];
  for (const jobId of touchedJobIds) {
    try {
      await notifyJobDoneOnce(service, jobId);
    } catch (e) {
      console.error("[cram/worker] done-notification failed", e);
    }
  }
```

(`row.cram_job_id` is already on the claimed `QueuedPack` rows.)

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/cram/worker/route.ts`
Expected: tsc 0; eslint clean. (If `SupabaseClient` import path differs, mirror the one used in `@/lib/supabase/server`.)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cram/worker/route.ts
git commit -m "feat(cram): send branded completion email when a job finishes"
```

---

### Task 4: Cleanup cron route

**Files:**
- Create: `src/app/api/cram/cleanup/route.ts`

- [ ] **Step 1: Implement**

Create `src/app/api/cram/cleanup/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { STUDY_UPLOADS_BUCKET } from "@/lib/uploads";

export const runtime = "nodejs";

const EXPIRE_HOURS = 24;

type PlanEntry = { source_path?: string };

export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const service = createServiceClient();
  const cutoff = new Date(Date.now() - EXPIRE_HOURS * 60 * 60 * 1000).toISOString();

  const { data: jobs, error } = await service
    .from("cram_jobs")
    .select("id, chunk_plan")
    .eq("status", "awaiting_payment")
    .lt("created_at", cutoff)
    .limit(100);
  if (error) {
    console.error("[cram/cleanup] query failed", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  let filesDeleted = 0;
  for (const job of jobs ?? []) {
    const plan = (job.chunk_plan ?? []) as PlanEntry[];
    const paths = [...new Set(plan.map((p) => p.source_path).filter((p): p is string => !!p))];
    if (paths.length > 0) {
      const { error: rmErr } = await service.storage.from(STUDY_UPLOADS_BUCKET).remove(paths);
      if (rmErr) console.error("[cram/cleanup] storage remove failed", rmErr);
      else filesDeleted += paths.length;
    }
    await service.from("cram_jobs").delete().eq("id", job.id);
  }

  return NextResponse.json({ expired: jobs?.length ?? 0, filesDeleted });
}
```

- [ ] **Step 2: Typecheck + lint + build**

Run: `npx tsc --noEmit && npx eslint src/app/api/cram/cleanup/route.ts && npm run build`
Expected: tsc 0; eslint clean; build succeeds with `/api/cram/cleanup` listed.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cram/cleanup/route.ts
git commit -m "feat(cram): daily cleanup of unpaid jobs + orphaned uploads"
```

---

### Task 5: Branded Supabase magic-link template + env doc

**Files:**
- Create: `docs/email-templates/supabase-magic-link.html`
- Modify: `.env.local.example`

- [ ] **Step 1: Write the branded magic-link template**

Create `docs/email-templates/supabase-magic-link.html` (this is the same visual layout as `renderEmail`, hand-inlined, using Supabase's `{{ .ConfirmationURL }}` token — Supabase templates can't import our code, so it's a standalone copy):

```html
<!doctype html>
<html lang="de"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
</head>
<body style="margin:0;padding:0;background:#eef0f5;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">Dein Login-Link für Lernly</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef0f5;">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e7ee;">
    <tr><td style="background:#4A6CF7;background:linear-gradient(135deg,#4A6CF7,#2E45B8);padding:28px;text-align:center;">
      <img src="https://www.lernly-app.de/lernly-logo-2048.png" width="150" alt="Lernly" style="display:block;margin:0 auto;border:0;width:150px;max-width:60%;height:auto;">
    </td></tr>
    <tr><td style="padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:#1a2647;">Dein Login-Link</h1>
      <div style="font-size:15px;line-height:1.6;color:#5b6478;">
        <p style="margin:0;">Klick auf den Button, um dich bei Lernly anzumelden. Der Link ist 1 Stunde gültig.</p>
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 4px;"><tr><td bgcolor="#4A6CF7" style="border-radius:10px;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 26px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Bei Lernly anmelden →</a>
      </td></tr></table>
      <p style="margin:16px 0 0;font-size:13px;color:#8a93a6;">Falls der Button nicht geht, kopiere diesen Link:<br><span style="word-break:break-all;">{{ .ConfirmationURL }}</span></p>
    </td></tr>
    <tr><td style="background:#f4f5f8;padding:20px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8a93a6;text-align:center;">
      Lernly — dein KI-Lernassistent<br>
      <a href="https://lernly-app.de/impressum" style="color:#8a93a6;">Impressum</a> ·
      <a href="https://lernly-app.de/datenschutz" style="color:#8a93a6;">Datenschutz</a> ·
      info@lernly-app.de<br>
      Du erhältst diese E-Mail, weil ein Login für dein Lernly-Konto angefordert wurde.
    </td></tr>
  </table>
</td></tr></table>
</body></html>
```

- [ ] **Step 2: Document the env var**

Add to `.env.local.example` (near the Stripe block):

```
# Resend — transactional email (cram-done + Supabase auth via SMTP).
# Create an API key at resend.com → API Keys. Same key works as the SMTP
# password (user "resend", host smtp.resend.com, port 465) for Supabase SMTP.
RESEND_API_KEY=re_...
```

- [ ] **Step 3: Commit**

```bash
git add docs/email-templates/supabase-magic-link.html .env.local.example
git commit -m "feat(email): branded Supabase magic-link template + RESEND_API_KEY doc"
```

---

### Task 6: Verification + user/config steps

**Files:** none.

- [ ] **Step 1: Full suite + build**

Run: `npm test && npm run build`
Expected: 64 tests pass; build succeeds (`/api/cram/cleanup` listed).

- [ ] **Step 2: User — Resend domain + API key**

In Resend: add domain `lernly-app.de` → add the generated SPF/DKIM/DMARC records at GoDaddy → wait until "Verified". Create an API key. Add `RESEND_API_KEY` to **Vercel** (Production) + local `.env.local`. Redeploy.
(Before the domain is verified, temporarily set `EMAIL_FROM` in `src/lib/email/brand.ts` to `onboarding@resend.dev` to test the cram email to your own Resend-account email; revert to `noreply@lernly-app.de` once verified.)

- [ ] **Step 3: User — Supabase SMTP + magic-link template**

Supabase dashboard → Project Settings → Auth → SMTP Settings → enable custom SMTP:
host `smtp.resend.com`, port `465`, user `resend`, password = a Resend API key, sender email `noreply@lernly-app.de`, sender name `Lernly`.
Then Auth → Email Templates → **Magic Link** → paste the contents of `docs/email-templates/supabase-magic-link.html` → save.

- [ ] **Step 4: User — daily cleanup cron**

In cron-job.org, add a second job: **POST** `https://www.lernly-app.de/api/cram/cleanup`, header `Authorization: Bearer <CRON_SECRET>`, schedule **once daily**.

- [ ] **Step 5: Manual verification**

- Finish a cram job → exactly one branded "Deine Lernpakete sind fertig" email arrives; renders in Gmail + Apple Mail + Outlook web.
- Request a magic link → branded email arrives from `noreply@lernly-app.de` via Resend.
- POST `/api/cram/cleanup` with the bearer → returns `{expired,filesDeleted}`; a stale `awaiting_payment` job + its uploads are gone. (401 without the bearer.)

---

## Notes

- `sendEmail` is best-effort everywhere: unconfigured or failing email never breaks generation, the worker, or auth.
- Supabase email templates can't reference our code, so `supabase-magic-link.html` is a hand-inlined copy of the same look; if the brand changes, update both `layout.ts` and that file.
- Future (out of scope): a Supabase Storage lifecycle rule to expire files uploaded but never attached to a job (no `cram_job` references them, so the cleanup cron can't see them).
