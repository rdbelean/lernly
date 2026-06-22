# Design: Google-Login primary (demote email)

- **Date:** 2026-06-22
- **Status:** Approved (design), pending spec review
- **Scope:** Second of the conversion sub-projects (after anon-trial/TikTok-gate). Paywall rework and onboarding-one-screen remain separate specs.

## Problem

On `/login` the Google button is already the top, full-width primary, but the
email magic-link form (email field + Turnstile + send button) sits right below
an "oder" divider as a visually co-equal section. For the persona (overwhelmed,
mobile, impatient) two equal-weight choices add friction, and the email round-
trip (check inbox → find rotating code → switch back → type) is the highest-
friction consumer auth path. Google OAuth is configured and verified working in
production, so it should be the unambiguous default.

## Decision

Collapse the email form behind a secondary toggle so Google is the single
obvious action, with email one tap away.

## Design

- **Google stays the top, full-width white primary button** (unchanged markup),
  for both `login` and `register` modes (OAuth creates the account too).
- **The email magic-link form is hidden by default**, behind a dezent secondary
  toggle link: **"oder mit E-Mail anmelden"** (login) / **"oder mit E-Mail
  registrieren"** (register). Clicking it expands the existing email field +
  Turnstile + send button and moves focus to the email field.
- The existing "oder" divider is replaced by / folded into the toggle (no
  divider when collapsed; the toggle is the separator).
- **Turnstile renders only when the email form is expanded** — a nice initial-
  load win for the Google majority (the Turnstile iframe is otherwise mounted
  on every page load).
- **Accessibility:** the toggle is a real `<button type="button" aria-expanded>`
  controlling the form region (`aria-controls`); on expand, focus moves to the
  email input.

## Out of scope (unchanged)

- `loginWithGoogle` server action, the magic-link request/verify server actions,
  `/auth/callback`, `/auth/confirm`, and all auth logic — byte-identical.
- Backend, DB, env. This is a presentation-only change in
  `src/app/login/login-form.tsx`.
- The "Neu hier? / Kostenlos registrieren" footer link and the
  Datenschutz line stay as-is.

## Acceptance criteria

1. Default view (login mode, fresh load): the Google button is visible; the
   email field, Turnstile, and send button are **not** rendered; a secondary
   "oder mit E-Mail anmelden" toggle is visible.
2. Clicking the toggle reveals the email field + Turnstile + send button; focus
   lands in the email field; `aria-expanded` flips to `true`.
3. Register mode (`?mode=register`): same behaviour; toggle copy reads
   "oder mit E-Mail registrieren"; the send button still reads "Kostenlos
   registrieren" when expanded.
4. Google sign-in and the email magic-link flow both still work end-to-end
   (logic untouched).
5. `tsc` clean, existing tests green, `next build` clean.

## Testing

Presentation-only → verify on the preview: default = Google + toggle (no email
field / no Turnstile iframe in the DOM); expand → email + Turnstile appear,
focus in field; toggle copy differs by mode; a Google sign-in still redirects to
Google.
