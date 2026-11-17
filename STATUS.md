# STATUS (Übergabe Antigravity ↔ Claude Code ↔ OpenAI Codex)

Stand: 2026-11-17. Kompakt halten, nur Fakten.

## Aktiver Branch
`feat/bwl-mcp-unification` — einziger aktiver Feature-Branch für Antigravity, Claude Code und OpenAI Codex; kein Wechsel ohne Absprache. Nie direkt auf `main`.

## Aktuelles Ziel / Stand
**Branch-Spaltung aufgelöst, Lecks geschlossen & Codebase aufgeräumt (2026-11-17):**
- `main` (PRs #35–#40: Light-Redesign, BWL-Landing `LernlyLanding.tsx`, `HeroScene.tsx`, `ExamMap`) und `codex/lernly-mcp-beta` (`connector/desktop/`, `plugin/lernly/`, `STATUS.md`, `docs/strategy/2026-11-14-cf-realtest-status.md`, Handoff-Regeln) auf `feat/bwl-mcp-unification` zusammengeführt.
- Remote-Branches vorerst belassen (Aufräumen nach Rückfrage mit Daniel).

## Erledigt (diese Session)
- **Branch-Unification & Doku:** `feat/bwl-mcp-unification` ab `main` erstellt; ungetrackte Build-Reste entfernt; `connector/`, `plugin/`, `STATUS.md`, `CLAUDE.md`, `AGENTS.md` integriert. `CLAUDE.md` (Handoff + aktuelles Light-Design-System) und `AGENTS.md` (alle drei Agenten) aktualisiert.
- **Kosten- & Sicherheitslecks geschlossen:**
  - `vercel.json`: minütlichen `/api/cram/worker`-Cron entfernt (`CRAM_ENABLED = false`).
  - `src/app/api/cron/exam-reminders/route.ts` & `src/app/api/cron/metrics-sync/route.ts`: `authorize()` strikt fail-closed (`if (!secret) return false;`).
  - `src/app/api/quiz/repractice/route.ts`: Rate-Limit (`check_rate_limit`, 6/h), Quota-Gate (`check_card_gen_quota` + `bump_card_gen_usage`) und Concurrency-Slot (`acquire_generation_slot`/`release_generation_slot`) ergänzt.
  - `src/app/dashboard/actions.ts` (`attachPastExamsToExam`): Rate-Limit (`check_rate_limit`, 5/h), `check_card_gen_quota`, Concurrency-Slot sowie Cleanup hochgeladener Dateien in `STUDY_UPLOADS_BUCKET` per `finally` ergänzt.
- **Dead-Code-Großputz:** `src/app/landing-client.tsx`, `src/components/landing/DemoPacksSection.tsx`, `FeatureBento.tsx`, `src/components/landing/mockups/*` (12 Dateien) gelöscht; `scripts/check-colors.ts` & `scripts/migrate-colors.ts` bereinigt; `src/app/globals.css` von ~1.800 Zeilen toter Dark-Landing-Styles befreit und `.mode-row:hover` sowie `--color-ln-*` auf das helle Token-System umgestellt.
- **UI-Kontrast- & Lint-Fixes:** `text-white`-Bugs (`dashboard/new/page.tsx`, `delete-button.tsx`, `ExamCard.tsx`) und kontrastarme `--color-ln-cyan`/`--color-ln-violet`-Textfarben in Pack-Views (`FlashcardDeck`, `ExamSimulator`, `OpenQuestionsView`, `EssayPredictionsView`, `QuizView`, `TutorChat`, `GenerationProgress`) und Rechtsseiten (`impressum`, `agb`, `datenschutz`) gefixt. React-Render-Bug in `SectionHeader.tsx` (`createElement`), Hook-Order in `QuizView.tsx`, ESLint-Errors/-Warnings in `src/` und `scripts/eval-pack.ts` sowie `eslint.config.mjs` (Ignore für Connector-/Plugin-Build-Artefakte) behoben.
- **Verifiziert:** `npx tsc --noEmit` (0 Fehler), `npm test` (212/212), `npm run check:colors -- --strict` (`TOTAL 0 literals in 0 files`), `npm run lint` (0 Errors/Warnings), `node connector/desktop/scripts/build.mjs && node --test connector/desktop/tests/*.test.mjs` (8/8).

## Nächster konkreter Schritt
1. Echten Corporate-Finance-Kurstest mit `connector/desktop/` (`dist/lernly-beta-0.2.0.mcpb`) in Claude Desktop abschließen und gegen das CF Study OS prüfen.
2. Danach schlanken Import-/MCP-Weg (`kurs.json` + `themen/*.json`) in die Web-App (`/dashboard`) bauen.

## Bekannte Grenzen & Hinweise
- `connector/desktop/`: lokal macOS (kein Remote-Connector/OAuth), keine OCR, PDF max. 256 MB / 2.500 Seiten, kein direkter Anki-/Quizlet-Sync (nur TSV-Export).
- `.env.local` lokal enthält noch alte Stripe-v2-Price-Variablennamen (`STRIPE_PRICE_PRO_MONTHLY` etc.) statt `STRIPE_PRICE_SEMESTER`/`MONTHLY`/`EINZELKLAUSUR`.
- Eingeloggte Web-App-Screens wurden auf Vercel-Preview noch nicht im Browser gegengetestet; vor Merge nach `main` Daniel fragen.
