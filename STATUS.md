# STATUS (Übergabe Antigravity ↔ Claude Code ↔ OpenAI Codex)

> 📌 Tägliche Handgriffe (dev, Commit/Push, Pull, PR & Vercel, Notfall-Reset): **[WORKFLOW.md](WORKFLOW.md)**

Stand: 2026-11-20. Kompakt halten, nur Fakten. **Pflicht:** Zum Session-Start immer `STATUS.md` + `ROADMAP.md` lesen; nach Abschluss beides aktualisieren (Ordnerstruktur: `ARCHITECTURE.md`).

## Aktiver Branch
`feat/bwl-mcp-unification` — gemeinsamer Arbeitsbranch für Antigravity, Claude Code und OpenAI Codex. **Auto-Live-Regel:** Nach grünen Checks (`npx tsc --noEmit`, `npm run lint`, `npm test`) immer direkt in `main` mergen und `origin/main` + `feat/bwl-mcp-unification` pushen (Vercel deployt automatisch auf `lernly-app.de`).

## Aktuelles Ziel / Stand
**Auto-Live-Workflow aktiv & erster `lernly.kurs/1` Klausur-Trainer live auf `/dashboard` (2026-11-20):**
- `CLAUDE.md`, `AGENTS.md` und `WORKFLOW.md` auf den direkten Auto-Live-Workflow umgestellt (Feature-Branch → grüne Checks → Merge in `main` → Push `origin/main`).
- `/login`: Admin-Only Passwort-Login (`signInWithPassword` + `ADMIN_PASSWORD`-Bootstrap, strikt über `ADMIN_EMAILS`), lokaler „Schnell-Login (Dev)“ nur auf `localhost`; öffentliche Registrierung komplett gesperrt.
- `/dashboard` & `/dashboard/trainer`: `TrainerView` ist jetzt die direkte Hauptansicht nach dem Login — mit Corporate-Finance-Beispielkurs, `_lernly/`-Ordner-/JSON-/HTML-Importer, Verstehen (SVG + KaTeX), Rechen-Drills (Zahlenvarianten + Toleranzprüfung), Punkte-Checklisten und Karteikarten.

## Erledigt (diese Session)
- **Workflow & Livegang (`CLAUDE.md`, `AGENTS.md`, `WORKFLOW.md`):** Auto-Live-Workflow auf `main` verankert und kompletten Branch `feat/bwl-mcp-unification` in `main` gemerged & gepusht.
- **Admin-Only Auth (`src/app/login/*`, `src/app/auth/*`, `src/lib/admin/auth.ts`):** Passwort-Login, Allowlist (`ADMIN_EMAILS`), OAuth-/Confirm-Sperre & Landingpage-„Anmelden“-Link.
- **Klausur-Trainer (`src/app/dashboard/page.tsx`, `src/app/dashboard/trainer/page.tsx`, `src/components/trainer/*`, `src/lib/trainer/*`):** `lernly.kurs/1` Importer/Viewer direkt auf `/dashboard` integriert.

## Nächster konkreter Schritt
1. **Vercel Env-Vars setzen & auf `lernly-app.de` einloggen:** `ADMIN_EMAILS` und `ADMIN_PASSWORD` in Vercel eintragen (Production + Preview + Development) und direkt auf `https://lernly-app.de/login` einloggen → `/dashboard` mit Corporate-Finance-Demo & eigenem `_lernly/`-Ordner testen.
2. **Phase 6:** Supabase-Speicherung für Kurse/Fortschritt (Migration erst nach expliziter Freigabe).
3. **Phase 7:** Neue Landingpage aus den echten App-Komponenten bauen.

## Bekannte Grenzen & Hinweise
- Preview & Prod teilen sich eine Supabase-DB — keine Migrationen ohne explizite Freigabe.
- `POST /api/study/extract` verlangt Login + Quota (fail-closed); der `_lernly/`-Import auf `/dashboard` (und `/upload`) läuft 100 % lokal ohne KI-Kosten.
- `.env.local` lokal enthält noch alte Stripe-v2-Price-Variablennamen (`STRIPE_PRICE_PRO_MONTHLY` etc.).
