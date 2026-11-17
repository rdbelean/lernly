# STATUS (Übergabe Antigravity ↔ Claude Code ↔ OpenAI Codex)

> 📌 Tägliche Handgriffe (dev, Commit/Push, Pull, PR & Vercel, Notfall-Reset): **[WORKFLOW.md](WORKFLOW.md)**

Stand: 2026-11-17. Kompakt halten, nur Fakten. **Pflicht:** Zum Session-Start immer `STATUS.md` + `ROADMAP.md` lesen; nach Abschluss beides aktualisieren (Ordnerstruktur: `ARCHITECTURE.md`).

## Aktiver Branch
`feat/bwl-mcp-unification` — einziger aktiver Feature-Branch für Antigravity, Claude Code und OpenAI Codex; kein Wechsel ohne Absprache. Nie direkt auf `main`.

## Aktuelles Ziel / Stand
**Neue Lern-App nach `design/`-Mockups — Phasen 1–5 fertig, live auf Preview & lokal (2026-11-17):**
- Route-Group `src/app/(study)/`: `/heute`, `/karten`, `/rechnen` und neu `/upload` (Hybrid-Import).
- Bestands-App (`/`, `/dashboard`) unangetastet; alle Checks grün (`tsc`, `npm test` 231/231, `npm run lint`, `npm run check:colors -- --strict` 0 Literale).
- Lokaler Dev-Server & Vercel-Preview auf `feat/bwl-mcp-unification` bereit zum Live-Test.

## Erledigt (diese Session)
- **Phase 1 (`22c3728`):** `design/`-Mockups, Tailwind-v4-Tokens (`4px`/`12px`, `tabular-nums`, Sora/Inter), Layout, Corporate-Finance-Seed (7 Themen = 100 P, 62 P gesichert) & `localStorage`-Persistenz.
- **Phase 2 (`64000f9`):** Dashboard `/heute` + austauschbare Visualisierung `PointsViz.tsx` (`leiste` Standard + `balken`, `karte`, `waffel` per `?viz=...`).
- **Phase 3 (`53a6f3e`):** Karteikarten `/karten` im Anki-Stil mit 3-Stufen-SRS (`1` morgen / `2` in 3 Tagen / `3` in 8 Tagen), `Leertaste`/`1`/`2`/`3`/`Esc` & visuellen Karten-Grafiken.
- **Phase 4 (`ef63f33`):** Rechenaufgaben `/rechnen` ohne Kästen, WACC als erste Aufgabe, gezieltes Fehler-Feedback (`7,4 %` → vergessener Tax Shield) & Lösungsweg.
- **Phase 5 (Hybrid — Option 3):** Einheitliches Kurs-Schema (`src/lib/study/importCourse.ts`), aktiver Kurs-Store (`courseStore.ts`), neue `/upload`-Seite (`CourseUploadView.tsx`) mit 0-€-Claude/MCP-JSON-Dropzone (`kurs.json` + `themen/*.json` inkl. Live-`PointsBar`-Vorschau) **und** abgesichertem PDF-Extraktions-Endpunkt (`POST /api/study/extract` mit Auth, Rate-Limit, Quota & Concurrency-Slot).

## Nächster konkreter Schritt
1. **Live-Review durch Daniel:** `/heute`, `/karten`, `/rechnen` und `/upload` (Desktop + iPad) auf der Preview-/Localhost-URL testen und Feedback geben.
2. **Phase 6:** Konto, Supabase-Speicherung (Migration erst nach expliziter Freigabe) & Deployment-Vorbereitung.
3. **Phase 7:** Neue Landingpage aus den echten `src/components/study/`-Komponenten mit Seed-Daten bauen.

## Bekannte Grenzen & Hinweise
- Preview & Prod teilen sich eine Supabase-DB — keine Migrationen vor Phase 6 und nie ohne Freigabe.
- `POST /api/study/extract` verlangt Login + Quota (fail-closed); der Claude/MCP-JSON-Import auf `/upload` läuft 100 % lokal ohne Login und ohne KI-Kosten.
- `.env.local` lokal enthält noch alte Stripe-v2-Price-Variablennamen (`STRIPE_PRICE_PRO_MONTHLY` etc.).
- Änderungen auf `feat/bwl-mcp-unification` — vor Merge nach `main` immer Daniel fragen.
