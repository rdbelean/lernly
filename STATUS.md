# STATUS (Übergabe Antigravity ↔ Claude Code ↔ OpenAI Codex)

> 📌 Tägliche Handgriffe (dev, Commit/Push, Pull, PR & Vercel, Notfall-Reset): **[WORKFLOW.md](WORKFLOW.md)**

Stand: 2026-11-20. Kompakt halten, nur Fakten. **Pflicht:** Zum Session-Start immer `STATUS.md` + `ROADMAP.md` lesen; nach Abschluss beides aktualisieren (Ordnerstruktur: `ARCHITECTURE.md`).

## Aktiver Branch
`feat/bwl-mcp-unification` — gemeinsamer Arbeitsbranch für Antigravity, Claude Code und OpenAI Codex. **Auto-Live-Regel:** Nach grünen Checks (`npx tsc --noEmit`, `npm run lint`, `npm test`) immer direkt in `main` mergen und `origin/main` + `feat/bwl-mcp-unification` pushen (Vercel deployt automatisch auf `lernly-app.de`).

## Aktuelles Ziel / Stand
**`Lernly-Trainer.html` / CF-6-Themen-Importer gefixt, Repo-Root aufgeräumt & live auf `main` (2026-11-20):**
- **Repo-Root bereinigt:** Doppelten Plugin-Ordner `lernly-0.1.0/` aus dem Root entfernt (alles in `plugin/lernly/` enthalten); `Lernly-Trainer.html` als echtes Referenz-Beispiel nach `sample-data/corporate-finance-trainer.html` verschoben und mit allen **6 Corporate-Finance-Themen** (`dcf`, `mm`, `emh`, `agency`, `ethics`, `ratings`) vervollständigt.
- **Vollständiger HTML- & Ordner-Importer (`src/lib/trainer/importer.ts`, `src/lib/trainer/demoCourse.ts`):** `Lernly-Trainer.html` (`#lernly-data`), `_lernly/`-Ordner (inkl. `probeklausuren/*.json` & `spickzettel.json`) sowie ältere unvollständige CF-Bundles laden jetzt alle 6 CF-Themen vollständig; `assets/trainer.html` wird ignoriert und ein versehentlicher Upload von `lernly-0.1.0/` liefert eine klare Fehlermeldung.
- **Supabase Live-Stand:** Der gespeicherte Kurs `Corporate Finance & Valuation` (`7cb4ce2c-7bf6-430a-a4ed-ae5fbd3d1937`) von `beleanrd@gmail.com` ist in Supabase direkt mit allen 6 Themen (17 Aufgaben, 18 Karten) aktualisiert.

## Erledigt (diese Session)
- **Repo-Cleanup & Referenz-Fixture:** `lernly-0.1.0/` gelöscht, `Lernly-Trainer.html` → `sample-data/corporate-finance-trainer.html` (6/6 CF-Themen).
- **Importer-Fix & CF-Vollthemen (`src/lib/trainer/demoCourse.ts`, `src/lib/trainer/importer.ts`, `src/lib/trainer/importer.test.ts`):** `CORPORATE_FINANCE_TOPICS` (alle 6 CF-Themen), Backfill- & Mock/Spickzettel-Extraktion sowie Plugin-/Template-Schutz gebaut und mit 9/9 Importer-Tests verifiziert.
- **Persistenter Trainer & Sidebar-Umbau (zuvor):** `/api/trainer/courses/**`, `<iframe sandbox="allow-scripts">` für HTML-Artifacts, `DashboardShell.tsx` (`Meine Kurse` + Löschen) & permanent unbegrenzter Admin-Zugang (`beleanrd@gmail.com`).

## Nächster konkreter Schritt
1. **Live-Test auf `lernly-app.de/dashboard`:** Seite neu laden oder `sample-data/corporate-finance-trainer.html` über „JSON / HTML wählen“ hochladen → alle 6 CF-Themen (`DCF`, `MM`, `EMH`, `Agency`, `Ethics`, `Ratings`) interaktiv prüfen.
2. **Phase 6b / Fortschritt:** Spaced-Repetition- & Aufgabenfortschritt optional von `localStorage` in Supabase synchronisieren (ohne bestehendes Schema zu brechen).
3. **Phase 7:** Neue Landingpage aus den echten App-Komponenten bauen.

## Bekannte Grenzen & Hinweise
- Preview & Prod teilen sich eine Supabase-DB — keine Migrationen ohne explizite Freigabe.
- `POST /api/study/extract` verlangt Login + Quota (fail-closed); der `_lernly/`-Import auf `/dashboard` (und `/upload`) läuft 100 % lokal ohne KI-Kosten.
- `.env.local` lokal enthält noch alte Stripe-v2-Price-Variablennamen (`STRIPE_PRICE_PRO_MONTHLY` etc.).
