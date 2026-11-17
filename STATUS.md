# STATUS (Übergabe Antigravity ↔ Claude Code ↔ OpenAI Codex)

> 📌 Tägliche Handgriffe (dev, Commit/Push, Pull, PR & Vercel, Notfall-Reset): **[WORKFLOW.md](WORKFLOW.md)**

Stand: 2026-11-17. Kompakt halten, nur Fakten. **Pflicht:** Zum Session-Start immer `STATUS.md` + `ROADMAP.md` lesen; nach Abschluss beides aktualisieren (Ordnerstruktur: `ARCHITECTURE.md`).

## Aktiver Branch
`feat/bwl-mcp-unification` — einziger aktiver Feature-Branch für Antigravity, Claude Code und OpenAI Codex; kein Wechsel ohne Absprache. Nie direkt auf `main`.

## Aktuelles Ziel / Stand
**Neue Lern-App nach `design/`-Mockups — Phasen 1–4 fertig & gebaut (2026-11-17):**
- Additiv im Route-Group `src/app/(study)/` unter `/heute`, `/karten` und `/rechnen` umgesetzt (Bestands-App `/dashboard` und `/` unangetastet).
- 4 saubere Phasen-Commits (`22c3728`, `64000f9`, `53a6f3e`, `ef63f33`); alle Checks grün (`tsc`, `npm test` 226/226, `npm run lint`, `npm run check:colors -- --strict` 0 Literale, `npm run build` 47/47).
- **Wartet auf Abstimmung vor Phase 5:** Ansatz für Upload & KI-Extraktion (PDFs/Altklausuren) vor Beginn klären.

## Erledigt (diese Session)
- **Phase 1 (`22c3728`):** `design/`-Mockups eingecheckt; Radius-Tokens (`--radius-btn: 4px`, `--radius-card: 12px`) & `.study-shell` (`tabular-nums`, Sora-Headlines) in `src/app/globals.css`; Domain-Typen, Corporate-Finance-Seed (7 Themen = 100 P, 62 P gesichert, 12 Karten, 3 Rechenaufgaben) & Tauri-sichere `localStorage`-Persistenz unter `src/lib/study/`.
- **Phase 2 (`64000f9`):** Dashboard `/heute` (`HeuteDashboard.tsx`, `StudyHeader.tsx`, `StatStrip.tsx`, `DailyPlan.tsx`) + austauschbare Visualisierung `PointsViz.tsx` mit allen 4 Mockup-Varianten (`leiste` Standard, `balken`, `karte`, `waffel`, per `?viz=...` umschaltbar).
- **Phase 3 (`53a6f3e`):** Karteikarten `/karten` (`FlashcardSession.tsx`, `FlashcardVisual.tsx`, `src/lib/study/srs.ts`) im Anki-Stil mit 3-Stufen-SRS (`Schwer` morgen / `Mittel` in 3 Tagen / `Leicht` in 8 Tagen), Tastatursteuerung (`Leertaste`, `1`/`2`/`3`, `Esc`) & visueller Balken-/Formel-Darstellung.
- **Phase 4 (`ef63f33`):** Rechenaufgaben `/rechnen` (`CalcExerciseView.tsx`, `src/lib/study/calcCheck.ts`) komplett ohne Kästen, WACC als erste Aufgabe, gezieltes Fehler-Feedback (z. B. `7,4 %` → vergessener Tax Shield), schrittweiser `Lösungsweg` & `Enter`/`Esc`-Steuerung.

## Nächster konkreter Schritt
1. **Vor Phase 5 mit Daniel abstimmen:** Wie sollen Folien & Altklausuren extrahiert werden — (A) JSON-Import aus Claude Desktop / MCP-Connector (`kurs.json` + `themen/*.json`, 0 € KI-Kosten), (B) Server-Upload mit Anthropic-API oder (C) Hybrid?
2. **Phase 6:** Konto, Supabase-Speicherung (Migration erst nach expliziter Freigabe) & Deployment.
3. **Phase 7:** Neue Landingpage aus den echten `src/components/study/`-Komponenten mit Seed-Daten bauen.

## Bekannte Grenzen & Hinweise
- Preview & Prod teilen sich eine Supabase-DB — keine Migrationen vor Phase 6 und nie ohne Freigabe.
- `connector/desktop/`: lokal macOS, keine OCR, PDF max. 256 MB / 2.500 Seiten.
- `.env.local` lokal enthält noch alte Stripe-v2-Price-Variablennamen (`STRIPE_PRICE_PRO_MONTHLY` etc.).
- Änderungen sind lokal auf `feat/bwl-mcp-unification` committed, noch nicht gepusht / nicht auf `main` gemergt.
