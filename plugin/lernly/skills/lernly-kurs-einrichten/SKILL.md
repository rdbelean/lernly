---
name: lernly-kurs-einrichten
description: Richtet einen Kurs für Lernly ein. Erfasst den Kursordner oder die hochgeladenen Dateien, zieht den Text heraus, wertet Altklausuren zuerst aus und erstellt das Kursprofil (Bauplan der Klausur mit Punkten, Themen in drei Stufen, Quellen). Nutzen, wenn jemand für eine Klausur lernen will und Kursunterlagen hat, Lernly erwähnt, einen Lerntrainer oder Lernplan aus Folien möchte, oder /lernly:kurs-einrichten aufruft.
---

# Lernly: Kurs einrichten

Ziel: aus einem Kursordner (oft hunderte Folien) mit wenig Tokens ein belastbares **Kursprofil** `_lernly/kurs.json` machen. Darauf baut `lernly-trainer-bauen` den Trainer.

Grundsätze:
- **Erst 4-Fragen-Klausur-Briefing, nicht blind bauen.** Scanne zuerst den Ordner (`inventory.py` / `lernly_inventory`) und kläre die 4 kurzen Briefing-Fragen in einer kompakten Nachricht mit sinnvollen Standard-Vorschlägen, bevor `kurs.json` endgültig geschrieben oder Themen gebaut werden.
- **Klausur zuerst.** Altklausuren, Probeklausuren, Beispielfragen und Hinweise des Profs bestimmen, was wichtig ist. Folien werden nur gezielt gelesen.
- **Text statt PDF.** Erst Text extrahieren, dann nur Text lesen. Seiten als Bild nur ansehen, wenn dort eine wichtige Grafik oder Formel ohne Text steht.
- **Nichts erfinden.** Was nicht belegt ist, als Schätzung markieren.
- Mit dem Studenten auf Deutsch („du“) reden, kurz und präzise. Inhalte in der Sprache des Materials (`kurs.json.language`).

`$SKILL` = der Ordner, in dem diese SKILL.md liegt (in Claude Code `${CLAUDE_SKILL_DIR}`). Skripte: `$SKILL/scripts/`. Validator und Build liegen im Nachbar-Skill: `$SKILL/../lernly-trainer-bauen/scripts/`.

## 0. Arbeitsort klären

- **Ordnerzugriff** (Cowork, Claude Code, MCP-Connector): Kursordner = der Ordner, den der Student nennt oder freigegeben hat. Arbeitsordner = `<Kursordner>/_lernly/`.
- **Chat mit hochgeladenen Dateien:** Lege einen Arbeitsordner an (z. B. `lernly-<kurs>/`), kopiere die Dateien hinein und arbeite dort. Gib den fertigen Trainer am Ende als Datei zum Herunterladen aus.
- **Schon eingerichtet?** Gibt es `_lernly/kurs.json`, nicht neu anfangen: zeig den Stand und biete `/lernly:kurs-aktualisieren` oder `/lernly:trainer-bauen` an. Lädt der Student eine `Lernly-Trainer.html` hoch, stelle die Kursdateien daraus wieder her: `python3 "$SKILL/../lernly-trainer-bauen/scripts/build_trainer.py" --unpack Lernly-Trainer.html --to _lernly`.

## 1. Inventar & Geführtes 4-Fragen-Klausur-Briefing

```bash
python3 "$SKILL/scripts/inventory.py" "<Kursordner>" --out "<Kursordner>/_lernly/inventar.md"
```
(Im MCP-Connector stattdessen `lernly_inventory` verwenden.)

Lies `inventar.md` (bzw. das `lernly_inventory`-Ergebnis). Bevor du Unmengen von Folien extrahierst oder blind `kurs.json` schreibst, schicke dem Studenten **in einer einzigen kompakten Nachricht genau 4 kurze Fragen** — jeweils mit deiner vorläufigen Empfehlung aus dem Ordner-Scan, damit er einfach mit „Passt so“ bestätigen kann:

```markdown
Kurzer Check vor dem Kurs-Aufbau (einfach mit „Passt so“ bestätigen oder kurz anpassen):

1. **Fachtyp:** [Vorschlag, z. B. Rechnen & Formeln (`rechnen`) / Fallstudien & Regeln (`argumentieren`/`gemischt`) / Konzepte & Transfer (`verstehen`)]?
2. **Vorhandene Unterlagen im Ordner:**
   - **Altklausuren / Lösungen:** [...]
   - **Übungen / Cases:** [...]
   - **Vorlesungsfolien / Skript:** [...]
   - **Ausklammern:** [...] — passt diese Zuordnung?
3. **Klausur-Rahmen:** [Vorschlag oder „unklar“: z. B. 60 Punkte / 60 Min.; Hilfsmittel: Taschenrechner / Gesetzestexte / Formelsammlung]?
4. **Lern-Ziel & Umfang:** Soll ich (a) **Komplett-Aufbau** (alle Themen Stufen 1–3), (b) **Klausur-Drill** *(Empfehlung: Fokus auf Altklausur-Schemata, Mustersätze & Stufe 1+2)* oder (c) **Crash-Kurs** (nur Top-Punktebringer Stufe 1) bauen?
```

*(Falls der Student bereits alle 4 Punkte vorab klar angegeben hat, bestätige sie in 2 Zeilen und fahre direkt fort.)*

## 2. Text extrahieren

```bash
python3 "$SKILL/scripts/extract_text.py" "<Kursordner>"
```
(Im MCP-Connector: `lernly_index_material` zuerst für Altklausuren/Lösungen.)
Schreibt `_lernly/text/<Datei>.txt` mit `=== Seite N ===` und `_lernly/text/_uebersicht.md` (Seiten, Zeichen, ≈ Tokens, Seiten mit wenig Text). Bereits extrahierte Dateien werden übersprungen.
- Kein PDF-Werkzeug? In der Sandbox `pip install pypdf` und erneut starten. Geht das nicht, PDFs direkt lesen, aber nur die nötigen Seiten.
- Alte Formate (`.ppt`, `.doc`, `.key`) und verschlüsselte PDFs: dem Studenten klar sagen, dass er sie als PDF exportieren soll.

## 3. Klausurbelege finden und gründlich lesen

1. Rollen anhand der Briefing-Antwort festzurren; wo noch unklar: nur die ersten ~40 Zeilen lesen.
2. Ausgeklammerte Ordner (anderes Fach / nicht relevant) konsequent überspringen.
3. **Komplett lesen:** alle Altklausuren, Probeklausuren, Beispielfragen und deren Musterlösungen. Das ist meist wenig Text und die wichtigste Quelle für Punkte, Rechenwege und Mustersätze.
4. **Gezielt suchen** in allen Textdateien statt alles zu lesen:
   ```bash
   grep -rn -i -E "klausur|prüfung|exam|points|punkte|hilfsmittel|formelsammlung|formula sheet|calculator|taschenrechner|relevant|wichtig|will be asked|kommt dran|bonus" "<Kursordner>/_lernly/text" --include="*.txt" | head -80
   ```
   Dazu Agenda-, Inhalts- und Zusammenfassungsfolien jeder Vorlesung lesen (meist die ersten und letzten Seiten).
5. Pro Altklausur notieren: Aufgabe, Thema, Punkte, Aufgabentyp (rechnen, Fall/Schema, erklären, MC). Dann über alle Klausuren zählen: Was kommt wie oft mit wie vielen Punkten?

## 4. Bauplan und Themen

Erstelle `_lernly/kurs.json` nach `references/kursprofil.md` — abgestimmt auf Fachtyp und Lern-Ziel aus dem 4-Fragen-Briefing:
- `exam`: Dauer, Punkte, Hilfsmittel, Aufbau (`parts` mit `slots`), `fidelity` (strict / likely / broad, ehrlich).
- `topics`: Lerneinheiten, die den Slots zugeordnet sind, mit `expectedPoints`, `tier`, `why`, `effort`, `sources` (Datei + Folien/Seiten).
  - **Stufe 1 (`tier: 1`):** die Top-Punktebringer (zusammen ca. 70 % der Punkte, höchste Altklausur-Frequenz) → bekommen volle Tax-Mock-Trainer-Tiefe.
  - **Stufe 2 (`tier: 2`):** häufige Aufgaben / Wahlaufgaben → Rezept, Mustersätze & gezielte Aufgaben.
  - **Stufe 3 (`tier: 3`):** Ergänzungsthemen → beim Ziel „Crash-Kurs“ nur als Hinweis im Plan markieren, bei „Komplett-Aufbau“ kompakt ausarbeiten.
  - Folienbereiche pro Thema über die Agenda und `grep` nach Schlüsselbegriffen finden, nicht durch Lesen aller Folien.
- `strategy`: der schnellste Weg zur guten Note für genau diese Klausur (2–4 Sätze oder kurze Liste, passend zum gewählten Lern-Ziel).
- `subjectType` (`rechnen` | `verstehen` | `argumentieren` | `gemischt`) und `language` (Sprache des Materials).
- `notation`: Symbole und Begriffe des Profs (z. B. verwendete Gesetzeskürzel, Variablen, Einheiten).

Prüfen:
```bash
python3 "$SKILL/../lernly-trainer-bauen/scripts/validate.py" "<Kursordner>/_lernly"
```
(Hinweise „Themen ohne Datei“ sind an dieser Stelle normal.)

Mit Ordnerzugriff zusätzlich `<Kursordner>/00_LERNLY.md` schreiben: kurze, lesbare Fassung des Bauplans (Tabelle Aufgabe · Punkte · Thema · Stufe), Quellen und der Hinweis, dass die Kursdaten in `_lernly/` liegen. Höchstens eine Seite.

## 5. Bauplan kurz zeigen & direkt in `lernly-trainer-bauen` übergehen

Zeig die kompakte Tabelle (`Aufgabe · Punkte · Häufigkeit · Thema · Stufe`), nenne erkannte Textlücken/Scans (falls vorhanden) und starte sofort mit dem wichtigsten Stufe-1-Thema über den Skill **lernly-trainer-bauen** (bei „Crash-Kurs“ nur Stufe 1).

## Token-Regeln

- Nie ganze Foliensätze lesen. Erst `_uebersicht.md`, dann `grep`, dann gezielt Seitenbereiche (`sed -n '/=== Seite 46 ===/,/=== Seite 65 ===/p' datei.txt`).
- Bilder nur für Seiten mit wenig Text, die laut Bauplan Punkte bringen.
- Keine langen Inhalte in den Chat kopieren. Ergebnisse stehen in `_lernly/`, im Chat nur knappe Statuszeilen.
