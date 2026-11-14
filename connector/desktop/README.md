# Lernly für Claude Desktop — Beta 0.2.0

Du sprichst mit Claude; Lernly gibt Claude den Kursordner, die Lernmethode und ein dauerhaftes Kursgedächtnis. **Claude erstellt das Artifact mit deinem Claude-Zugang.** Der Connector erzeugt selbst keine KI-Inhalte und benötigt keinen Anthropic-API-Key.

## Installieren (Mac)

1. Öffne in Claude Desktop **Einstellungen → Desktop-App → Erweiterungen / Verwalten → Erweiterte Einstellungen → Erweiterung installieren**. Je nach Claude-Version heißt der Bereich direkt „Extensions“.
2. Wähle `dist/lernly-beta-0.2.0.mcpb` aus diesem Ordner.
3. Wähle **deinen Kursordner** (einen Kurs, nicht dein gesamtes Benutzerverzeichnis). Lernly liest dort PDF, PPTX, DOCX, XLSX, TXT, Markdown und CSV. Neue Dateien landen ausschließlich im Unterordner `_lernly`; Rohunterlagen werden nicht überschrieben.
4. Python 3.10+ wird für Office-Dateien, Validierung, Rechnen und den Standardtrainer benötigt. Auf Daniels Mac ist der geprüfte Pfad **`/opt/homebrew/opt/python@3.14/bin/python3.14`**. Bei anderen Macs `python3` oder den eigenen absoluten Pfad eintragen. Node und die JavaScript-Pakete sind über Claude Desktop bzw. das Erweiterungspaket verfügbar; kein npm-Install beim Tester.
5. Optional **Eigene Lernanweisungen** auf `/Users/rdb/lernly/connector/desktop/prompts` setzen, damit Änderungen im Code sofort wirken. Bei anderen Installationen den eigenen Checkout-Pfad verwenden. Ohne Auswahl gelten die gebündelten Prompts.
6. Lernly in einem **neuen Claude-Chat aktivieren**. Zuerst schreiben: „Prüfe mit Lernly, ob mein Kursordner und alle Werkzeuge bereit sind.“ Claude soll `lernly_status` aufrufen. Falls Lernly nicht auftaucht: Erweiterung aktivieren, Claude neu starten und erneut einen neuen Chat öffnen.

Die Installation samt Auswahl des persönlichen Ordners macht der Nutzer. Die Beta verändert keine vorhandene Claude-Konfiguration oder globale Hooks. Sie ist nicht im öffentlichen Erweiterungsverzeichnis gelistet.

## Erster echter Lernlauf

Kopiere diesen Prompt in den neuen Claude-Chat:

> Nutze Lernly und meinen freigegebenen Kursordner. Lies zuerst die Lernly-Anweisungen. Analysiere meine Altklausuren und die relevanten Unterlagen und zeige mir einen kurzen, belegten Klausurplan. Stelle höchstens eine gebündelte Rückfrage, falls dir wichtige Angaben fehlen. Erstelle danach ein interaktives Study OS als Claude-Artifact: verständliche Erklärungen, gut gesetzte Formeln, viele Übungen mit Lösungen und Feedback, sinnvolle Karteikarten und eine Probeklausur. Inhaltssprache wie meine Unterlagen, Oberfläche Deutsch. Speichere den Kurs und die Themen über Lernly, damit wir später weiterarbeiten können. Beginne mit einem vollständig ausgearbeiteten wichtigen Thema, dann ergänze die übrigen.

Alternativ, für die feste lokale Oberfläche:

> Baue mit Lernly den lokalen Standardtrainer aus meinem Kurs. Nutze dafür die Anweisungen für „trainer“ und „format“, speichere die Kursinhalte und baue die HTML-Datei. Exportiere danach die Karten für Anki und Quizlet.

Weiterarbeiten in einem neuen Chat:

> Lies mit Lernly meinen gespeicherten Kursstand. Welche Themen fehlen noch? Baue den nächsten wichtigen Abschnitt und aktualisiere mein Study OS.

Ein natives Artifact wird von Claude erzeugt, nicht vom MCP-Server. Der direkte Artifact-Workflow muss im persönlichen Desktop-Chat erprobt werden; der automatisierte Claude-Test prüft den lokalen Trainer. Ein gespeicherter HTML-Trainer ist kein automatisch veröffentlichtes Artifact.

## Prompts verändern

| Datei | Wirkung |
|---|---|
| `prompts/base.md` | Methode, Quellenarbeit, Fachlogik, Rückfragen, Qualitätsregeln |
| `prompts/artifact.md` | Gestaltung und Verhalten des frei erzeugten Claude-Artifacts |
| `prompts/trainer.md` | Workflow mit der festen HTML-Lernoberfläche |
| `../../plugin/lernly/skills/lernly-trainer-bauen/references/format.md` | Struktur der gespeicherten Kursdaten |
| `../../plugin/lernly/skills/lernly-kurs-einrichten/references/kursprofil.md` | Struktur des Klausurplans |

Wähle für Prompt-Experimente den lokalen `prompts`-Ordner in den Erweiterungseinstellungen. Änderungen an `base.md`, `artifact.md` und `trainer.md` wirken beim nächsten `lernly_instructions`-Aufruf ohne Neubau. **Für einen fairen Qualitätsvergleich einen neuen Chat starten.** Status und Anweisungen zeigen eine Prompt-Revision. Änderungen an Code, Formatreferenzen oder der festen Oberfläche brauchen einen Neubau und eine Aktualisierung des Pakets.

## Was gespeichert wird

```text
Dein Kurs/
  … originale Unterlagen …
  _lernly/
    cache/                    lokal extrahierter Quellentext
    kurs.json                 Kursprofil und Klausurplan
    themen/*.json             Erklärungen, Aufgaben, Karten
    probeklausuren/*.json      Probeklausuren
    spickzettel.json           optional
    history/                  vorherige Versionen geänderter Kursdateien
    output/Lernly-Trainer.html
    output/cards/*_anki.txt
    output/cards/*_quizlet.txt
```

Der Server läuft als von Claude gestarteter lokaler Prozess über stdio. Kein öffentlicher Port, kein separat bezahlter KI-Dienst und keine Lernly-Cloud-Datenbank. Er meldet nicht ungefragt Hintergrundereignisse an Claude: Claude ruft Werkzeuge im Chat auf. Gelesene Ausschnitte gelangen zu Claude und zählen zu dessen Nutzung/Kontext. Der fertige lokale Trainer lädt derzeit KaTeX und Schriften aus dem Internet; sein Lernstand liegt im Browser, nicht im MCP-Kursgedächtnis.

## Grenzen dieser Beta

- **Claude Desktop auf macOS**, nicht als URL unter claude.ai hinzufügbar. Eine Web-/Mobil-Version erfordert einen gesonderten Remote-Connector.
- **Kein automatischer Sync zwischen Artifact, Browser-Lernstand, Anki oder Quizlet.** Kursinhalte bleiben lokal erhalten; Lernstand über die Export-/Import-Funktion des jeweiligen Trainers sichern. Karteikarten als TSV importieren.
- **PDF-Grenze: 256 MB / 2.500 Seiten pro Datei.** Keine Behauptung, beliebige Gigabyte-Dateien zu verarbeiten. Große PDFs lokal aufteilen. Lesen erfolgt seitenweise, ohne Upload per Drag-and-drop.
- **Keine OCR und keine Bildanalyse.** Textarme Seiten werden gemeldet; wichtige Grafiken/Scans gezielt in Claude ergänzen. DOCX-Abschnitte sind keine verlässlichen Druckseiten.
- Excel liefert Tabellenblätter, Formeln und gespeicherte Werte. **Keine Neuberechnung, keine Charts.** Fehlende Formelwerte werden ausgewiesen.
- Hashgleiche Quellen werden als Dubletten gemeldet. Beurteilung der Klausurrelevanz und fachliche Richtigkeit bleiben Aufgaben von Claude und müssen an echten Kursen geprüft werden.
- Der Connector prüft das Datenformat, nicht die gesamte fachliche Richtigkeit. Ein bestandener Techniktest ist kein Beweis, dass die Inhalte schon das Niveau deines CF Study OS erreichen.

## Entwickeln und prüfen

Vom Repository-Verzeichnis:

```sh
node connector/desktop/scripts/build.mjs
node --test connector/desktop/tests/*.test.mjs
```

Das Buildskript nutzt die **bereits im Repository installierten** Pakete (MCP SDK, Zod, esbuild und unpdf), bündelt die Laufzeit samt Lizenzen und erstellt das MCPB-Paket. Keine neuen Pakete werden installiert und die Next.js-App wird nicht verändert. Die tatsächlich gebündelten Versionen stehen in `build/extension/BUNDLED-DEPENDENCIES.json`.

Materialtest ohne KI, auf einer Testkopie:

```sh
node connector/desktop/scripts/check-materials.mjs /absoluter/testkurs /tmp/lernly-material-report.json
```

Der Test schreibt Extraktionscaches in den Testkurs. Keine vorbereiteten Zusammenfassungen oder Trainer als vermeintliche Rohunterlagen verwenden.

## Technische Quellen

- [Anthropic: lokale Desktop-Erweiterungen installieren](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)
- [MCPB-Manifest und konfigurierbare Ordner](https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md)
- [MCP stdio-Transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
- [Offizielles TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

Die frühere Phase-0-Plugin-Version bleibt unter `plugin/lernly` erhalten. Dieses Desktop-Paket übernimmt deren Inhaltsformat, Validator und feste Traineroberfläche und ergänzt einen tatsächlichen MCP-Server. Die Slash-Befehle des alten Plugins sind für diese Desktop-Beta nicht notwendig.
