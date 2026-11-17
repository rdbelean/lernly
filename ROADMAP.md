# Lernly — Produkt-Roadmap (Solo-Founder-Übersicht)

Stand: 2026-11-17 · Aktiver Branch: `feat/bwl-mcp-unification`

**Legende:** `[x]` Fertig · `[~]` In Arbeit · `[ ]` Offen  
**Regel für alle Agenten:** Vor jedem Task `STATUS.md` und `ROADMAP.md` lesen (Ordnerübersicht in `ARCHITECTURE.md`) und nach jedem abgeschlossenen Meilenstein aktualisieren.

---

## 1) Landingpage & Funnel (BWL/Finance-Fokus)
- [x] Helles Design & klare Positionierung auf BWL-Studierende (Finance, Mathe, Marketing) in `src/components/landing/LernlyLanding.tsx`
- [x] Automatisch ablaufende 20-Sekunden-Hero-Szene (`HeroScene.tsx`) mit Klausurkarte, Erklärung, Rechenaufgabe, Karteikarte und KI-Hilfe
- [x] Interaktive Browser-Demo ohne Anmeldung (Finance, Mathe, Marketing) im Modal-Dialog
- [x] SEO-Metadaten & Social-Preview auf BWL-Klausuren ausgerichtet (`src/app/page.tsx`)
- [x] Alten, ungenutzten Landingpage-Code (~6.600 Zeilen) komplett entfernt
- [~] Feinschliff am Copywriting durch Daniel & echter Onboarding-/Beta-Flow statt reinem `mailto:`-Link
- [ ] Anleitung & Download-/Verbindungsstrecke für den Claude-Connector direkt für Beta-Tester bereitstellen

## 2) Claude MCP-Connector & BWL-Skills (`connector/` & `plugin/`)
- [x] Kompaktes Kurs- & Themen-Format (`kurs.json`, `themen/*.json`, `probeklausuren/*.json`, `spickzettel.json`) mit Rechen-Drills, Zahlenvarianten, Rundungstoleranzen und Punkte-Checklisten definiert
- [x] Lokaler Claude-Desktop-Connector (`connector/desktop/`, Beta 0.2.0, `.mcpb`-Paket) mit 11 Werkzeugen, Ordner-Schutz (`_lernly/`), PDF-/Office-/Excel-Extraktion, Python-Rechner und Validator gebaut (8/8 Integrationstests grün)
- [x] BWL-/Finance-Skills und Prompts (`connector/desktop/prompts/` & `plugin/lernly/skills/`) für Klausurplan nach Punkten, Theorie, Rechenwege und Karteikarten-Export (Anki/Quizlet) erstellt
- [~] Echter End-to-End-Qualitätstest mit dem kompletten Corporate-Finance-Kurs (20 Originaldateien) in Claude Desktop und Abgleich gegen das CF-Study-OS-Referenz-Artifact
- [ ] Reibungsloses Setup für Studierende ohne Technik-Hürden (und später Remote-MCP-Anbindung für Web/Mobile)

## 3) Web-App & Lern-Dashboard (`src/app/dashboard/`)
- [x] Komplettes Light-Redesign der App mit einheitlichen Farb-Tokens (`src/app/globals.css`), geprüften Kontrasten und 0 ESLint-/TypeScript-Fehlern
- [x] Neues Dashboard mit „Nächster Schritt“ (`NextStep.tsx`) und gewichteter Klausurkarte (`ExamMap.tsx`)
- [x] Spaced-Repetition-System (SM-2-lite) mit globaler Fällig-Queue (`/dashboard/review`), Streak und KaTeX-Formel-Darstellung
- [x] Login (Google & Magic-Link/Code), Stripe-Abrechnung (mit aktivem Beta-Schutzschalter) sowie Kosten- und Sicherheitslecks geschlossen
- [ ] Brücke zwischen Claude-Connector und Web-App schlagen: In Claude erstellte Kurse (`kurs.json` + `themen/*.json`) in die Web-App importieren/synchronisieren, damit Studierende mobil auf `lernly-app.de` lernen können
- [ ] Web-Oberfläche für das neue BWL-Aufgabenformat (numerische Rechen-Drills mit Varianten & Toleranzprüfung) im Dashboard freischalten

## 4) Geparkte Themen (bewusst eingefroren, kein aktueller Fokus)
- [x] **Alte SaaS-Vollgenerierung auf eigene KI-Kosten (`/api/generate`, Cram-Modus, BYOK):** Bestehender Code bleibt für Bestandsdaten stabil und abgesichert, wird aber nicht weiter ausgebaut (Cram deaktiviert, minütlicher Cron gestoppt)
- [x] **B2B-Seiten (`/hochschulen` & `/pruefungsvorbereitung` für Heilpraktikerschulen):** Als statische Seiten im Code belassen, aber während des BWL-B2C-Starts komplett geparkt
- [x] **Englische Oberflächen-Übersetzung:** UI bleibt rein Deutsch (generierte Lerninhalte passen sich automatisch der Sprache der Vorlesungsunterlagen an)
