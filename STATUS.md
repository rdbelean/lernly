# STATUS (Übergabe Antigravity ↔ Claude Code ↔ OpenAI Codex)

> 📌 Tägliche Handgriffe (dev, Commit/Push, Pull, PR & Vercel, Notfall-Reset): **[WORKFLOW.md](WORKFLOW.md)**

Stand: 2026-11-20. Kompakt halten, nur Fakten. **Pflicht:** Zum Session-Start immer `STATUS.md` + `ROADMAP.md` lesen; nach Abschluss beides aktualisieren (Ordnerstruktur: `ARCHITECTURE.md`).

## Aktiver Branch
`feat/bwl-mcp-unification` — gemeinsamer Arbeitsbranch für Antigravity, Claude Code und OpenAI Codex. **Auto-Live-Regel:** Nach grünen Checks (`npx tsc --noEmit`, `npm run lint`, `npm test`) immer direkt in `main` mergen und `origin/main` + `feat/bwl-mcp-unification` pushen (Vercel deployt automatisch auf `lernly-app.de`).

## Aktuelles Ziel / Stand
**5-Tab-Klausurtrainer im Tax-Mock-Stil, verlustfreier `Tax Mock Trainer.html`-Importer & Focus-Dashboard live auf `main` (2026-11-20):**
- **Tax-Mock-Importer & Archiv (`sample-data/tax-mock-trainer.html`, `src/lib/trainer/importer.ts`):** `Tax Mock Trainer.html` nach `sample-data/tax-mock-trainer.html` verschoben; Importer liest das komplette `TASKS`/`CARDS`/`WHY`/`MOCKS`/`lawTab`-Format verlustfrei ein (15 Themen, 152 Aufgaben, 152 Karten, 3 90-Minuten-Mocks, Appendix, KaTeX + SVG) und speichert es dauerhaft in Supabase.
- **Aufgeräumtes Dashboard & Fokus-Modus (`src/app/dashboard/page.tsx`, `DashboardShell.tsx`, `TrainerView.tsx`):** Alter `Bisherige KI-Pakete & Bibliothek`-Anhang unter dem Trainer entfernt, Sidebar hat klaren „Fokus“-Toggle, Upload-Box ist per `+ Kurs hochladen` oben rechts einklappbar.
- **Neues großzügiges 5-Tab-Lernlayout (`src/components/trainer/*`):** `Übersicht & Klausurplan` (gestapelter Punkte-Fortschrittsbalken + `Jetzt weiterlernen`), `Lernen & Verstehen` (max. 860 px, Sticky-Sachverhalt, Appendix/Formelsammlung, Merke-/Fehler-/Mustersatz-Boxen), `Üben & Rechnen` (Ein-Aufgaben-Fokus + 4-Stufen-Bewertung `1–4`), `Karteikarten` (`Leertaste` + `1–4`) und `Probeklausur` (Timer + Selbst-Bepunktung).
- **Supabase Live-Stand (`beleanrd@gmail.com`):** Beide Kurse (`Tax Mock Trainer · German Tax` mit 15 Themen / 3 Mocks & `Corporate Finance & Valuation` mit 6 Themen / 1 Mock) direkt in Supabase gespeichert.

## Erledigt (diese Session)
- **Tax-Mock-Referenz & Parser (`sample-data/tax-mock-trainer.html`, `src/lib/trainer/{types,store,importer,importer.test}.ts`, `src/app/globals.css`):** Verlustfreie Extraktion, `.trainer-rich-html`-Styles mit Design-Tokens, 4-Stufen-SRS-Ratings & Probeklausur-Historie umgesetzt (10/10 Importer-Tests grün).
- **5-Tab-Trainer & Focus-Dashboard (`src/components/trainer/*`, `src/app/dashboard/page.tsx`, `src/components/dashboard/DashboardShell.tsx`):** `TrainerOverviewTab`, `TrainerLearnTab`, `TrainerPracticeTab`, `TrainerFlashcardsTab`, `TrainerMockExamTab` & einklappbare Upload-Box live.

## Nächster konkreter Schritt
1. **Live-Test auf `lernly-app.de/dashboard`:** Zwischen *Tax Mock Trainer · German Tax* und *Corporate Finance & Valuation* in der Sidebar („Meine Kurse“) wechseln und alle 5 Tabs inkl. `Fokus`-Modus und Timer-Probeklausur durchspielen.
2. **Phase 6b / Fortschritt:** Aufgaben-Ratings (`taskRatings`), Karteikarten-Ratings (`cardRatings`) und `mockHistory` optional von `localStorage` nach Supabase synchronisieren.
3. **Phase 7:** Neue Landingpage aus den echten App-Komponenten bauen.

## Bekannte Grenzen & Hinweise
- Preview & Prod teilen sich eine Supabase-DB — keine Migrationen ohne explizite Freigabe.
- `POST /api/study/extract` verlangt Login + Quota (fail-closed); der `_lernly/`-Import auf `/dashboard` (und `/upload`) läuft 100 % lokal ohne KI-Kosten.
- `.env.local` lokal enthält noch alte Stripe-v2-Price-Variablennamen (`STRIPE_PRICE_PRO_MONTHLY` etc.).
