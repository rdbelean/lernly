---
name: lernly-kurs-einrichten
description: Richtet einen Kurs für Lernly ein. Erfasst den Kursordner oder die hochgeladenen Dateien, zieht den Text heraus, wertet Altklausuren zuerst aus und erstellt das Kursprofil (Bauplan der Klausur mit Punkten, Themen in drei Stufen, Quellen). Nutzen, wenn jemand für eine Klausur lernen will und Kursunterlagen hat, Lernly erwähnt, einen Lerntrainer oder Lernplan aus Folien möchte, oder /lernly:kurs-einrichten aufruft.
---

# Lernly: Kurs einrichten

Ziel: aus einem Kursordner (oft hunderte Folien) mit wenig Tokens ein belastbares **Kursprofil** `_lernly/kurs.json` machen. Darauf baut `lernly-trainer-bauen` den Trainer.

Grundsätze:
- **Uni-Ordner pro Fach abarbeiten:** Ist ein ganzer Uni-/Semester-Ordner verbunden, wähle immer zuerst gezielt das eine gewünschte Fach (`lernly_select_course` im MCP-Connector bzw. den jeweiligen Unterordner). Arbeite erst dieses Fach vollständig aus, statt mehrere Fächer zu vermischen.
- **Selbstständig analysieren statt Fragebogen-Blockade:** Lies Altklausuren, Probeklausuren, Musterlösungen und die relevanten Vorlesungsfolien selbst, erkenne Fachtyp, Klausur-Rahmen und Aufgabenhäufigkeiten eigenständig und entscheide, was wirklich klausurrelevant ist. Nur nachfragen, wenn der Ordner leer ist oder entscheidende Dokumente nicht lesbar sind.
- **Klausur zuerst.** Altklausuren, Probeklausuren, Beispielfragen und Hinweise des Profs bestimmen, was wichtig ist. Folien werden nur gezielt über Agenda/Suche gelesen.
- **Text statt PDF.** Erst Text extrahieren, dann nur Text lesen. Seiten als Bild nur ansehen, wenn dort eine wichtige Grafik oder Formel ohne Text steht.
- **Nichts erfinden.** Was nicht belegt ist, ehrlich als Schätzung markieren.
- Mit dem Studenten auf Deutsch („du“) reden, kurz und präzise. Inhalte in der Sprache des Materials (`kurs.json.language`).

`$SKILL` = der Ordner, in dem diese SKILL.md liegt (in Claude Code `${CLAUDE_SKILL_DIR}`). Skripte: `$SKILL/scripts/`. Validator und Build liegen im Nachbar-Skill: `$SKILL/../lernly-trainer-bauen/scripts/`.

## 0. Arbeitsort & Fach im Uni-Ordner wählen

- **Uni-Ordner / Ordnerzugriff** (MCP-Connector, Cowork, Claude Code):
  - Im MCP-Connector prüfst du mit `lernly_status` die erkannten Unterordner (`available_courses`). Hat der Student ein Fach genannt, wähle sofort `lernly_select_course(course="<Fach>")`. Ist kein Fach genannt und es gibt mehrere Fächer, liste sie kurz auf und frag in einem Satz, mit welchem Fach ihr startet.
  - Direkt mit Pfad: Kursordner = der jeweilige Fach-Unterordner, Arbeitsordner = `<Fachordner>/_lernly/`.
- **Chat mit hochgeladenen Dateien:** Lege einen Arbeitsordner an (z. B. `lernly-<kurs>/`), kopiere die Dateien hinein und arbeite dort.
- **Schon eingerichtet?** Gibt es `<Fachordner>/_lernly/kurs.json`, nicht neu anfangen: zeig den Stand und baue fehlende Themen weiter oder synce neu (`lernly_sync_web_course`). Lädt der Student eine `Lernly-Trainer.html` hoch, stelle die Kursdateien daraus wieder her: `python3 "$SKILL/../lernly-trainer-bauen/scripts/build_trainer.py" --unpack Lernly-Trainer.html --to _lernly`.

## 1. Inventar & Rollen selbstständig erkennen

```bash
python3 "$SKILL/scripts/inventory.py" "<Fachordner>" --out "<Fachordner>/_lernly/inventar.md"
```
(Im MCP-Connector stattdessen `lernly_inventory` im aktiven Fachordner verwenden.)

Lies `inventar.md` (bzw. das `lernly_inventory`-Ergebnis). Ordne Dateien eigenständig zu (Altklausur/Lösung vs. Übung/Case vs. Folien/Skript). Wo der Dateiname unklar ist (`2021.pdf`), entscheidet die erste Seite — kein Fragebogen nötig. Nur eindeutig fachfremde Unterordner (falls der Student ausnahmsweise einen Sammelordner gewählt hat) konsequent ignorieren und kurz erwähnen.

## 2. Text extrahieren

```bash
python3 "$SKILL/scripts/extract_text.py" "<Fachordner>"
```
(Im MCP-Connector: `lernly_index_material` zuerst für Altklausuren/Lösungen.)
Schreibt `_lernly/text/<Datei>.txt` mit `=== Seite N ===` und `_lernly/text/_uebersicht.md` (Seiten, Zeichen, ≈ Tokens, Seiten mit wenig Text). Bereits extrahierte Dateien werden übersprungen.
- Kein PDF-Werkzeug? In der Sandbox `pip install pypdf` und erneut starten. Geht das nicht, PDFs direkt lesen, aber nur die nötigen Seiten.
- Alte Formate (`.ppt`, `.doc`, `.key`) und verschlüsselte PDFs: dem Studenten kurz melden, falls sie fehlen oder unlesbar sind.

## 3. Klausurbelege finden & selbst entscheiden, was rankommt

1. Rollen prüfen, wo unklar: nur die ersten ~40 Zeilen lesen.
2. **Altklausuren, Probeklausuren & Lösungen komplett lesen:** Das ist die wichtigste Grundlage für Punkte, Aufgabenstellungen, Rechenschemata und Mustersätze.
3. **Gezielt in Folien & Übungen suchen** (statt alles durchzublättern):
   ```bash
   grep -rn -i -E "klausur|prüfung|exam|points|punkte|hilfsmittel|formelsammlung|formula sheet|calculator|taschenrechner|relevant|wichtig|will be asked|kommt dran|bonus" "<Fachordner>/_lernly/text" --include="*.txt" | head -80
   ```
   Dazu Agenda-, Inhalts- und Zusammenfassungsfolien jeder Vorlesung lesen (meist erste und letzte Seiten).
4. **Eigenständige Relevanz-Entscheidung:** Leite pro Thema ab: Wie oft kam es in Altklausuren vor, wie viele Punkte bringt es, welchen Fachtyp hat es (`rechnen` | `argumentieren` | `verstehen` | `gemischt`), welche Hilfsmittel gelten und welche Folienbereiche sind wirklich prüfungsrelevant (und welche Folien können weggelassen werden)?

## 4. Bauplan (`kurs.json`) schreiben & direkt bauen

Erstelle `_lernly/kurs.json` nach `references/kursprofil.md`:
- `exam`: Dauer, Punkte, Hilfsmittel, Aufbau (`parts` mit `slots`), `fidelity` (strict / likely / broad, ehrlich).
- `topics`: Lerneinheiten, sortiert nach Klausur-Punkten & Häufigkeit:
  - **Stufe 1 (`tier: 1`):** die Top-Punktebringer (~70 % der Punkte, wiederkehrend in Altklausuren) → volle Tax-Mock-Trainer-Tiefe.
  - **Stufe 2 (`tier: 2`):** häufige Aufgaben / Wahlaufgaben → Rezept, Mustersätze & gezielte Aufgaben.
  - **Stufe 3 (`tier: 3`):** Rand-/Ergänzungsthemen → nur kompakt, falls nach Stufe 1+2 sinnvoll.
- `strategy`, `subjectType`, `language` (Sprache des Materials) und `notation` (Symbole/Begriffe des Profs).

Prüfen (`validate.py`), optional `<Fachordner>/00_LERNLY.md` schreiben, dem Studenten kurz die kompakte **Klausur-Diagnose** (`Aufgabe · Punkte · Häufigkeit · Thema · Stufe`) zeigen und **direkt im Anschluss ohne erneute Rückfrage** mit **lernly-trainer-bauen** die Themen ausarbeiten und per **`lernly_sync_web_course`** ins Lernly Web-Dashboard (`lernly-app.de`) syncen!

## Token-Regeln

- Nie ganze Foliensätze lesen. Erst `_uebersicht.md`, dann `grep`, dann gezielt Seitenbereiche (`sed -n '/=== Seite 46 ===/,/=== Seite 65 ===/p' datei.txt`).
- Bilder nur für Seiten mit wenig Text, die laut Bauplan Punkte bringen.
- Keine langen Inhalte in den Chat kopieren. Ergebnisse stehen in `_lernly/`, im Chat nur knappe Statuszeilen.
