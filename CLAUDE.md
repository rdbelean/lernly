# Lernly — Claude Code Project Guide

Pre-revenue MVP **with live users**. Read this every session and follow the Working Rules. Web app: Next.js (App Router) + Tailwind, Supabase (auth / DB / storage), Vercel (hosting + cron), Resend (email), **Stripe (Billing, live)**, PostHog (Analytics) + Sentry (Errors), Anthropic API (generation). System prompts in `src/lib/prompts.ts`, schemas in `src/lib/schema.ts`.

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
- **Markt-Fokus: DACH / Deutsch zuerst.** Marketing + Landing + UI sind Deutsch; die englische Landing-/UI-Variante ist aktuell **nicht priorisiert** — DE ist die Source of Truth, keine Zeit auf EN-Landing-Parität verschwenden (bestehende `isEn`-Strings dürfen „dormant" im Code bleiben). **Generierter Content** bleibt aber mehrsprachig (EN-Material → EN-Karten/Quiz/Übersicht).
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

**Landing (lernly-app.de Startseite):** nutzt bewusst ein eigenes **Glassmorphism-Design** (`.ln-glass-card`, Indigo-Gradient, Cyan/Teal-Akzent `rgb(91,184,216)`) — abweichend vom flachen App-Dashboard oben, aber mit denselben Fonts + Indigo-CTA. Alle Sektionen leben inline in `src/app/landing-client.tsx` (Reihenfolge: Hero → DemoPacks → HowItWorks → Showcase → BentoFeatures → ComparisonSection [Altklausur] → **ToolStackSection** [Value-Stack „Ein Tool statt fünf"] → Pricing → FAQ → BottomCta); Section-Heading über `src/components/landing/SectionHeading.tsx`. Bewusst (noch) nicht ans App-Design angeglichen.

---

## 📦 What Lernly is
AI study-pack generator: student uploads course material (PDFs/slides), gets an interactive study pack in <2 min. Components: interactive **Karteikarten** (flip, 3-stage rating, shuffle, filter) mit **Spaced-Repetition-Loop** (SM-2-lite: Fällig-Queue über alle Pakete unter `/dashboard/review`, Mastery-% pro Paket, Streak), **Übungsklausur** (scenario MC with per-option explanations + scoring), **Offene Fragen**, **Visual Map** (the big-picture overview), **Übersicht** (concepts ranked by exam relevance), **Aufsatz-Plan** + **Essay-Blueprint** (beide an das noch gesperrte Essay-Format gekoppelt, `ESSAY_ENABLED=false` / "bald verfügbar"). Plus a scoped **KI-Hilfe** tutor, **Klausur-Erinnerungen** und **Cram** ("Alles reinwerfen": Bulk-Upload → Hintergrund-Jobs → mehrere Pakete).

## 👤 Persona & the 7 pain points
**"Der überforderte Student"** — 19–27, DACH + Austauschstudenten, prokrastiniert bis kurz vor der Prüfung, oft ADHS, visueller Lerner, mobile-first, Budget 5–15€/mo, hat ChatGPT probiert (Textwände, nutzlos).
1. Weiß nicht, wo anfangen (größter Pain). 2. Lernt passiv, nichts bleibt hängen. 3. ChatGPT = Textwand. 4. Karteikarten schreiben dauert ewig. 5. Weiß nicht, was prüfungsrelevant ist. 6. Weiß nicht, wie Essay strukturieren. 7. Austauschstudent — alles doppelt schwer.

## ✅ Current state (Stand: diese Session — bei Bedarf aktualisieren)
Gebaut & live: Dashboard + Bibliothek (nach Klausuren gruppiert, `last_opened_at`/„Weiterlernen"), Supabase Auth (Magic-Link), **Klausuren-Entity** (exams) mit Datum/Countdown, **Exam-Relevance-Lens** (Altklausur-Upload → `exam_references` + `exam_profile` JSONB → Gewichtung/`relevanceTag`; Fidelity strict/likely/broad), **MC-Quiz** (gute Distraktoren + Re-Practice) und **Offene Fragen**, **Visual Map** + **Übersicht**, **Spaced Repetition** (SM-2-lite: `card_reviews`, Fällig-Queue `/dashboard/review`, Mastery-%, Streak — neu 2026-06-08), **KI-Hilfe-Tutor** (Haiku, `tutor_usage`-Limits), **Cram / Bulk-Upload** (`cram_jobs` → `/api/cram/worker` Hintergrund-Generierung; `generation_slots` als globaler Anthropic-Concurrency-Gate), **Klausur-Erinnerungen** (Resend + Vercel-Cron, 7/3/1-Tage-Fenster), **Stripe vollständig verdrahtet** (Checkout + Webhook + Customer-Portal; `check_pack_quota()`), **Onboarding-Walkthrough** (`has_seen_welcome`) + Activation-Funnel-Analytics (PostHog) + **anonymer Trial** (Landing ohne Login, Turnstile + IP-Quota), **Admin-/Ops-Dashboard** (`/admin`, Founder-only), **Settings** (Abrechnung/Portal, BYOK pausiert, Reminder-Toggle, Konto löschen/Export), **Rechtsseiten** (Impressum/Datenschutz/AGB/Widerruf — Texte vom Anwalt zu finalisieren), **Storage-Upload** (Supabase, 50 MB), neues App-Design-System, Format-Picker (MC / Offene Fragen / Essay gesperrt via `ESSAY_ENABLED`), **Value-Stack-Section** auf der Landing.
`» Veraltet aus alter CLAUDE.md entfernt: "alles in page.tsx 2000 Zeilen", "Supabase nicht verdrahtet", "Auth/Dashboard fehlt" — stimmt nicht mehr.`

## 💶 Pricing
Aktuell live (**Pricing v3**, Stand 2026-06, Quelle: `PRICING_TIERS_DE` in `landing-client.tsx` + `check_pack_quota()`):
- **Gratis** €0 — 2 Pakete/Monat, volle Qualität (nichts gesperrt).
- **Einzelklausur €4,99 einmalig** — 5 Pakete in 14 Tagen, kein Abo, Cram inkl.
- **Monatlich €8,99/Monat** — 50 Pakete, monatlich kündbar, Cram inkl.
- **Semester €29,99/6 Monate** — 60 Pakete/Monat, „BESTE WAHL" (hervorgehoben).

**Gründerpreise** gelten solange < 1.000 zahlende Studis (`FOUNDER_PRICING_LIMIT`) — Preis bleibt für Early-Adopter gelockt. **Cram** ("Alles reinwerfen") ist ein **Feature** in allen Paid-Plänen, **kein eigener Tier**. **BYOK** (eigener Anthropic-Key) aktuell **pausiert** („bald verfügbar"); geplant als Rabatt-/Unlimited-Modifier, kein eigener Tier. Abgelaufene Pläne (`plan_expires_at < now`) fallen auf Free zurück.
`» Veraltet: die alten CLAUDE.md-Zahlen „Cram 6,99 / Pro 14,99 / Team 24,99" stimmen NICHT — Pro/Team/Cram-als-Tier gibt es nicht mehr.`

## 🔭 Roadmap (kurz, aktuell halten)
- Distribution: TikTok/IG (Hooks + Skripte fertig) — der eigentliche nächste Hebel.
- Offen/optional: Essay-Format scharfschalten (`ESSAY_ENABLED` → Aufsatz-Plan + Essay-Blueprint), Two-Stage-Lens falls nötig, Quiz-Breakdown + adaptive Fragen, Übersicht→Mindmap-Konsolidierung, Reminder-Email-Versand live verifizieren, **SRS-V2** (Push „X Karten fällig" über die Klausur-Erinnerung), BYOK wieder scharfschalten.
- Erledigt (raus aus Roadmap): Stripe verdrahtet (Checkout/Webhook/Portal live — offen höchstens Refund/Dunning-Feinschliff), Spaced-Repetition-Loop live.

---

`» Hinweis: Diese Datei wurde aus der alten CLAUDE.md gemerged und um die in der Session etablierten Regeln + aktuellen Stand ergänzt. Marketing-/Strategie-Dokumente (Agent-Prompts, Audit, etc.) gehören NICHT in die CLAUDE.md — die hier ist nur für Claude-Code-Verhalten + aktuellen Projektkontext.`