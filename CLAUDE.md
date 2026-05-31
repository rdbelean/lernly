# Lernly — Claude Code Project Guide

Pre-revenue MVP **with live users**. Read this every session and follow the Working Rules. Web app: Next.js (App Router) + Tailwind, Supabase (auth / DB / storage), Vercel (hosting + cron), Resend (email), Anthropic API (generation). System prompts in `src/lib/prompts.ts`, schemas in `src/lib/schema.ts`.

---

## ⚙️ WORKING RULES — obey every session

### Release workflow
- **NEVER commit or push directly to `main`.** `main` = production (lernly-app.de), real users see it instantly.
- Always: branch → commit → push → I test the Vercel **preview URL** before it goes live.
- **ASK me before merging to `main` / promoting to production.**
- Keep commits small (easy rollback).

### Database & migrations (Supabase)
- **Migration filenames: ALWAYS 14-digit timestamp** (`YYYYMMDDhhmmss_<name>.sql`, e.g. `20260601094530_add_foo.sql`). 8-digit date prefixes collide on `supabase_migrations.schema_migrations.version` (PK) when multiple land the same day → `supabase db push` fails. Leave old 8-digit files as-is (already applied); only new ones 14-digit.
- Applying via CLI: use `supabase db query --linked --file <path>` for a single migration — `supabase db push` is brittle in this repo due to the versioning legacy.
- **Additive migrations only by default** (add columns/tables = safe). **ASK before renaming/deleting columns** or any destructive/breaking change; explain the risk. Migrations must stay backward-compatible with the running version.
- **⚠️ The database is SHARED between preview and production — branches/preview do NOT isolate it.** A migration hits prod the moment it's applied, even before the PR is merged. Therefore:
  - **NEVER apply a migration that the currently-deployed production code can't handle.** It must be backward-compatible with what's live on `main` right now.
  - **DROP / RENAME / destructive changes go in a SEPARATE follow-up migration**, applied only AFTER the new code is live and verified — never in the same migration as the code change. Pattern: add new → deploy code that uses it → later, separate migration removes the old.
  - **ALWAYS ask me before any `DROP` / `ALTER ... DROP` / rename**, and before applying any migration to prod. State the risk first.

### Environment variables (Vercel)
- **Every new env var MUST be set in ALL scopes** (Production + Preview + Development), not just Production. Production-only vars break preview deployments (this has bitten us 3×: Supabase, Resend, Turnstile). `NEXT_PUBLIC_*` vars are baked at build time → a redeploy is needed after adding them.
- When you add or require a new env var, tell me explicitly to set it in all scopes.

### ASK me first before:
merging to main · destructive DB changes · adding new dependencies/libraries · large refactors · anything touching auth, billing/Stripe, or legal pages.

### How to work
- **Diagnose before fixing** — find and report the real root cause first (logs / local repro), then fix. No guess-and-patch.
- **Smallest change that ships.** No refactors/abstractions I didn't ask for.
- **Mobile-first** — must work at 380px. Test desktop + mobile.
- After a change: confirm it builds, say exactly how to test it, and what I must provide (env vars, keys).
- **Don't drift from approved designs** — match agreed specs/mockups exactly.
- **No fake features** (e.g. a toggle that saves a preference but nothing acts on it) — wire it fully or tell me what's missing. Don't claim something works without a real test.

### Language
- User-facing **content** follows the uploaded material's language (English material → English flashcards/quiz/overview/cards). Detect deterministically; apply to every content task.
- **App chrome** (tab labels, buttons, badges, countdowns) stays **German**.
- Code + comments: **English**.
- **Never fabricate legal text** — placeholders for lawyer review only.

---

## 🎨 DESIGN SYSTEM (current in-app / dashboard)
- Backgrounds: page `#0F1322`, sidebar `#0C0F1C`, surfaces `#141930` / `#171C30`, border `rgba(255,255,255,.06)`. Text `#EAEDF7`, dim `#9098B6`.
- **Primary CTA: deep indigo `#2B3499`** (white text). Pure white only for text — NEVER a large fill. No near-black surfaces on the blue.
- Fonts: **Sora** (headings), **Inter** (body).
- Icons: **lucide-react only**, in tinted rounded containers. **NO emojis anywhere.**
- **Color = meaning**, applied identically everywhere (priority / relevance / highlight / callout). Never a per-element rainbow; default to neutral surfaces.
- Radius 12–16px, calm spacing.

`» Bestätigen: Dieses Design-System gilt für die App (Dashboard, Pack-Views, Settings). Die Marketing-Landingpage (lernly-app.de Startseite) nutzte zuletzt das alte Indigo-Gradient/Glassmorphism-Design — entscheiden, ob die angeglichen wird oder bewusst anders bleibt.`

---

## 📦 What Lernly is
AI study-pack generator: student uploads course material (PDFs/slides), gets an interactive study pack in <2 min. Components: interactive **Karteikarten** (flip, 3-stage rating, shuffle, filter), **Übungsklausur** (scenario MC with per-option explanations + scoring), **Visual Map** (the big-picture overview), **Übersicht** (concepts ranked by exam relevance), **Essay-Blueprint** (locked / "bald verfügbar"). Plus a scoped **KI-Hilfe** tutor and **Klausur-Erinnerungen**.

## 👤 Persona & the 7 pain points
**"Der überforderte Student"** — 19–27, DACH + Austauschstudenten, prokrastiniert bis kurz vor der Prüfung, oft ADHS, visueller Lerner, mobile-first, Budget 5–15€/mo, hat ChatGPT probiert (Textwände, nutzlos).
1. Weiß nicht, wo anfangen (größter Pain). 2. Lernt passiv, nichts bleibt hängen. 3. ChatGPT = Textwand. 4. Karteikarten schreiben dauert ewig. 5. Weiß nicht, was prüfungsrelevant ist. 6. Weiß nicht, wie Essay strukturieren. 7. Austauschstudent — alles doppelt schwer.

## ✅ Current state (Stand: diese Session — bei Bedarf aktualisieren)
Gebaut & live: Dashboard + Bibliothek, Supabase Auth, **Klausuren-Entity** (exams) mit Datum/Countdown, **Exam-Relevance-Lens** (Altklausur-Upload → Profil → Gewichtung; verifiziert echt-aber-Tiefe via Step-3-Fixes), **MC-Quiz** mit guten Distraktoren, **KI-Hilfe-Tutor** (Haiku, `tutor_usage`-Limits), **Klausur-Erinnerungen** (Resend + Vercel-Cron), **Settings** (BYOK, Abrechnung, Konto löschen/Export), **Rechtsseiten** (Impressum/Datenschutz/AGB/Widerruf — Texte vom Anwalt zu finalisieren), **Storage-Upload** (direkt zu Supabase, 50 MB), **Hintergrund-Job-Generierung**, neues Design-System, Format-Picker (MC / Offene Fragen / Essay gesperrt).
`» Veraltet aus alter CLAUDE.md entfernt: "alles in page.tsx 2000 Zeilen", "Supabase nicht verdrahtet", "Auth/Dashboard fehlt" — stimmt nicht mehr.`

## 💶 Pricing
`» Bestätigen / aktuell halten:` in der App zuletzt sichtbar: Gratis · **Cram (Alles reinwerfen) €6,99** · **Pro €14,99/mo** · **Team €24,99/mo**. BYOK (eigener Anthropic-Key) als Rabatt-/Unlimited-Modifier, kein eigener Tier. (Die alten Zahlen Pro 6,99/Team 14,99 in der vorherigen CLAUDE.md waren veraltet.)

## 🔭 Roadmap (kurz, aktuell halten)
- Distribution: TikTok/IG (Hooks + Skripte fertig) — der eigentliche nächste Hebel.
- Offen/optional: Essay-Format scharfschalten (`ESSAY_ENABLED`), Two-Stage-Lens falls nötig, Quiz-Breakdown + adaptive Fragen, Übersicht→Mindmap-Konsolidierung, Stripe vollständig verdrahten, Reminder-Email-Versand live testen.

---

`» Hinweis: Diese Datei wurde aus der alten CLAUDE.md gemerged und um die in der Session etablierten Regeln + aktuellen Stand ergänzt. Marketing-/Strategie-Dokumente (Agent-Prompts, Audit, etc.) gehören NICHT in die CLAUDE.md — die hier ist nur für Claude-Code-Verhalten + aktuellen Projektkontext.`