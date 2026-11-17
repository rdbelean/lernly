# STATUS (Übergabe Antigravity ↔ Claude Code ↔ OpenAI Codex)

Stand: 2026-11-17. Kompakt halten, nur Fakten. **Pflicht:** Zum Session-Start immer `STATUS.md` + `ROADMAP.md` lesen; nach Abschluss beides aktualisieren (Ordnerstruktur: `ARCHITECTURE.md`).

## Aktiver Branch
`feat/bwl-mcp-unification` — einziger aktiver Feature-Branch für Antigravity, Claude Code und OpenAI Codex; kein Wechsel ohne Absprache. Nie direkt auf `main`.

## Aktuelles Ziel / Stand
**Git aufgeräumt, Branch gepusht & Solo-Founder-Doku (`ROADMAP.md`, `ARCHITECTURE.md`) angelegt (2026-11-17):**
- `feat/bwl-mcp-unification` zu `origin` gepusht.
- Branch-Friedhof bereinigt: 49 veraltete lokale Branches, der verwaiste Worktree `philadelphia`, 27 bereits entfernte Remote-Tracking-Refs und 46 obsolete Remote-Branches auf `origin` gelöscht. Nur `main` und `feat/bwl-mcp-unification` existieren lokal und remote.

## Erledigt (diese Session)
- **Branch-Unification & Cleanup:** `feat/bwl-mcp-unification` ab `main` erstellt, MCP-Connector (`connector/`), `plugin/`, Doku und Light-Redesign/BWL-Landingpage zusammengeführt und nach GitHub gepusht. Alle 49 lokalen / 46 aktiven Remote-Altbranches gelöscht.
- **Kosten- & Sicherheitslecks geschlossen:** Minütlichen `/api/cram/worker`-Cron entfernt; `exam-reminders` & `metrics-sync` fail-closed; `repractice` & `attachPastExamsToExam` mit Rate-Limit, Quota, Concurrency-Slot und Storage-Cleanup gesichert.
- **Dead-Code & UI-Kontrast/Lint:** ~6.670 Zeilen toten Altcode entfernt; Kontrastbugs & alle ESLint-Errors/-Warnings in `src/`, `scripts/` und `eslint.config.mjs` gefixt (`tsc`, `npm test` 212/212, `check:colors --strict`, `npm run lint`, Connector-Tests 8/8 grün).
- **Projektsteuerung:** `ROADMAP.md` (4 Bereiche mit Checkboxes) und `ARCHITECTURE.md` (29 Zeilen) im Root erstellt; Handoff-Regeln in `CLAUDE.md`, `AGENTS.md` und `STATUS.md` verankert.

## Nächster konkreter Schritt
1. **Echter Corporate-Finance-Kurstest:** `connector/desktop/dist/lernly-beta-0.2.0.mcpb` in Claude Desktop testen, CF-Kursordner (20 Originaldateien) einrichten/bauen und Output gegen das CF Study OS prüfen (`docs/strategy/2026-11-14-cf-realtest-status.md`).
2. **Landingpage-Copy-Feinschliff:** Texte durch Daniel in `src/components/landing/LernlyLanding.tsx` und `src/app/page.tsx` prüfen/anpassen.
3. **Brücke in die Web-App:** Import-/MCP-Sync (`kurs.json` + `themen/*.json`) ins Dashboard bauen.

## Bekannte Grenzen & Hinweise
- `connector/desktop/`: lokal macOS (kein Remote-Connector/OAuth), keine OCR, PDF max. 256 MB / 2.500 Seiten, kein direkter Anki-/Quizlet-Sync (nur TSV-Export).
- `.env.local` lokal enthält noch alte Stripe-v2-Price-Variablennamen (`STRIPE_PRICE_PRO_MONTHLY` etc.) statt `STRIPE_PRICE_SEMESTER`/`MONTHLY`/`EINZELKLAUSUR`.
- Eingeloggte Web-App-Screens wurden auf Vercel-Preview noch nicht im Browser gegengetestet; vor Merge nach `main` Daniel fragen.
