# Welcome Modal, Name Capture & Feedback Channel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show brand-new users a one-time welcome modal that captures a first name, personalize the dashboard greeting + reminder emails with that name, and add an always-available feedback link.

**Architecture:** Add `name` + `has_seen_welcome` columns to `public.users` via a Supabase migration the user applies. A client `WelcomeModal` (modeled on the existing `QuotaHitModal`) mounts inside the persistent `DashboardShell` and renders only when `has_seen_welcome` is false; a server action persists the name and flips the flag. The greeting and reminder email read `users.name` with a graceful fallback. A small reusable `FeedbackLink` (mailto) sits in the dashboard sidebar and the pack/study header.

**Tech Stack:** Next.js 16 App Router (RSC + server actions), Supabase (`@/lib/supabase/server`), Tailwind v4 design tokens, lucide-react, Resend email templates, `node:test` via `tsx --test`.

**Spec:** `docs/superpowers/specs/2026-05-31-welcome-modal-name-feedback-design.md`

**Conventions (from repo `CLAUDE.md`):**
- New migrations use a **14-digit** `YYYYMMDDhhmmss_` prefix.
- Apply a single migration with `supabase db query --linked --file <path>` (NOT `db push`). The local CLI may not be authed — if it fails, the user runs the SQL in the Supabase SQL editor.
- Tests run with `npm test` → `tsx --test "src/**/*.test.ts"`, using `node:test` + `node:assert`.
- No emojis in UI. Use design tokens (`--color-*`, `--font-display`). Mobile-first (must work at 380px).

---

## File Structure

**Create:**
- `supabase/migrations/20260531140527_welcome_and_name.sql` — add columns + extend signup trigger.
- `src/lib/greeting.ts` — pure `dashboardGreeting(name)` helper.
- `src/lib/greeting.test.ts` — tests for the helper.
- `src/components/FeedbackLink.tsx` — reusable mailto feedback link.
- `src/components/dashboard/WelcomeModal.tsx` — the one-time modal (client).
- `src/lib/email/examReminder.test.ts` — tests for the email greeting line.

**Modify:**
- `src/app/dashboard/actions.ts` — add `saveWelcome` server action.
- `src/components/dashboard/DashboardShell.tsx` — accept `name` + `hasSeenWelcome`, mount modal, add feedback link to sidebar.
- `src/app/dashboard/layout.tsx` — fetch `name, has_seen_welcome`, pass to shell.
- `src/app/dashboard/page.tsx` — select `name`, render „Hey [Name]" greeting.
- `src/components/pack/PackHeader.tsx` — add feedback link.
- `src/lib/email/examReminder.ts` — add `name?` to `ReminderInput`, render greeting (HTML + text).
- `src/app/api/cron/exam-reminders/route.ts` — select `name`, pass into reminder input.

---

## Task 1: Database migration — `name` + `has_seen_welcome`

**Files:**
- Create: `supabase/migrations/20260531140527_welcome_and_name.sql`

- [ ] **Step 1: Generate a fresh 14-digit timestamp for the filename**

Run: `date +%Y%m%d%H%M%S`
Use the output as the file prefix (the plan uses `20260531140527` as a concrete example — rename if you regenerate). Keep the `_welcome_and_name.sql` suffix.

- [ ] **Step 2: Write the migration SQL**

Create `supabase/migrations/20260531140527_welcome_and_name.sql`:

```sql
-- Welcome modal + name capture.
-- Adds a display name and a one-time "has seen welcome modal" flag to the
-- user profile. Both are additive and safe to re-run.

alter table public.users
  add column if not exists name text,
  add column if not exists has_seen_welcome boolean not null default false;

-- Extend the existing signup trigger so OAuth (Google) users get their name
-- prefilled from provider metadata. Magic-link users have no metadata name —
-- they fill it in via the welcome modal. Keeps the existing (id) insert.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name)
  values (
    new.id,
    nullif(
      coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        ''
      ),
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
```

- [ ] **Step 3: Apply the migration**

Run: `supabase db query --linked --file supabase/migrations/20260531140527_welcome_and_name.sql`
Expected: success (no error). If the CLI is not authed/linked, STOP and ask the user to paste the SQL into the Supabase SQL editor and confirm it ran.

- [ ] **Step 4: Verify the columns exist**

Run: `supabase db query --linked --query "select column_name, data_type, column_default from information_schema.columns where table_schema='public' and table_name='users' and column_name in ('name','has_seen_welcome') order by column_name;"`
Expected: two rows — `has_seen_welcome | boolean | false` and `name | text | (null)`. If the CLI isn't available, ask the user to confirm in the Supabase dashboard.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260531140527_welcome_and_name.sql
git commit -m "feat(db): add users.name and users.has_seen_welcome"
```

---

## Task 2: Greeting helper (pure, tested)

**Files:**
- Create: `src/lib/greeting.ts`
- Test: `src/lib/greeting.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/greeting.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { dashboardGreeting } from "./greeting";

test("dashboardGreeting uses the name when present", () => {
  assert.equal(dashboardGreeting("Max"), "Hey Max");
});

test("dashboardGreeting trims surrounding whitespace", () => {
  assert.equal(dashboardGreeting("  Lena  "), "Hey Lena");
});

test("dashboardGreeting falls back when empty / whitespace / nullish", () => {
  assert.equal(dashboardGreeting(""), "Willkommen zurück");
  assert.equal(dashboardGreeting("   "), "Willkommen zurück");
  assert.equal(dashboardGreeting(null), "Willkommen zurück");
  assert.equal(dashboardGreeting(undefined), "Willkommen zurück");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/lib/greeting.test.ts`
Expected: FAIL — cannot find module `./greeting` / `dashboardGreeting is not a function`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/greeting.ts`:

```ts
// Personalized dashboard greeting. Returns "Hey <name>" when a usable name is
// present, otherwise a neutral fallback so we never render "Hey null".
export function dashboardGreeting(name?: string | null): string {
  const trimmed = (name ?? "").trim();
  return trimmed ? `Hey ${trimmed}` : "Willkommen zurück";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/lib/greeting.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/greeting.ts src/lib/greeting.test.ts
git commit -m "feat: add dashboardGreeting helper with graceful fallback"
```

---

## Task 3: `saveWelcome` server action

**Files:**
- Modify: `src/app/dashboard/actions.ts` (append a new export; reuse existing `authedClient` + `createServiceClient` + `revalidatePath` already imported at the top of the file)

- [ ] **Step 1: Add the action at the end of the file**

Append to `src/app/dashboard/actions.ts`:

```ts
// =========================================================================
// Welcome modal — persist the captured name (if any) and flip the one-time
// has_seen_welcome flag so the modal never shows again.
// =========================================================================
// `name` null/empty  → only the flag is flipped (dismiss without typing).
// `name` non-empty   → trimmed (≤80 chars) and stored, then flag flipped.
// Uses the service client for the UPDATE to match setExamReminderPreference
// (settings/actions.ts), which bypasses RLS for users-table writes.
export async function saveWelcome(
  name: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await authedClient();

  const trimmed = (name ?? "").trim().slice(0, 80);
  const patch: { has_seen_welcome: true; name?: string } = {
    has_seen_welcome: true,
  };
  if (trimmed) patch.name = trimmed;

  const service = createServiceClient();
  const { error } = await service.from("users").update(patch).eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `actions.ts`. (`authedClient`, `createServiceClient`, `revalidatePath` are already imported in this file — confirm you did not add duplicate imports.)

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/actions.ts
git commit -m "feat: add saveWelcome server action (name + has_seen_welcome)"
```

---

## Task 4: Reusable `FeedbackLink` component

**Files:**
- Create: `src/components/FeedbackLink.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/FeedbackLink.tsx`:

```tsx
import { LifeBuoy } from "lucide-react";
import { PROVIDER } from "@/lib/legal/provider";

// Always-available feedback channel. Opens the user's mail client with a
// prefilled subject to the founder inbox (info@lernly-app.de via PROVIDER).
const FEEDBACK_HREF = `mailto:${PROVIDER.email}?subject=${encodeURIComponent(
  "Lernly Feedback",
)}`;

export default function FeedbackLink({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <a
      href={FEEDBACK_HREF}
      aria-label="Feedback oder Problem melden"
      className={
        "inline-flex items-center gap-1.5 text-[12px] transition hover:text-white " +
        (className ?? "")
      }
      style={{ color: "var(--color-text-faint)" }}
    >
      <LifeBuoy size={13} strokeWidth={1.75} aria-hidden />
      {!compact && <span>Feedback / Problem melden</span>}
    </a>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (`LifeBuoy` exists in lucide-react ^1.8.0; `PROVIDER.email` is `"info@lernly-app.de"`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/FeedbackLink.tsx
git commit -m "feat: add reusable FeedbackLink (mailto) component"
```

---

## Task 5: `WelcomeModal` component

**Files:**
- Create: `src/components/dashboard/WelcomeModal.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/dashboard/WelcomeModal.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { saveWelcome } from "@/app/dashboard/actions";
import { PROVIDER } from "@/lib/legal/provider";

// =========================================================================
// WelcomeModal — one-time greeting shown the first time a user reaches the
// dashboard after signup. Visibility is driven by users.has_seen_welcome
// (passed in as `open`); both submit AND dismiss persist the flag so it
// never shows twice. Modeled on QuotaHitModal's overlay/dialog pattern.
// =========================================================================

const FEEDBACK_HREF = `mailto:${PROVIDER.email}?subject=${encodeURIComponent(
  "Lernly Feedback",
)}`;

export default function WelcomeModal({
  open,
  initialName,
}: {
  open: boolean;
  initialName: string | null;
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(open);
  const [name, setName] = useState(initialName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the name field on open.
  useEffect(() => {
    if (visible) inputRef.current?.focus();
  }, [visible]);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!visible) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [visible]);

  if (!visible) return null;

  // `submittedName === null` → dismiss (don't change name, just flip flag).
  const persist = (submittedName: string | null) => {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await saveWelcome(submittedName);
      if (result.ok === false) {
        setError(result.error);
        return;
      }
      setVisible(false);
      router.refresh();
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") persist(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
    >
      <button
        aria-label="Schließen"
        onClick={() => persist(null)}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      />
      <div
        className="relative w-full max-w-[420px] overflow-hidden rounded-3xl border p-7 text-white"
        style={{
          background: "#141930",
          borderColor: "rgba(255,255,255,0.10)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
        }}
      >
        <div className="relative">
          {/* Real Lernly mark, free-standing (no tinted icon chip). */}
          <Image
            src="/lernly-mark.png"
            alt="Lernly"
            width={40}
            height={40}
            priority
            className="mb-5"
          />

          <h2
            id="welcome-title"
            className="mb-3 text-[24px] font-semibold leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.5px",
              color: "var(--color-text)",
            }}
          >
            Schön, dass du da bist.
          </h2>

          <p
            className="mb-6 text-[14px] leading-relaxed"
            style={{ color: "var(--color-text-dim)" }}
          >
            Lernly ist brandneu — du gehörst zu den Ersten. Das meiste läuft
            schon richtig gut, aber es kann sein, dass mal was hakt oder etwas
            länger lädt. Danke, dass du uns trotzdem vertraust.
          </p>

          <label
            htmlFor="welcome-name"
            className="mb-2 block text-[12px] font-medium"
            style={{ color: "var(--color-text)" }}
          >
            Wie sollen wir dich nennen?
          </label>
          <input
            id="welcome-name"
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                persist(name);
              }
            }}
            type="text"
            maxLength={80}
            placeholder="Dein Vorname"
            autoComplete="given-name"
            className="mb-5 w-full rounded-xl px-4 py-3 text-[15px] text-white outline-none transition focus:border-white/40"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          />

          <p
            className="mb-6 text-[12.5px] leading-relaxed"
            style={{ color: "var(--color-text-faint)" }}
          >
            Stört dich was oder hast du eine Idee?{" "}
            <a
              href={FEEDBACK_HREF}
              className="underline-offset-2 hover:underline"
              style={{ color: "var(--color-primary-bright)" }}
            >
              Schreib mir direkt
            </a>{" "}
            — ich antworte innerhalb von 24 Stunden.
          </p>

          {error && (
            <p
              className="mb-4 text-[12.5px]"
              style={{ color: "var(--color-cat-coral)" }}
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => persist(name)}
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--color-primary)" }}
          >
            {pending ? "Speichern…" : "Los geht's →"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (Imports `saveWelcome` from Task 3; that must exist first.)

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/WelcomeModal.tsx
git commit -m "feat: add one-time WelcomeModal with name capture"
```

---

## Task 6: Wire the modal + feedback link into `DashboardShell`

**Files:**
- Modify: `src/components/dashboard/DashboardShell.tsx`

- [ ] **Step 1: Add imports**

In `src/components/dashboard/DashboardShell.tsx`, add to the existing imports (after line 15, `import { PrimaryCTALink } ...`):

```tsx
import WelcomeModal from "@/components/dashboard/WelcomeModal";
import FeedbackLink from "@/components/FeedbackLink";
```

- [ ] **Step 2: Extend the `Props` type and component signature**

Replace the `Props` type (lines 23–27):

```tsx
type Props = {
  email: string;
  recentPacks: RecentPack[];
  name: string | null;
  hasSeenWelcome: boolean;
  children: React.ReactNode;
};
```

Replace the component signature (line 230):

```tsx
export default function DashboardShell({
  email,
  recentPacks,
  name,
  hasSeenWelcome,
  children,
}: Props) {
```

- [ ] **Step 3: Add the feedback link to the sidebar**

In `SidebarContent`, inside the `<div className="mt-auto pt-6">` block, add the feedback link directly after the closing `</NavLink>` for „Einstellungen" (i.e. after line 208, before the `email` div on line 209):

```tsx
        <div className="mt-2 px-3">
          <FeedbackLink />
        </div>
```

- [ ] **Step 4: Mount the modal**

Inside the top-level returned `<div className="flex min-h-screen">` (after the `<Toaster ... />` element, before the closing `</div>` on line 368), add:

```tsx
      <WelcomeModal open={!hasSeenWelcome} initialName={name} />
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors ONLY in `src/app/dashboard/layout.tsx` (it doesn't yet pass `name` / `hasSeenWelcome`). That's fixed in Task 7. No errors inside `DashboardShell.tsx` itself.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/DashboardShell.tsx
git commit -m "feat: mount WelcomeModal + feedback link in DashboardShell"
```

---

## Task 7: Pass profile data from the dashboard layout

**Files:**
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Fetch the profile and pass new props**

Replace the body of `DashboardLayout` from the `const supabase = ...` line (line 23) through the `return (...)` so it reads:

```tsx
  const supabase = await createClient();
  const [{ data: recentRaw }, { data: profile }] = await Promise.all([
    supabase.rpc("list_pack_summaries"),
    supabase.from("users").select("name, has_seen_welcome").single(),
  ]);
  const recent: RecentPack[] = ((recentRaw ?? []) as RecentPack[]).slice(0, 5);

  // Default has_seen_welcome to TRUE on a missing/failed read so we never
  // flash the welcome modal at an established user because of a transient
  // query error. A genuinely-new user's row has it set to false.
  const name = (profile?.name as string | null) ?? null;
  const hasSeenWelcome = (profile?.has_seen_welcome as boolean | undefined) ?? true;

  return (
    <>
      <UserIdentifier
        userId={user.id}
        email={user.email ?? null}
        provider={user.app_metadata?.provider ?? null}
      />
      <DashboardShell
        email={user.email ?? ""}
        recentPacks={recent}
        name={name}
        hasSeenWelcome={hasSeenWelcome}
      >
        {children}
      </DashboardShell>
    </>
  );
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (DashboardShell now receives all required props).

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/layout.tsx
git commit -m "feat: load name + has_seen_welcome and pass to DashboardShell"
```

---

## Task 8: Personalized greeting on the dashboard page

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Import the helper**

Add after line 8 (`import { PrimaryCTALink } ...`):

```tsx
import { dashboardGreeting } from "@/lib/greeting";
```

- [ ] **Step 2: Select `name` from the users row**

Change the users query (line 106) from:

```tsx
    supabase.from("users").select("plan, packs_used_this_month").single(),
```

to:

```tsx
    supabase.from("users").select("plan, packs_used_this_month, name").single(),
```

- [ ] **Step 3: Derive the greeting**

After the `const planLabel = ...` line (line 121), add:

```tsx
  const greeting = dashboardGreeting(profile?.name as string | null | undefined);
```

- [ ] **Step 4: Render the greeting above the page heading**

Replace the eyebrow paragraph (lines 172–177, the „Deine Klausuren" `<p>`) with the greeting plus the original eyebrow:

```tsx
            <p
              className="mb-1 text-[15px] font-medium"
              style={{ color: "var(--color-text)" }}
            >
              {greeting}
            </p>
            <p
              className="mb-2 text-[11px] uppercase tracking-[0.22em]"
              style={{ color: "var(--color-text-faint)" }}
            >
              Deine Klausuren
            </p>
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: show personalized Hey [Name] greeting on dashboard"
```

---

## Task 9: Feedback link in the pack/study header

**Files:**
- Modify: `src/components/pack/PackHeader.tsx`

- [ ] **Step 1: Import the component**

Add after line 3 (`import { ChevronRight, Clock } ...`):

```tsx
import FeedbackLink from "@/components/FeedbackLink";
```

- [ ] **Step 2: Add the link to the breadcrumb row (pushed right)**

In the `<nav aria-label="Breadcrumb" ...>` element, after the `</span>` that closes the course-title breadcrumb crumb (line 51) and before the closing `</nav>` (line 53), add:

```tsx
        <FeedbackLink compact className="ml-auto" />
```

(The breadcrumb `<nav>` is already `flex items-center`; `ml-auto` pushes the icon to the right edge. `compact` renders icon-only so it stays clean at 380px.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/pack/PackHeader.tsx
git commit -m "feat: add feedback link to pack/study header"
```

---

## Task 10: Reminder email greeting (HTML + plaintext)

**Files:**
- Modify: `src/lib/email/examReminder.ts`
- Test: `src/lib/email/examReminder.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/email/examReminder.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  renderExamReminderEmail,
  renderExamReminderText,
} from "./examReminder";

const base = { examTitle: "Statistik I", daysLeft: 3, packId: null };

test("HTML email greets the user by name when provided", () => {
  const html = renderExamReminderEmail({ ...base, name: "Max" });
  assert.ok(html.includes("Hey Max,"), "expected 'Hey Max,' in HTML");
});

test("plaintext email greets the user by name when provided", () => {
  const text = renderExamReminderText({ ...base, name: "Max" });
  assert.ok(text.includes("Hey Max,"), "expected 'Hey Max,' in text");
});

test("HTML email uses a neutral greeting when name is empty/missing", () => {
  const html = renderExamReminderEmail({ ...base, name: "" });
  assert.ok(html.includes("Hallo,"), "expected neutral 'Hallo,' greeting");
  assert.ok(!html.includes("Hey ,"), "must not render empty 'Hey ,'");
  assert.ok(!html.toLowerCase().includes("null"), "must not contain 'null'");
});

test("name is HTML-escaped in the greeting", () => {
  const html = renderExamReminderEmail({ ...base, name: "<b>X</b>" });
  assert.ok(html.includes("&lt;b&gt;X&lt;/b&gt;"), "name must be escaped");
  assert.ok(!html.includes("<b>X</b>"), "raw HTML name must not appear");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/lib/email/examReminder.test.ts`
Expected: FAIL — `name` is not assignable to `ReminderInput` (type error) and/or greeting strings absent.

- [ ] **Step 3: Add `name` to the `ReminderInput` type**

In `src/lib/email/examReminder.ts`, change the type (lines 30–34):

```ts
export type ReminderInput = {
  examTitle: string;
  daysLeft: number; // 1, 3, or 7
  packId: string | null;
  name?: string | null;
};
```

- [ ] **Step 4: Add a greeting helper**

In `src/lib/email/examReminder.ts`, add this function just below `countdownLine` (after line 42):

```ts
function greetingLine(name?: string | null): string {
  const trimmed = (name ?? "").trim();
  return trimmed ? `Hey ${escapeHtml(trimmed)},` : "Hallo,";
}
```

- [ ] **Step 5: Render the greeting in the HTML body**

In `renderExamReminderEmail`, destructure `name` (line 58):

```ts
  const { examTitle, daysLeft, packId, name } = input;
```

Then, in the body cell, insert the greeting immediately after the eyebrow `<p>` (after line 103, before the hero `<h1>` on line 106):

```ts
              <!-- Greeting -->
              <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:${INK};">${greetingLine(name)}</p>
```

- [ ] **Step 6: Render the greeting in the plaintext body**

In `renderExamReminderText`, destructure `name` (line 156):

```ts
  const { examTitle, daysLeft, packId, name } = input;
```

Then add the greeting as a line near the top of the returned array — insert it as the first entry after the leading `"Lernly"`/blank lines, i.e. replace the `"Deine Klausur rückt näher",` line (line 164) with:

```ts
    greetingLine(name),
    "",
    "Deine Klausur rückt näher",
```

(Note: in plaintext the escaping is harmless — `escapeHtml` only affects `< > & " '`, which won't appear in a normal first name.)

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx tsx --test src/lib/email/examReminder.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add src/lib/email/examReminder.ts src/lib/email/examReminder.test.ts
git commit -m "feat(email): personalize exam reminder with Hey [Name] greeting"
```

---

## Task 11: Pass the name through the cron job

**Files:**
- Modify: `src/app/api/cron/exam-reminders/route.ts`

- [ ] **Step 1: Add `name` to the `UserRow` type**

Change the type (lines 57–61):

```ts
type UserRow = {
  id: string;
  email: string | null;
  exam_reminders_enabled: boolean;
  name: string | null;
};
```

- [ ] **Step 2: Select `name` in the users query**

Change line 90 from:

```ts
      .select("id, email, exam_reminders_enabled")
```

to:

```ts
      .select("id, email, exam_reminders_enabled, name")
```

- [ ] **Step 3: Pass `name` into the reminder input**

Change the `reminderInput` object (lines 142–146):

```ts
      const reminderInput = {
        examTitle: exam.title,
        daysLeft: days,
        packId,
        name: user.name,
      };
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (`ReminderInput.name` accepts `string | null` from Task 10).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/exam-reminders/route.ts
git commit -m "feat(cron): pass user name into exam reminder emails"
```

---

## Task 12: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: PASS, including `greeting.test.ts` and `examReminder.test.ts`. Note the pre-existing pass/fail baseline — your two new files must pass and you must not have broken any others.

- [ ] **Step 2: Typecheck the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors/warnings in the files you touched.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual verification checklist (dev server)**

Run: `npm run dev`, then verify against the spec's acceptance test:
- A user whose `users.has_seen_welcome = false` sees the modal on `/dashboard`. The Lernly mark shows free-standing (~40px, no tinted chip). Modal is usable at 380px width (DevTools device toolbar).
- Typing a name + „Los geht's →" closes the modal, and „Hey [Name]" appears on the dashboard. Reload `/dashboard` → modal does NOT reappear (`has_seen_welcome` is now true in the DB).
- For a fresh test user, dismissing via the backdrop/Escape also prevents it from returning.
- Empty name → greeting shows „Willkommen zurück" (never „Hey null").
- „Feedback / Problem melden" appears in the dashboard sidebar and opens a `mailto:info@lernly-app.de` with subject „Lernly Feedback"; a compact feedback icon appears in a pack/study page header.

To reset a user for re-testing:
`supabase db query --linked --query "update public.users set has_seen_welcome=false, name=null where id='<USER_ID>';"`

- [ ] **Step 6: Final commit (if any verification fixups were needed)**

```bash
git add -A
git commit -m "chore: verification fixups for welcome modal feature"
```

---

## Self-Review notes (author)

- **Spec coverage:** Deliverable 1 (flag + modal) → Tasks 1, 5, 6, 7. Deliverable 2 (name stored + greeting + reminder emails, graceful fallback) → Tasks 2, 3, 8, 10, 11. Deliverable 3 (persistent feedback link + optional Beta tag) → Tasks 4, 6, 9 (Beta tag intentionally omitted per decision). Deliverable 4 (tests) → Tasks 2, 10 + manual checklist in Task 12. Logo swap to free-standing `lernly-mark.png` → Task 5.
- **Type consistency:** `saveWelcome(name: string | null)` (Task 3) called with `null` for dismiss and `name` string for submit (Task 5). `ReminderInput.name?: string | null` (Task 10) fed `user.name: string | null` (Task 11). `DashboardShell` props `name: string | null` + `hasSeenWelcome: boolean` (Task 6) supplied by layout (Task 7). `dashboardGreeting` (Task 2) used in Task 8.
- **No placeholders:** every code step contains complete code; commands have expected output.
