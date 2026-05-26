# Phase 4 — Branded Transactional Emails + Cleanup Cron — Design Spec

**Date:** 2026-05-26
**Status:** Approved (brainstorming) — ready for implementation planning
**Builds on:** cram-mode Phases 1–3 (deployed). This is the final cram-mode phase, plus a project-wide email-branding layer.

---

## 1. Summary

Add professional, on-brand transactional emails to Lernly, sent via **Resend** from `noreply@lernly-app.de`:
- **Cram-done email** — "Deine Lernpakete sind fertig" when a background cram job completes (new, sent from our code).
- **Login/Magic-Link email** — Supabase Auth re-routed through Resend SMTP, branded to match.

Both share one reusable, email-safe **Lernly-styled layout** (logo + indigo brand colors). Plus the remaining Phase 4 piece: a **daily cleanup cron** that expires unpaid cram jobs and deletes their orphaned uploads.

## 2. Goals

- One shared branded email layout used by every Lernly-sent email (consistent, professional).
- Cram completion notification so users who closed the tab know their packs are ready.
- Login emails sent from our own domain via Resend (production-grade deliverability; Supabase's built-in mail is rate-limited and unfit for production) and branded.
- Clean up unpaid/abandoned cram jobs + their storage objects.

## 3. Non-Goals

- A general email framework (react-email etc.) — hand-rolled email-safe HTML; `resend` is the only new dependency.
- Marketing/newsletter emails, digests, or per-chunk failure emails (the dashboard already shows failed-chunk retry).
- Branding Stripe's receipt emails (Stripe sends + styles those itself).
- Storage TTL for files uploaded but never tied to a job (truly orphaned, no `cram_job`) — noted as a future add (Supabase Storage lifecycle rule).

## 4. Branded Email Layout (`src/lib/email/layout.ts`)

A single function builds every Lernly-sent email's HTML:

```
renderEmail({ preheader, heading, bodyHtml, ctaText?, ctaUrl? }): string
```

Email-safe construction: table-based, all styles inline, max-width ~560px, hidden preheader span, web-safe font stack (`-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`).

Visual structure (light body + indigo header — renders reliably across clients; fully-dark emails break in many):
- **Header band:** background `linear-gradient(135deg,#4A6CF7,#2E45B8)` (with `#4A6CF7` solid fallback), centered white **Lernly logo** — hosted PNG `https://www.lernly-app.de/lernly-logo-2048.png` rendered at ~150px wide.
- **Body card:** white `#ffffff`, text `#1a2647`, muted `#5b6478`, heading ~22px bold, comfortable line-height + padding (32px).
- **CTA button** (when `ctaUrl` given): solid `#4A6CF7`, white text, ~12×24px padding, 10px radius, bulletproof (table/VML-safe) so it renders in Outlook.
- **Footer:** background `#f4f5f8`, 12px muted text — "Lernly — dein KI-Lernassistent", links to `https://lernly-app.de/impressum` + `/datenschutz`, contact `info@lernly-app.de`, and a one-line "Du erhältst diese E-Mail, weil du ein Lernly-Konto hast."

Brand constants live in `src/lib/email/brand.ts` (logo URL, colors, from-address, footer links) so they're defined once.

## 5. Resend Sender (`src/lib/email/send.ts`)

```
sendEmail({ to, subject, html }): Promise<{ ok: boolean }>
```

- Uses the `resend` SDK with `process.env.RESEND_API_KEY`.
- From: `Lernly <noreply@lernly-app.de>` (constant in `brand.ts`).
- If `RESEND_API_KEY` is unset → log + no-op (returns `{ ok: false }`), never throws (same safe pattern as `getStripe()`). So missing config never breaks generation.
- Errors are caught + logged, never thrown to callers (email is best-effort).

## 6. Cram-Done Email

**Trigger:** in the worker (`/api/cram/worker`), after each successful `complete_cram_chunk(..., true)`, detect the job transitioning to `done` and notify exactly once.

**Once-only guard:** add column `done_notified_at timestamptz` to `cram_jobs` (migration). Claim the notification atomically:
```sql
update cram_jobs set done_notified_at = now()
where id = $1 and status = 'done' and done_notified_at is null
returning id;
```
Only the invocation that gets a row back sends the email (prevents duplicates when chunks finish concurrently across invocations).

**Recipient:** the job's user email via `service.auth.admin.getUserById(job.user_id)` (the `public.users` table has no email column; auth admin does).

**Content:** subject "Deine Lernpakete sind fertig 🎉"; heading + "N Lernpakete aus deinem Material sind fertig — viel Erfolg beim Lernen!" (N = count of `ready` chunks for the job); CTA "Zu deinen Paketen →" → `https://www.lernly-app.de/dashboard`. If some chunks failed, append a soft line "(M Pakete konnten nicht erstellt werden — du kannst sie im Dashboard erneut versuchen.)".

## 7. Login / Magic-Link Email (Supabase via Resend SMTP)

**Sending:** configured in the Supabase dashboard — Auth → SMTP Settings → custom SMTP using **Resend's SMTP** credentials (host `smtp.resend.com`, port 465, user `resend`, password = a Resend API key), sender `noreply@lernly-app.de`, sender name "Lernly". (User step; documented in the plan.)

**Branding:** branded HTML for the **Magic Link** template (Auth → Email Templates → Magic Link), using Supabase's `{{ .ConfirmationURL }}` token inside the same visual layout as §4. Stored in the repo for reference at `docs/email-templates/supabase-magic-link.html`; the user pastes it into the Supabase dashboard (Supabase templates aren't file-managed). Copy: heading "Dein Login-Link", body "Klick auf den Button, um dich bei Lernly anzumelden. Der Link ist 1 Stunde gültig.", CTA "Bei Lernly anmelden →" → `{{ .ConfirmationURL }}`.

> Only the Magic Link template is in scope (the app uses `signInWithOtp` + Google OAuth; no password/confirm-signup flow). The same layout can be applied to other Supabase templates later if needed.

## 8. Cleanup Cron (`/api/cram/cleanup`)

`POST /api/cram/cleanup`, protected by `Authorization: Bearer ${CRON_SECRET}` (same as the worker). On each run:
1. Select `cram_jobs` with `status = 'awaiting_payment'` and `created_at < now() - 24h`.
2. For each: collect `chunk_plan[].source_path`, delete those objects from the `study-uploads` bucket (service role), then delete the `cram_jobs` row.
   - (`awaiting_payment` jobs have no `study_packs` rows yet — chunks are only materialized by the webhook on payment — so only storage + the job row need removing.)
3. Return a small summary `{ expired, filesDeleted }`.

**Trigger:** the user adds a **second cron-job.org job** (once daily) pointing at `https://www.lernly-app.de/api/cram/cleanup` with the `CRON_SECRET` bearer header.

## 9. New Dependencies / Config / User Steps

- **Dep:** `resend`.
- **Env:** `RESEND_API_KEY` (Vercel production + local `.env.local`; documented in `.env.local.example`).
- **Migration:** `cram_jobs.done_notified_at` column.
- **User steps:**
  1. Verify `lernly-app.de` in Resend → add the DNS records Resend generates (SPF/DKIM/DMARC) at GoDaddy → wait for verified.
  2. Add `RESEND_API_KEY` to Vercel (+ `.env.local`).
  3. Supabase → Auth → SMTP = Resend creds + sender `noreply@lernly-app.de`.
  4. Paste the branded Magic-Link HTML into Supabase → Auth → Email Templates → Magic Link.
  5. Add the daily cleanup cron-job.org job.
- **Build/test before domain verification:** Resend's `onboarding@resend.dev` sender (delivers only to your own Resend account email) — lets us test the cram email while DNS propagates. Flip `FROM` to `noreply@lernly-app.de` once verified.

## 10. Error Handling

- All email sends are best-effort: `sendEmail` catches + logs, never throws → a failed/unconfigured email never breaks generation, the worker, or auth.
- The cram-done notification is guarded by `done_notified_at` (exactly-once even under concurrent invocations).
- Cleanup is idempotent: re-running deletes only still-expired `awaiting_payment` jobs; missing storage objects are ignored.
- Worker auth + cleanup auth reject without `CRON_SECRET`.

## 11. Testing

- **Unit (`node:test` / `tsx --test`):** `renderEmail` produces valid HTML containing the heading, CTA href, preheader, and brand from-address; `sendEmail` no-ops cleanly when `RESEND_API_KEY` is unset (mock). Pure-ish, testable.
- **Manual:** trigger a cram completion → confirm one branded email arrives (test sender first), renders correctly in Gmail + Apple Mail + Outlook web; request a magic link → confirm the branded Supabase email arrives via Resend from the Lernly domain; run cleanup against a stale `awaiting_payment` job → confirm files + job removed.

## 12. Build Order (each step shippable)

1. `resend` dep + `brand.ts` + `layout.ts` (+ unit test) + `send.ts`.
2. `done_notified_at` migration + cram-done email wired into the worker.
3. `/api/cram/cleanup` route.
4. Branded Magic-Link template HTML (committed to `docs/email-templates/`) — user pastes; SMTP + domain are user/config steps.

---

## Open Questions

None blocking. Defaults chosen: from `Lernly <noreply@lernly-app.de>`, logo `lernly-logo-2048.png` @150px, light body + indigo header, cleanup threshold 24h, cleanup cadence daily.
