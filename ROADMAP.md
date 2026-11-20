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
- [ ] **Phase 6 — Konto, Speichern & Deployment:** Auth-Anbindung, Supabase-Persistenz (erst nach Migrations-Freigabe) & Live-Schaltung
- [ ] **Phase 7 — Landingpage aus echten App-Komponenten:** Hero („62 von 100 Punkten“), Dashboard, Karteikarte, Rechenaufgabe, Preis, FAQ

## 2) Claude MCP-Connector & BWL-Skills (`connector/` & `plugin/`)
- [x] Kompaktes Kurs- & Themen-Format (`kurs.json`, `themen/*.json`, `probeklausuren/*.json`, `spickzettel.json`) mit Rechen-Drills, Zahlenvarianten, Rundungstoleranzen und Punkte-Checklisten definiert
- [x] Lokaler Claude-Desktop-Connector (`connector/desktop/`, Beta 0.2.0, `.mcpb`-Paket) mit 11 Werkzeugen, Ordner-Schutz (`_lernly/`), PDF-/Office-/Excel-Extraktion, Python-Rechner und Validator gebaut (8/8 Integrationstests grün)
- [x] BWL-/Finance-Skills und Prompts (`connector/desktop/prompts/` & `plugin/lernly/skills/`) für Klausurplan nach Punkten, Theorie, Rechenwege und Karteikarten-Export (Anki/Quizlet) erstellt
- [~] Echter End-to-End-Qualitätstest mit dem kompletten Corporate-Finance-Kurs (20 Originaldateien) in Claude Desktop und Abgleich gegen das CF-Study-OS-Referenz-Artifact
- [ ] Reibungsloses Setup für Studierende ohne Technik-Hürden (und später Remote-MCP-Anbindung für Web/Mobile)

## 3) Bestehende Web-App & Landingpage (aktiv bis Umschaltung in Phase 6/7)
- [x] Helles Design, 20-Sekunden-Hero-Szene, Browser-Demo & direkter „Anmelden“-Link in `src/components/landing/LernlyLanding.tsx`
- [x] Admin-Only-Login für geschlossene Beta (`ADMIN_EMAILS`/`ADMIN_PASSWORD`, `signInWithPassword`, lokaler `Schnell-Login (Dev)` auf `localhost` & Allowlist über OAuth/Confirm/Dashboard)
- [x] Erster `lernly.kurs/1` Klausur-Trainer (`/dashboard/trainer`) mit `_lernly/`-Ordner-Import, Verstehen-Blöcken, Rechen-Drills (Zahlenvarianten + Toleranzprüfung), Punkte-Checklisten & Demo-Kurs
- [x] Eingeloggtes Dashboard (`src/app/dashboard/`), Spaced Repetition (`/dashboard/review`), Auth & Stripe (mit Beta-Schutzschalter) sowie geschlossene Kosten-/Sicherheitslecks
- [~] Übergang von Bestands-Dashboard (`/dashboard`) auf die neue reduzierte App (`/dashboard/trainer` bzw. `/heute`, `/karten`, `/rechnen`, `/upload`) nach Abschluss von Phase 6

## 4) Geparkte Themen (bewusst eingefroren, kein aktueller Fokus)
- [x] **Alte SaaS-Vollgenerierung auf eigene KI-Kosten (`/api/generate`, Cram-Modus, BYOK):** Bestehender Code bleibt für Bestandsdaten stabil und abgesichert, wird aber nicht weiter ausgebaut (Cram deaktiviert, minütlicher Cron gestoppt)
- [x] **B2B-Seiten (`/hochschulen` & `/pruefungsvorbereitung` für Heilpraktikerschulen):** Als statische Seiten im Code belassen, aber während des BWL-B2C-Starts komplett geparkt
- [x] **Englische Oberflächen-Übersetzung:** UI bleibt rein Deutsch (generierte Lerninhalte passen sich automatisch der Sprache der Vorlesungsunterlagen an)
