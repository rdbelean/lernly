# STATUS (Übergabe Claude Code ↔ Codex)

Stand: 2026-11-15. Kompakt halten, nur Fakten.

## Aktiver Branch
`codex/lernly-mcp-beta` — gemeinsamer Feature-Branch; kein Wechsel ohne Absprache. Nie direkt auf `main`.

## Aktuelles Ziel / Stand
**Lokale Claude-Desktop-MCP-Beta 0.2.0 fertig zum persönlichen Installationstest.** Nutzer installiert selbst und wählt seinen Kursordner. Keine neuen Änderungen an App, Auth, Stripe, DB oder Produktion.

## Erledigt
- `connector/desktop/`: 11 MCP-Werkzeuge, freigegebener Kursordner, live geladene Markdown-Prompts, Extraktion/Suche, Kursgedächtnis mit Revisionen/Backups, Rechnen, HTML-Trainer und Anki-/Quizlet-Dateiexport. Vorhandene SDK-/unpdf-Abhängigkeiten gebündelt.
- Paket: `connector/desktop/dist/lernly-beta-0.2.0.mcpb` (gitignored); Beispieltrainer daneben. Installation/Startprompt/Prompt-Änderungen: `connector/desktop/README.md`.
- Build und **8/8 Integrationstests** bestanden. Echter Claude/Sonnet-Lauf erzeugte künstlichen DCF-Kurs über MCP. LaTeX-Maskierungsfehler und blockierte Mehrdatei-Reparatur behoben; anschließender Claude-Lauf reparierte und baute erfolgreich. Nachweis: `connector/desktop/TESTRESULTS.md`.
- Browser: Desktop + 380 px, Formeln, falsche/richtige Rechenantworten, Karten, Lernstand nach Neuladen und Probeklausur-Selbstbewertung geprüft.
- CF-Rohmaterial-Testkopie: neuer Connector indexiert **20/20 Dateien**, inklusive drei XLSX und CBRE-PDF; 309 Seiten/Blätter, 24 textarme Stellen, Klausurduplikat erkannt. Noch kein vollständiger CF-Trainer-Qualitätsnachweis.
- Phase-0-Plugin unter `plugin/lernly/` bleibt Grundlage für Format, Validator und HTML-Vorlage. LaTeX-Prüfung in `skills/lernly-trainer-bauen/scripts/validate.py` ergänzt.

## Nächster konkreter Schritt
Nutzer installiert das MCPB in Claude Desktop, wählt seinen Kursordner und verwendet den Startprompt aus der README. **Natives Claude-Artifact im persönlichen Desktop-Chat prüfen**, danach vollständigen CF-Kurstest gegen CF Study OS. Desktop-Installation wurde nicht stellvertretend durchgeführt.

## Bekannte Grenzen
- Lokal auf macOS; kein Remote-Connector/OAuth. Kein API-Key nötig; Claude-Abo-/Kontextlimits gelten.
- Keine OCR/Bildanalyse; PDF max. 256 MB / 2.500 Seiten. Excel liest Formeln/gespeicherte Werte, berechnet nicht neu.
- Kein automatischer Artifact-/Browser-Fortschritt-Sync und kein direkter Anki-/Quizlet-Sync; Export/Import vorhanden.
- Inhaltliche Qualität bleibt prüfpflichtig: Beispiel-Probeklausur hat eine ungenaue Teilpunkt-Zuordnung trotz richtiger Gesamtsumme. CF-Qualitätstest offen.
- Alter Phase-0-Python-Extraktor kann weiterhin kein XLSX; der neue Connector verarbeitet es separat. Frühere Testhistorie: `docs/strategy/2026-11-14-cf-realtest-status.md`.
- Plugin-Lizenz offen. Globaler Stop-Hook laut voriger Übergabe auf Nicht-main weiterhin Auto-Commit/Push inkl. `git add -A`; von Codex nicht verändert.

## Wichtige Entscheidungen
Claude erzeugt Inhalte mit dem Abo des Studenten. Der lokale Connector liest ausgewählte Rohunterlagen; keine Lernly-Cloud erhält sie. Angeforderte Ausschnitte gehen in den Claude-Chat. Prompts: `connector/desktop/prompts/`. Native Artifacts erstellt Claude selbst; alternativ baut die feste Vorlage einen lokalen HTML-Trainer aus Kurs-JSON. UI Deutsch, Inhalte in Materialsprache. Vor Merge nach `main` fragen.
