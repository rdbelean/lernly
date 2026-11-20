# Lernly — Produkt-Roadmap (Solo-Founder-Übersicht)

> 📌 Tägliche Handgriffe (dev, Commit/Push, Pull, PR & Vercel, Notfall-Reset): **[WORKFLOW.md](WORKFLOW.md)**

Stand: 2026-11-20 · Aktiver Branch: `feat/bwl-mcp-unification`

**Legende:** `[x]` Fertig · `[~]` In Arbeit · `[ ]` Offen  
**Regel für alle Agenten:** Vor jedem Task `STATUS.md` und `ROADMAP.md` lesen (Ordnerübersicht in `ARCHITECTURE.md`) und nach jedem abgeschlossenen Meilenstein aktualisieren.

---

## 1) Neue Lern-App nach `design/`-Mockups („Punkte sind die Währung“)
- [x] **Phase 1 — Gerüst:** Tailwind-v4-Tokens (`4px`/`12px`, `tabular-nums`, Sora/Inter), Route-Group `(study)` (`/heute`, `/karten`, `/rechnen`), Corporate-Finance-Seed (7 Themen = 100 P, 62 P gesichert) & `localStorage`-Persistenz
- [x] **Phase 2 — Dashboard „Heute“ (`/heute`):** Statistikzeile (`62/100 P`, `12`, `9 Tage`), Tagesplan (`48 Min`) & austauschbare Punkte-Visualisierung (`Leiste` Standard + `Balken`, `Mini-Karte`, `Waffel`)
- [x] **Phase 3 — Karteikarten (`/karten`):** Anki-Stil, 3-Stufen-SRS (`1` morgen / `2` in 3 Tagen / `3` in 8 Tagen), `Leertaste`/`1`/`2`/`3`/`Esc` & visuelle Karten-Grafiken
- [x] **Phase 4 — Rechenaufgaben (`/rechnen`):** Boxloses Layout, Eingabe + `Prüfen` (`Enter`), gezieltes Fehler-Feedback (z. B. vergessener Tax Shield bei WACC `7,4 %`) & schrittweiser Lösungsweg
- [x] **Phase 5 — Hybrid-Upload & KI-Extraktion (`/upload`):** Einheitliches Schema + 0-€-Dropzone für Claude/MCP-Pakete (`kurs.json` + `themen/*.json`) und abgesicherter PDF-Extraktions-Adapter (`POST /api/study/extract`)
- [~] **Phase 6 — Konto, Speichern & Deployment:** Auth-Anbindung (`ADMIN_EMAILS`), Supabase-Kursspeicherung für `/dashboard` (`/api/trainer/courses` live) & Fortschritts-Sync als Nächstes
- [ ] **Phase 7 — Landingpage aus echten App-Komponenten:** Hero („62 von 100 Punkten“), Dashboard, Karteikarte, Rechenaufgabe, Preis, FAQ

## 2) Claude MCP-Connector & BWL-Skills (`connector/` & `plugin/`)
- [x] Kompaktes Kurs- & Themen-Format (`kurs.json`, `themen/*.json`, `probeklausuren/*.json`, `spickzettel.json`) mit Rechen-Drills, Zahlenvarianten, Rundungstoleranzen und Punkte-Checklisten definiert
- [x] Lokaler Claude-Desktop-Connector (`connector/desktop/`, Beta 0.2.0, `.mcpb`-Paket) mit 12 Werkzeugen (inkl. direktem Web-Sync `lernly_sync_web_course`), Ordner-Schutz (`_lernly/`), PDF-/Office-/Excel-Extraktion, Python-Rechner und Validator gebaut (9/9 Integrationstests grün)
- [x] Geführtes 4-Fragen-Klausur-Briefing, Fachtyp-Spezialisierungen (Rechnen, Fallstudien & Regeln, Konzepte & Transfer) und Tax-Mock-Trainer-Tiefe („Woher kommt die Zahl / Regel?“, Sachverhalt mit Signalwörtern, Merke-/Fehler-Boxen, Mustersätze) in Prompts & Skills verankert (`connector/desktop/prompts/` & `plugin/lernly/skills/`)
- [x] Direkte Sync-Brücke von Claude Desktop ins Web-Dashboard (`POST /api/trainer/sync` + HMAC-Sync-Token unter `/dashboard/settings`, ohne DB-Migration)
- [~] Echter End-to-End-Praxistest der neu gebauten `.mcpb` (`connector/desktop/dist/lernly-beta-0.2.0.mcpb`) in Claude Desktop mit Web-Sync ins Live-Dashboard
- [ ] Reibungsloses Setup für Studierende ohne Technik-Hürden (und später Remote-MCP-Anbindung für Web/Mobile)

## 3) Bestehende Web-App & Landingpage (aktiv bis Umschaltung in Phase 6/7)
- [x] Helles Design, 20-Sekunden-Hero-Szene, Browser-Demo & direkter „Anmelden“-Link in `src/components/landing/LernlyLanding.tsx`
- [x] Admin-Only-Login für geschlossene Beta (`ADMIN_EMAILS`/`ADMIN_PASSWORD` inkl. Kurzpasswort-Check `12345`, `signInWithPassword`, lokaler `Schnell-Login (Dev)` auf `localhost` & Allowlist über OAuth/Confirm/Dashboard)
- [x] **5-Tab-Klausurtrainer im Tax-Mock-Stil auf `/dashboard`:** Aufgeräumtes Focus-Dashboard (`Fokus`-Sidebar-Toggle, einklappbare Upload-Box), verlustfreier Importer für `lernly.kurs/1` + `sample-data/tax-mock-trainer.html` (15 Themen, 152 Aufgaben, 3 90-Min-Mocks, Appendix) + `sample-data/corporate-finance-trainer.html` (6/6 CF-Themen), 5 dedizierte Lernmodi (`Übersicht & Klausurplan`, `Lernen & Verstehen` inkl. Sticky-Sachverhalt & Appendix, `Üben & Rechnen` Ein-Aufgaben-Fokus + 4-Stufen-Rating `1–4`, `Karteikarten` & `Probeklausur` mit Timer) sowie dauerhafte Supabase-Speicherung (`/api/trainer/courses`) & Admin-Unlimited-Zugang
- [x] Eingeloggtes Dashboard (`src/app/dashboard/`), Spaced Repetition (`/dashboard/review`), Auth & Stripe (mit Beta-Schutzschalter) sowie geschlossene Kosten-/Sicherheitslecks
- [~] Auto-Live-Workflow auf `main` aktiv (`CLAUDE.md`, `AGENTS.md`, `WORKFLOW.md`) — Fortschritts-Sync (Phase 6) & neue Landingpage (Phase 7) als Nächstes

## 4) Geparkte Themen (bewusst eingefroren, kein aktueller Fokus)
- [x] **Alte SaaS-Vollgenerierung auf eigene KI-Kosten (`/api/generate`, Cram-Modus, BYOK):** Bestehender Code bleibt für Bestandsdaten stabil und abgesichert, wird aber nicht weiter ausgebaut (Cram deaktiviert, minütlicher Cron gestoppt)
- [x] **B2B-Seiten (`/hochschulen` & `/pruefungsvorbereitung` für Heilpraktikerschulen):** Als statische Seiten im Code belassen, aber während des BWL-B2C-Starts komplett geparkt
- [x] **Englische Oberflächen-Übersetzung:** UI bleibt rein Deutsch (generierte Lerninhalte passen sich automatisch der Sprache der Vorlesungsunterlagen an)
