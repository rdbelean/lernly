# STATUS (Übergabe Antigravity ↔ Claude Code ↔ OpenAI Codex)

> 📌 Tägliche Handgriffe (dev, Commit/Push, Pull, PR & Vercel, Notfall-Reset): **[WORKFLOW.md](WORKFLOW.md)**

Stand: 2026-11-20. Kompakt halten, nur Fakten. **Pflicht:** Zum Session-Start immer `STATUS.md` + `ROADMAP.md` lesen; nach Abschluss beides aktualisieren (Ordnerstruktur: `ARCHITECTURE.md`).

## Aktiver Branch
`feat/bwl-mcp-unification` — gemeinsamer Arbeitsbranch für Antigravity, Claude Code und OpenAI Codex. **Auto-Live-Regel:** Nach grünen Checks (`npx tsc --noEmit`, `npm run lint`, `npm test`) immer direkt in `main` mergen und `origin/main` + `feat/bwl-mcp-unification` pushen (Vercel deployt automatisch auf `lernly-app.de`).

## Aktuelles Ziel / Stand
**4-Fragen-Klausur-Briefing, Tax-Mock-Trainer-Didaktik im MCP-Connector & direkter Web-Sync (`lernly_sync_web_course`) live auf `main` (2026-11-20):**
- **4-Fragen-Klausur-Briefing (`connector/desktop/prompts/*`, `plugin/lernly/skills/lernly-kurs-einrichten/SKILL.md`, `commands/kurs-einrichten.md`):** Claude scannt vor dem Bauen zuerst den Kursordner (`lernly_inventory`), schlägt vorläufige Dateizuordnungen vor und klärt in genau 1 Nachricht die 4 Briefing-Fragen (Fachtyp, Unterlagen-Rollen, Klausur-Rahmen inkl. Hilfsmittel, Lern-Ziel).
- **Tax-Mock-Trainer-Standard & Fachtyp-Logik (`plugin/lernly/skills/lernly-trainer-bauen/{SKILL.md,references/*}`, `service.mjs`):** Verbot oberflächlicher Zusammenfassungen; Stufe 1+2 verlangen `simple`, Klausur-Sachverhalt (`example`) mit `==Signalwörtern==`, Schritt-für-Schritt-Schema mit **„Woher kommt die Zahl / Regel?“**, Merke-Box, Klausurfallen und klausurfertige **Mustersätze** (`standardAnswer`). `mode="format"` liefert ab sofort zusätzlich `fachtypen.md` und `qualitaet.md`.
- **Nahtloser Direkt-Sync zu `lernly-app.de` (`src/lib/trainer/syncToken.ts`, `src/lib/trainer/syncPersistence.ts`, `src/app/api/trainer/sync/route.ts`, `src/app/dashboard/settings/trainer-sync-section.tsx`, `connector/desktop/src/{server,service}.mjs`, `manifest.json`):** Zustandslos per HMAC-SHA256 signierter Sync-Token unter `/dashboard/settings` (ohne DB-Migration); neues MCP-Tool **`lernly_sync_web_course`** (12 MCP-Tools gesamt) validiert `_lernly/`, bündelt den Kurs und speichert ihn per `POST /api/trainer/sync` direkt in Supabase. `.mcpb`-Bundle (`connector/desktop/dist/lernly-beta-0.2.0.mcpb`) neu gebaut.

## Erledigt (diese Session)
- **Prompts & Skills aktualisiert (`connector/desktop/prompts/{base,artifact,trainer}.md`, `plugin/lernly/{skills,commands}/`):** Geführtes 4-Fragen-Briefing, strenge Klausur-Gewichtung (Stufe 1–3) und Fachtyp-Spezialisierungen (Rechnen, Fallstudien & Regeln, Konzepte & Transfer) verankert.
- **Web-Sync-Brücke & Konto-UI (`src/lib/trainer/sync{Token,Persistence}.ts`, `src/app/api/trainer/{sync,courses}/route.ts`, `src/app/dashboard/settings/`):** Geteilter Kurs-Upserter ohne Duplikatlogik, Sync-Token-Karte unter `/dashboard/settings` und `lernly_sync_web_course` im Desktop-Connector (9/9 Connector-Tests, 245/245 Unit-Tests, `tsc`, `eslint` & `check:colors --strict` grün).

## Nächster konkreter Schritt
1. **Desktop-E2E-Test mit der neuen `.mcpb` (`connector/desktop/dist/lernly-beta-0.2.0.mcpb`):** Sync-Token aus `lernly-app.de/dashboard/settings` kopieren, Connector neu laden, Kursordner mit dem 4-Fragen-Briefing einrichten und direkt per `lernly_sync_web_course` ins Live-Dashboard syncen.
2. **Phase 6b / Fortschritt:** Aufgaben-Ratings (`taskRatings`), Karteikarten-Ratings (`cardRatings`) und `mockHistory` optional von `localStorage` nach Supabase synchronisieren.
3. **Phase 7:** Neue Landingpage aus den echten App-Komponenten bauen.

## Bekannte Grenzen & Hinweise
- Preview & Prod teilen sich eine Supabase-DB — keine Migrationen ohne explizite Freigabe.
- `POST /api/study/extract` verlangt Login + Quota (fail-closed); der `_lernly/`-Import auf `/dashboard` (und `/upload`) läuft 100 % lokal ohne KI-Kosten.
- `.env.local` lokal enthält noch alte Stripe-v2-Price-Variablennamen (`STRIPE_PRICE_PRO_MONTHLY` etc.).
