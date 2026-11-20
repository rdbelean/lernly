# STATUS (Übergabe Antigravity ↔ Claude Code ↔ OpenAI Codex)

> 📌 Tägliche Handgriffe (dev, Commit/Push, Pull, PR & Vercel, Notfall-Reset): **[WORKFLOW.md](WORKFLOW.md)**

Stand: 2026-11-20. Kompakt halten, nur Fakten. **Pflicht:** Zum Session-Start immer `STATUS.md` + `ROADMAP.md` lesen; nach Abschluss beides aktualisieren (Ordnerstruktur: `ARCHITECTURE.md`).

## Aktiver Branch
`feat/bwl-mcp-unification` — gemeinsamer Arbeitsbranch für Antigravity, Claude Code und OpenAI Codex. **Auto-Live-Regel:** Nach grünen Checks (`npx tsc --noEmit`, `npm run lint`, `npm test`) immer direkt in `main` mergen und `origin/main` + `feat/bwl-mcp-unification` pushen (Vercel deployt automatisch auf `lernly-app.de`).

## Aktuelles Ziel / Stand
**Persistenter Claude-Kurs-Trainer (`_lernly/` + `HTML-Artifacts`), aufgeräumte Sidebar & Admin-Unlimited live auf `main` (2026-11-20):**
- **Admin-Cleanup & Unlimited-Zugang:** Alte Test-Packs/Exams für `beleanrd@gmail.com` per `scripts/admin-cleanup.ts` aus Supabase gelöscht (0 Alt-Packs, 0 Alt-Exams, Zähler auf 0); `effectivePlan(..., email)` sowie alle API-/Action-Quota- & Concurrency-Checks geben für `ADMIN_EMAILS` dauerhaft `"unlimited"` (`999_999`) frei.
- **Persistente Kursspeicherung (`/api/trainer/courses` & `/api/trainer/courses/[id]`):** `_lernly/`-Ordner (`kurs.json` + `themen/*.json`), `Lernly-Trainer.html` (`#lernly-data`) UND eigenständige Claude-HTML-Artifacts werden über `importTrainerBundle` eingelesen, dauerhaft in `study_packs` (ohne DB-Migration, 0 € KI-Kosten) gespeichert und im Dashboard unter `/dashboard?course=<id>` geladen (HTML-Artifacts sicher im `<iframe sandbox="allow-scripts">` + „In neuem Tab öffnen“).
- **Aufgeräumte Sidebar (`DashboardShell.tsx`):** Alte SaaS-Links entfernt; neue klare Struktur: `+ Kurs aus Claude laden` (`/dashboard?upload=1#upload`), `Klausur-Trainer` (`/dashboard`), `Einstellungen`, und `Meine Kurse` mit Klick-Auswahl und Lösch-Button (`Trash2`).

## Erledigt (diese Session)
- **Admin-Cleanup & Unlimited (`scripts/admin-cleanup.ts`, `src/lib/quota.ts`, `src/lib/tutorPrompt.ts`, `src/app/api/*`, `src/app/dashboard/*`):** Alt-Daten bereinigt (41 `card_reviews`, 10 `study_packs`, 4 `exams` etc. gelöscht) & unbegrenzten Admin-Plan dauerhaft verdrahtet.
- **Persistenter Trainer & HTML-Artifact-Viewer (`src/lib/trainer/*`, `src/app/api/trainer/courses/**`, `src/components/trainer/TrainerView.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/pack/[id]/page.tsx`):** Dauerhafte Speicherung in Supabase inkl. Fallback-Parser für alte HTML-Artifacts und sandgeboxtem HTML-Viewer.
- **Sidebar-Umbau (`src/components/dashboard/DashboardShell.tsx`, `src/app/dashboard/layout.tsx`):** Navigation auf `Kurs aus Claude laden`, `Klausur-Trainer`, `Einstellungen` und `Meine Kurse` inkl. Löschen umgestellt.

## Nächster konkreter Schritt
1. **Live-Abnahme auf `lernly-app.de`:** Mit `beleanrd@gmail.com` einloggen, `_lernly/`-Ordner sowie `Corporate Finance Klausurtrainer.html` hochladen, Sidebar-Auswahl („Meine Kurse“), Reload und Löschen testen.
2. **Phase 6b / Fortschritt:** Spaced-Repetition- & Aufgabenfortschritt optional von `localStorage` in Supabase synchronisieren (ohne bestehendes Schema zu brechen).
3. **Phase 7:** Neue Landingpage aus den echten App-Komponenten bauen.

## Bekannte Grenzen & Hinweise
- Preview & Prod teilen sich eine Supabase-DB — keine Migrationen ohne explizite Freigabe.
- `POST /api/study/extract` verlangt Login + Quota (fail-closed); der `_lernly/`-Import auf `/dashboard` (und `/upload`) läuft 100 % lokal ohne KI-Kosten.
- `.env.local` lokal enthält noch alte Stripe-v2-Price-Variablennamen (`STRIPE_PRICE_PRO_MONTHLY` etc.).
