# Google-Login Primary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Google the unambiguous default sign-in by collapsing the email magic-link form behind a secondary "oder mit E-Mail …" toggle that reveals it on click.

**Architecture:** Presentation-only change in `src/app/login/login-form.tsx`. A new `showEmail` state (default `false`) gates the email `<form>`; a toggle button reveals it and moves focus to the email input. Turnstile lives inside that form, so it only mounts when expanded. No auth logic, server actions, or backend touched.

**Tech Stack:** Next.js 16 client component (React `useState`/`useRef`).

## Global Constraints

- Presentation only: `loginWithGoogle`, `requestMagicLink`, `verifyMagicCode`, `/auth/callback`, `/auth/confirm` stay byte-identical.
- App chrome stays German; code + comments English.
- Applies to BOTH modes: `register` (`?mode=register`) and login.
- No component-test infra in this repo (tests are `tsx --test` on pure libs) → verification is `tsc` + `next build` + a preview check. Do not invent a React test harness.
- Never commit to `main`; work on branch `google-login-primary` (already created).

---

### Task 1: Collapse the email form behind a toggle

**Files:**
- Modify: `src/app/login/login-form.tsx`

**Interfaces:**
- Consumes: existing `reqAction`, `register`, `turnstileToken`, `setTurnstileToken` (already in scope).
- Produces: nothing for other tasks (self-contained UI change).

- [ ] **Step 1: Import `useRef`**

Change the React import (line 3):

```tsx
import { useActionState, useEffect, useRef, useState } from "react";
```

- [ ] **Step 2: Add the `showEmail` state + email input ref**

Immediately after `const [turnstileToken, setTurnstileToken] = useState("");` (line 74), add:

```tsx
  // Email magic-link is collapsed by default so Google is the obvious action.
  // Turnstile lives inside the email form, so it only mounts once expanded.
  const [showEmail, setShowEmail] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
```

- [ ] **Step 3: Replace the "oder" divider + email form with the toggle + conditional form**

Replace this whole block (the divider at ~288–297 and the email `<form>` at ~299–329):

```tsx
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.12)" }} />
        <span
          className="text-[12px] uppercase tracking-[0.18em]"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          oder
        </span>
        <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.12)" }} />
      </div>

      <form action={reqAction} noValidate className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="turnstileToken" value={turnstileToken} />
        <label
          htmlFor="email"
          className="text-[12px] uppercase tracking-[0.18em]"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          E-Mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="du@uni.de"
          className="rounded-2xl px-4 py-3 text-[15px] text-white outline-none transition focus:border-white/40"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.16)",
          }}
        />
        <TurnstileWidget
          onVerify={setTurnstileToken}
          onError={() => setTurnstileToken("")}
        />
        <PendingButton
          idle={register ? "Kostenlos registrieren" : "Code & Link per Mail"}
          pending="Wird gesendet…"
        />
      </form>
```

with:

```tsx
      {!showEmail ? (
        <button
          type="button"
          aria-expanded={false}
          onClick={() => {
            setShowEmail(true);
            // Focus the field after it mounts.
            setTimeout(() => emailInputRef.current?.focus(), 0);
          }}
          className="mt-6 w-full text-center text-[13px] transition hover:text-white"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          {register ? "oder mit E-Mail registrieren" : "oder mit E-Mail anmelden"}
        </button>
      ) : (
        <form
          id="email-login-form"
          action={reqAction}
          noValidate
          className="mt-6 flex flex-col gap-3"
        >
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="turnstileToken" value={turnstileToken} />
          <label
            htmlFor="email"
            className="text-[12px] uppercase tracking-[0.18em]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            E-Mail
          </label>
          <input
            ref={emailInputRef}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="du@uni.de"
            className="rounded-2xl px-4 py-3 text-[15px] text-white outline-none transition focus:border-white/40"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.16)",
            }}
          />
          <TurnstileWidget
            onVerify={setTurnstileToken}
            onError={() => setTurnstileToken("")}
          />
          <PendingButton
            idle={register ? "Kostenlos registrieren" : "Code & Link per Mail"}
            pending="Wird gesendet…"
          />
        </form>
      )}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0 (no errors).

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build completes (exit 0).

- [ ] **Step 6: Verify on the preview**

Start/refresh the dev server, load `/login`:
- Default: the Google button is visible; **no** email field, **no** Turnstile iframe in the DOM; an "oder mit E-Mail anmelden" link is visible. (Check via snapshot: the page has the toggle text, not an `id="email"` input.)
- Click the toggle → the email field + Turnstile + send button appear; focus is in the email field.
- Load `/login?mode=register` → toggle reads "oder mit E-Mail registrieren"; expanded send button reads "Kostenlos registrieren".

- [ ] **Step 7: Commit**

```bash
git add src/app/login/login-form.tsx
git commit -m "feat(login): collapse email behind a toggle so Google is the default"
```

---

### Task 2: Push + PR

**Files:** none (git/CI only).

- [ ] **Step 1: Run the full test suite (no regressions)**

Run: `npm test`
Expected: all pass (the existing 162; this change adds none).

- [ ] **Step 2: Push + open PR**

```bash
git push -u origin google-login-primary
gh pr create --base main --head google-login-primary \
  --title "Google-login primary: collapse email behind a toggle" \
  --body "Implements docs/superpowers/specs/2026-06-22-google-login-primary-design.md. Presentation-only: Google stays the top primary; the email magic-link form is hidden behind an 'oder mit E-Mail …' toggle (Turnstile only mounts on expand). Auth logic unchanged."
```

- [ ] **Step 3: Hand off**

Report the PR; merge to `main` stays the user's decision (no migration / env needed for this one).

---

## Self-Review

**Spec coverage:**
- Google stays top primary (both modes) → unchanged markup; Task 1 only touches the divider+email block. ✓
- Email hidden by default behind a secondary toggle → Task 1 Step 3 (`!showEmail` branch). ✓
- Toggle copy differs by mode → Task 1 Step 3 (`register ? … : …`). ✓
- Reveal + focus to email field → Task 1 Step 3 (`onClick` setShowEmail + `emailInputRef.current?.focus()`). ✓
- Turnstile only mounts on expand → it's inside the `showEmail` branch. ✓
- a11y `aria-expanded` → Task 1 Step 3 (`aria-expanded={false}` on the collapsed toggle). ✓
- Presentation-only, no logic/backend change → Task 1 only edits markup + adds local state/ref. ✓
- Acceptance criteria 1–5 → Task 1 Steps 4–6 + Task 2 Step 1. ✓

**Placeholder scan:** No TBD/TODO; both the removed block and the replacement are shown verbatim. The "~288–297" line range is paired with the exact verbatim block to replace.

**Type consistency:** `emailInputRef` is `useRef<HTMLInputElement>(null)` and attached via `ref={emailInputRef}` to an `<input>`; `.current?.focus()` is valid on `HTMLInputElement`. `showEmail`/`setShowEmail` are a `useState<boolean>`; `aria-expanded={false}` is valid. `register` is the existing prop. No new cross-task interfaces.
