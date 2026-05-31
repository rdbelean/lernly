# Design — First-time Welcome Modal, Name Capture & Feedback Channel

Date: 2026-05-31
Status: Approved-pending-review
Repo: lernly (Next.js 16 App Router · Supabase · Tailwind v4 · Resend · lucide-react)

## Goal

Greet brand-new users once, capture a first name for personalization, and give
every user an always-available, low-friction way to send feedback to the
founder. MVP-honest founder voice, German UI, mobile-first (380px), unified
dark design tokens, no emojis.

## Decisions (locked)

- **DB change**: SQL migration file the user applies (Supabase CLI not locally
  authed). 14-digit `YYYYMMDDhhmmss_` prefix per repo convention; applied with
  `supabase db query --linked --file <path>`.
- **Feedback channel**: `mailto:` link (simplest first), to `info@lernly-app.de`
  (the address already in `src/lib/legal/provider.ts` `PROVIDER.email` and used
  in Impressum/Datenschutz). Reuse the constant — do not hardcode.
- **Feedback placement**: dashboard header + study/pack header (NOT settings).
- **Beta tag**: not included.
- **Reminder email greeting**: add `Hey [Name],` (HTML + plaintext) with a
  graceful fallback when name is empty.
- **Modal logo**: real `public/lernly-mark.png` at ~40px, free-standing (no
  tinted icon chip around it).

## Current-state facts (verified)

- `public.users` columns: `id, plan, packs_used_this_month,
  exam_reminders_enabled, stripe_*`. **No `name`, no `has_seen_welcome`.**
- A `handle_new_user()` trigger already inserts the `users` row on signup.
- Auth: Google OAuth + email magic-link. Magic-link users arrive with no name.
- Dashboard renders inside `DashboardShell` (`src/app/dashboard/layout.tsx` →
  `src/components/dashboard/DashboardShell.tsx`); it already loads
  `lernly-mark.png` and lucide icons. There is **no greeting today**.
- Pack/study pages render under `/dashboard/pack/[id]` (so they are inside
  `DashboardShell`) and additionally have `src/components/pack/PackHeader.tsx`.
- Reminder email `src/lib/email/examReminder.ts` takes
  `{ examTitle, daysLeft, packId }` and has **no name/greeting**; the cron
  `src/app/api/cron/exam-reminders/route.ts` selects only
  `id, email, exam_reminders_enabled`.
- Mutations use server actions (`src/app/dashboard/settings/actions.ts`).
- Existing modal pattern: `src/components/dashboard/QuotaHitModal.tsx`
  (fixed overlay, `role="dialog"`, dimmed + blurred backdrop).
- Tokens: card `#141930`, primary deep-indigo `#2B3499`, text `#EAEDF7`,
  text-dim `#9098B6`, `--font-sora` (display) / `--font-inter`.

## Components & changes

### 1. Migration — `supabase/migrations/<ts>_welcome_and_name.sql`
```sql
alter table public.users
  add column if not exists name text,
  add column if not exists has_seen_welcome boolean not null default false;
```
Optionally extend `handle_new_user()` to seed `name` from
`new.raw_user_meta_data->>'full_name'` so Google users are prefilled. Provide
the exact `supabase db query --linked --file …` command to the user.

### 2. `WelcomeModal.tsx` (client) — `src/components/dashboard/`
- Mounted in `DashboardShell`; renders only when `hasSeenWelcome === false`.
- Layout/behavior modeled on `QuotaHitModal`: fixed overlay, dimmed backdrop,
  `role="dialog"`, `aria-modal`, Escape + backdrop dismiss, focus the input on
  open. Card `#141930`, max-width ~420px, works at 380px.
- Top: `lernly-mark.png` `width≈40 height≈40`, free-standing.
- Copy (exact):
  - Headline (Sora): „Schön, dass du da bist."
  - Body: „Lernly ist brandneu — du gehörst zu den Ersten. Das meiste läuft
    schon richtig gut, aber es kann sein, dass mal was hakt oder etwas länger
    lädt. Danke, dass du uns trotzdem vertraust."
  - Name label: „Wie sollen wir dich nennen?" placeholder „Dein Vorname"
    (prefilled from existing name/OAuth metadata if present).
  - Feedback note: „Stört dich was oder hast du eine Idee? Schreib mir direkt —
    ich antworte innerhalb von 24 Stunden." with the founder email as a
    `mailto:` link.
  - CTA (deep-indigo, single): „Los geht's →".
- CTA → server action `saveWelcome({ name })`; dismiss → `saveWelcome({})`
  (name unchanged). Both set `has_seen_welcome = true`. On success the modal
  unmounts and never reappears (DB-backed flag, not local state).

### 3. Name capture + personalization
- Server action `saveWelcome` in a dashboard actions file: trims name, writes
  `users.name` (only if non-empty) and `has_seen_welcome = true` for the
  authenticated user; `revalidatePath('/dashboard')`.
- Greeting helper (pure, unit-testable): `greetingName(name) → "Hey <name>"`
  when non-empty, else a neutral fallback (no „Hey null").
- `DashboardShell` header shows the greeting; `dashboard/layout.tsx` passes the
  profile `name` + `has_seen_welcome` down (select them where the user row is
  already fetched).
- Reminder email: add `name?: string` to `ReminderInput`; render „Hey [Name],"
  (HTML + plaintext) with fallback; cron selects `name` and passes it.

### 4. Persistent feedback link
- Small „Feedback / Problem melden" control (lucide `LifeBuoy` or
  `MessageCircle`, no emoji) → `mailto:${PROVIDER.email}?subject=Lernly%20Feedback`.
- Placed in `DashboardShell` header and `PackHeader`. Mobile: keep it compact
  (icon + short label, or icon-only with `aria-label` under 380px).

### 5. Tests (`tsx --test`, `*.test.ts`)
- `greetingName`: name → „Hey X"; empty/whitespace → neutral fallback (never
  „null"/„undefined").
- Modal gating logic: visible when `has_seen_welcome` false; hidden after
  save/dismiss. (Pure logic / helper level — no DOM harness in repo.)

## Data flow

signup → trigger inserts `users` row (`has_seen_welcome=false`) → first
`/dashboard` load: layout selects `name, has_seen_welcome` → `DashboardShell`
mounts `WelcomeModal` → user submits → `saveWelcome` writes name + flips flag →
revalidate → modal gone forever → greeting + reminders read `users.name`.

## Edge cases

- Returning users (`has_seen_welcome=true`) never see the modal — no flash of it on load (flag is read server-side before render).
- Empty/whitespace name → not written; greeting + email use neutral fallback.
- OAuth name present → prefilled, user can edit; submitting empty keeps prefill.
- Dismiss without typing still flips the flag (modal is one-time by design).

## Out of scope

In-app feedback form (mailto chosen), Beta tag, settings-page feedback link,
redesign of the reminder email's countdown-hero layout (only a greeting line is
added).
