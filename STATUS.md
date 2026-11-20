# STATUS (Übergabe Antigravity ↔ Claude Code ↔ OpenAI Codex)

> 📌 Tägliche Handgriffe (dev, Commit/Push, Pull, PR & Vercel, Notfall-Reset): **[WORKFLOW.md](WORKFLOW.md)**

Stand: 2026-11-20. Kompakt halten, nur Fakten. **Pflicht:** Zum Session-Start immer `STATUS.md` + `ROADMAP.md` lesen; nach Abschluss beides aktualisieren (Ordnerstruktur: `ARCHITECTURE.md`).

## Aktiver Branch
`feat/bwl-mcp-unification` — gemeinsamer Arbeitsbranch für Antigravity, Claude Code und OpenAI Codex. **Auto-Live-Regel:** Nach grünen Checks (`npx tsc --noEmit`, `npm run lint`, `npm test`) immer direkt in `main` mergen und `origin/main` + `feat/bwl-mcp-unification` pushen (Vercel deployt automatisch auf `lernly-app.de`).

## Aktuelles Ziel / Stand
**Autonomer Uni-Ordner-Modus (`lernly_select_course`), Tax-Mock-Trainer-Didaktik & direkter Web-Sync (`lernly_sync_web_course`) live auf `main` (2026-11-20):**
- **Uni-Ordner & Multi-Fach-Support (`connector/desktop/src/{storage,service,server}.mjs`, `manifest.json`):** Studenten verbinden einmalig ihren gesamten Uni-/Semester-Ordner; `lernly_status` listet alle Fach-Unterordner (`available_courses`), und mit **`lernly_select_course`** (13 MCP-Tools gesamt) wechselt Claude isoliert in genau ein Fach (`<Fach>/_lernly/`, inkl. Symlink-/Traversal-Schutz).
- **Selbstständige Klausur- & Folien-Analyse ohne Fragebogen-Blockade (`connector/desktop/prompts/*`, `plugin/lernly/{skills,commands}/`):** Nach Fachwahl analysiert Claude eigenständig alle Altklausuren, Musterlösungen und relevanten Folienabschnitte, bestimmt Fachtyp, Punkte-Gewichtung und Stufen 1–3 selbst, baut direkt Themen in Tax-Mock-Trainer-Tiefe (`simple`, Sachverhalt mit `==Signalwörtern==`, Schritt-für-Schritt + „Woher kommt die Zahl / Regel?“, Merke-Box, Klausurfallen, Mustersätze, Rechen-Drills) und synct automatisch nach `lernly-app.de`.
- **Nahtloser Direkt-Sync zu `lernly-app.de` (`src/lib/trainer/sync{Token,Persistence}.ts`, `src/app/api/trainer/sync/route.ts`, `src/app/dashboard/settings/trainer-sync-section.tsx`):** Zustandslos per HMAC-SHA256 signierter Sync-Token unter `/dashboard/settings` (ohne DB-Migration); `lernly_sync_web_course` überträgt den Kurs direkt in Supabase. `.mcpb`-Bundle (`connector/desktop/dist/lernly-beta-0.2.0.mcpb`) neu gebaut.

## Erledigt (diese Session)
- **Uni-Ordner Multi-Fach-Architektur (`connector/desktop/`):** `Storage.listCourses`, `Storage.selectCourse`, `lernly_select_course`, isolierter Unterordner-Kontext & Escape-Schutz umgesetzt und getestet (`10/10` Integrationstests grün).
- **Autonome Analyse + Web-Sync-Brücke (`prompts/*`, `plugin/lernly/*`, `src/app/api/trainer/sync/route.ts`, `/dashboard/settings`):** Ohne Vorab-Fragebogen-Blockade direkt von Fachauswahl über Altklausur-/Folienanalyse in den Web-Trainer (245/245 Unit-Tests, `tsc`, `eslint` & `check:colors --strict` grün).

## Nächster konkreter Schritt
1. **Desktop-E2E-Test mit der neuen `.mcpb` (`connector/desktop/dist/lernly-beta-0.2.0.mcpb`):** gesamten Uni-Ordner + Sync-Token aus `lernly-app.de/dashboard/settings` einmalig in Claude Desktop hinterlegen und direkt ein Fach starten („Lass uns mit Corporate Finance starten“).
2. **Phase 6b / Fortschritt:** Aufgaben-Ratings (`taskRatings`), Karteikarten-Ratings (`cardRatings`) und `mockHistory` optional von `localStorage` nach Supabase synchronisieren.
3. **Phase 7:** Neue Landingpage aus den echten App-Komponenten bauen.

## Bekannte Grenzen & Hinweise
- Preview & Prod teilen sich eine Supabase-DB — keine Migrationen ohne explizite Freigabe.
- `POST /api/study/extract` verlangt Login + Quota (fail-closed); der `_lernly/`-Import auf `/dashboard` (und `/upload`) läuft 100 % lokal ohne KI-Kosten.
- `.env.local` lokal enthält noch alte Stripe-v2-Price-Variablennamen (`STRIPE_PRICE_PRO_MONTHLY` etc.).
