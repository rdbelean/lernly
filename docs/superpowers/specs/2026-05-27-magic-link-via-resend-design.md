# Magic-Link via Resend + Robust Login Form — Design Spec

**Date:** 2026-05-27
**Status:** Approved (brainstorming) — ready for implementation planning

---

## 1. Problem (proven)

- Magic-link login **hangs forever**: `POST /auth/v1/otp` ran **962 s with no response**. Supabase's custom SMTP (Resend) connection hangs (port/TLS misconfig), so `signInWithOtp` never returns → the button "does nothing."
- The login form gives **no feedback** (server-action forms, no loading/error state) → silent hang feels like a dead button. A filled email also appears to block the Google button (client/form fragility).
- Our **own Resend send works** (cram email + direct test both delivered).

## 2. Goal

Magic-link login works reliably for **new and existing** users, sent through **our Resend** (not Supabase SMTP), branded, with a login form that always shows clear state (loading → "check your mail" / error) and where Google and magic-link are fully independent.

## 3. Non-Goals

- Fixing Supabase's SMTP config (we abandon it for auth email; Supabase SMTP can stay configured or not — irrelevant once we send ourselves).
- Password-based accounts (still passwordless: magic-link + Google).
- Changing the `/auth/callback` exchange (the generated link uses the same callback).

## 4. Backend — send the magic-link ourselves

New server action `requestMagicLink(formData)` (replaces the send half of `loginWithMagicLink`), service-role, server-only:

1. Validate `email` (must contain `@`); read `next` (sanitized, same as today).
2. `redirectTo = ${origin}/auth/callback?next=${encodeURIComponent(next)}` (same callback as before).
3. Ensure the user exists, then generate a magic link (admin):
   ```
   service = createServiceClient()
   let { data, error } = await service.auth.admin.generateLink({
     type: "magiclink", email, options: { redirectTo },
   });
   if (error and /not.*found|no.*user|does not exist/i on error.message):
     await service.auth.admin.createUser({ email, email_confirm: false }); // passwordless, auto-created on first login (replicates old shouldCreateUser)
     ({ data, error } = await service.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } }));
   if (error or !data) → return { ok: false, error: "Konnte den Login-Link nicht erstellen." }
   ```
4. `actionLink = data.properties.action_link`.
5. `html = renderMagicLinkEmail(actionLink)` (branded, via the existing `renderEmail()` layout — heading "Dein Login-Link", body "Klick auf den Button, um dich bei Lernly anzumelden. Der Link ist 1 Stunde gültig.", CTA "Bei Lernly anmelden →" → actionLink).
6. `await sendEmail({ to: email, subject: "Dein Login-Link für Lernly", html })` (our Resend wrapper).
7. Return `{ ok: true }` (or `{ ok:false, error }`). The action **returns a result** (for `useActionState`) instead of redirecting, so the client renders feedback.

`renderMagicLinkEmail(actionLink)` lives in `src/lib/email/` and reuses `renderEmail()` — so it's identical branding to the cram email, in code (the standalone `docs/email-templates/supabase-magic-link.html` is now unused for sending; keep or delete).

**Abuse throttle:** since we no longer get Supabase's built-in OTP rate limit, add a lightweight per-email cooldown (e.g. reuse a Supabase RPC or a simple `magic_link_requests` check) — **deferred to a follow-up**; for launch, Resend's sending limits + the 1-hour link validity are acceptable. (Noted, not built now.)

`loginWithGoogle` is unchanged (OAuth works).

## 5. Frontend — robust login form

Make the login card's interactive parts a **client component** (`src/app/login/login-form.tsx`):
- **Google:** a normal `<form action={loginWithGoogle}>` (server action OAuth redirect — works as-is, kept in its own form).
- **Magic-link:** a separate client `<form action={requestMagicLink}>` driven by `useActionState`:
  - `email` input (`type=email`, `noValidate` on the form so our handler controls validation feedback) + `next` hidden.
  - A submit button using `useFormStatus().pending` → shows a spinner + "Wird gesendet…" while in flight; disabled during.
  - On result: `ok` → green "Check deine Mails — Login-Link an {email} geschickt."; `error` → red error text. Inline, no redirect.
- The two forms are independent siblings → a filled email never affects the Google button.
- The page (`page.tsx`) stays a server component (auth check + layout) and renders `<LoginForm next={next} />`.

## 6. Data Flow

user enters email → `requestMagicLink` (server, Resend) → branded mail with Supabase `action_link` → user clicks → `/auth/callback` exchanges session → dashboard. No Supabase SMTP anywhere.

## 7. Error Handling

- `sendEmail` is best-effort but here we surface failure: if `sendEmail` returns `{ok:false}` or generateLink errors, `requestMagicLink` returns `{ok:false, error}` → the form shows a clear message (never a silent hang).
- `generateLink`/`createUser` errors are caught and mapped to a friendly German error.
- Email send is fast (Resend API), so no multi-minute hangs.

## 8. Testing

- Unit (`node:test`): `renderMagicLinkEmail(url)` contains the url in the CTA + brand markup (extends the existing email-layout tests).
- Manual: existing user → link arrives via Resend, click → logged in. Brand-new email → account auto-created, link arrives, click → logged in. Filled email + click Google → Google works (independent). Submit magic-link → spinner → "Check deine Mails".

## 9. Config / Dependencies

- No new deps (`resend` already in). `RESEND_API_KEY` already set (Vercel + local).
- Supabase custom SMTP becomes irrelevant for auth (can be disabled later).

## 10. Build Order

1. `renderMagicLinkEmail()` (+ test).
2. `requestMagicLink` server action (admin generateLink + create-user fallback + Resend send).
3. `login-form.tsx` client component (Google form + magic-link `useActionState` form with feedback); wire into `page.tsx`.
4. Verify (tsc/tests/build) + deploy + manual (new + existing user).

---

## Open Questions

None blocking. Per-email abuse throttle deferred to a follow-up.
