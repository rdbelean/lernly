---
name: lernly-kurs-einrichten
description: Richtet einen Kurs für Lernly ein. Erfasst den Kursordner oder die hochgeladenen Dateien, zieht den Text heraus, wertet Altklausuren zuerst aus und erstellt das Kursprofil (Bauplan der Klausur mit Punkten, Themen in drei Stufen, Quellen). Nutzen, wenn jemand für eine Klausur lernen will und Kursunterlagen hat, Lernly erwähnt, einen Lerntrainer oder Lernplan aus Folien möchte, oder /lernly:kurs-einrichten aufruft.
---

# Lernly: Kurs einrichten

Ziel: aus einem Kursordner (oft hunderte Folien) mit wenig Tokens ein belastbares **Kursprofil** `_lernly/kurs.json` machen. Darauf baut `lernly-trainer-bauen` den Trainer.

Grundsätze:
- **Klausur zuerst.** Altklausuren, Probeklausuren, Beispielfragen und Hinweise des Profs bestimmen, was wichtig ist. Folien werden nur gezielt gelesen.
- **Text statt PDF.** Erst Text extrahieren, dann nur Text lesen. Seiten als Bild nur ansehen, wenn dort eine wichtige Grafik oder Formel ohne Text steht.
- **Eine Rückfrage, nicht zehn.** Alles selbst klären, was die Dateien hergeben. Am Ende eine gebündelte Frage.
- **Nichts erfinden.** Was nicht belegt ist, als Schätzung markieren.
- Mit dem Studenten in seiner Sprache reden, kurz. Inhalte später in der Sprache des Materials.

`$SKILL` = der Ordner, in dem diese SKILL.md liegt (in Claude Code `${CLAUDE_SKILL_DIR}`). Skripte: `$SKILL/scripts/`. Validator und Build liegen im Nachbar-Skill: `$SKILL/../lernly-trainer-bauen/scripts/`.

## 0. Arbeitsort klären

- **Ordnerzugriff** (Cowork, Claude Code): Kursordner = der Ordner, den der Student nennt oder freigegeben hat. Arbeitsordner = `<Kursordner>/_lernly/`.
- **Chat mit hochgeladenen Dateien:** Lege einen Arbeitsordner an (z. B. `lernly-<kurs>/`), kopiere die Dateien hinein und arbeite dort. Gib den fertigen Trainer am Ende als Datei zum Herunterladen aus.
- **Schon eingerichtet?** Gibt es `_lernly/kurs.json`, nicht neu anfangen: zeig den Stand und biete `/lernly:kurs-aktualisieren` oder `/lernly:trainer-bauen` an. Lädt der Student eine `Lernly-Trainer.html` hoch, stelle die Kursdateien daraus wieder her: `python3 "$SKILL/../lernly-trainer-bauen/scripts/build_trainer.py" --unpack Lernly-Trainer.html --to _lernly`.

## 1. Inventar

```bash
python3 "$SKILL/scripts/inventory.py" "<Kursordner>" --out "<Kursordner>/_lernly/inventar.md"
```
Lies `inventar.md`. Die Rollen (Altklausur, Übung, Folien …) sind aus Dateinamen geraten. Wo der Name nichts sagt (z. B. `2021.pdf`), entscheidet später die erste Seite.

## 2. Text extrahieren

```bash
python3 "$SKILL/scripts/extract_text.py" "<Kursordner>"
```
Schreibt `_lernly/text/<Datei>.txt` mit `=== Seite N ===` und `_lernly/text/_uebersicht.md` (Seiten, Zeichen, ≈ Tokens, Seiten mit wenig Text). Bereits extrahierte Dateien werden übersprungen.
- Kein PDF-Werkzeug? In der Sandbox `pip install pypdf` und erneut starten. Geht das nicht, PDFs direkt lesen, aber nur die nötigen Seiten.
- Alte Formate (`.ppt`, `.doc`, `.key`) und verschlüsselte PDFs: dem Studenten in der Rückfrage sagen, dass er sie als PDF exportieren soll.

## 3. Klausurbelege finden und gründlich lesen

1. Rollen prüfen, wo unklar: nur die ersten ~40 Zeilen der Textdatei lesen.
2. Ordner, die offensichtlich zu einem anderen Fach gehören oder als „nicht klausurrelevant“ markiert sind, ausklammern und in der Rückfrage nennen.
3. **Komplett lesen:** alle Altklausuren, Probeklausuren, Beispielfragen und deren Lösungen. Das ist meist wenig Text und der wertvollste.
4. **Gezielt suchen** in allen Textdateien statt alles zu lesen:
   ```bash
   grep -rn -i -E "klausur|prüfung|exam|points|punkte|hilfsmittel|formelsammlung|formula sheet|calculator|taschenrechner|relevant|wichtig|will be asked|kommt dran|bonus" "<Kursordner>/_lernly/text" --include="*.txt" | head -80
   ```
   Dazu Agenda-, Inhalts- und Zusammenfassungsfolien jeder Vorlesung lesen (meist die ersten und letzten Seiten).
5. Pro Altklausur notieren: Aufgabe, Thema, Punkte, Aufgabentyp (rechnen, erklären, MC, Fall). Dann über alle Klausuren zählen: Was kommt wie oft mit wie vielen Punkten?

## 4. Bauplan und Themen

Erstelle `_lernly/kurs.json` nach `references/kursprofil.md`:
- `exam`: Dauer, Punkte, Hilfsmittel, Aufbau (`parts` mit `slots`), `fidelity` (strict / likely / broad, ehrlich).
- `topics`: Lerneinheiten, die den Slots zugeordnet sind, mit `expectedPoints`, `tier`, `why`, `effort`, `sources` (Datei + Folien/Seiten).
  - Stufe 1: die Themen, die zusammen ca. 70 % der Punkte bringen, mit gutem Verhältnis Punkte zu Aufwand.
  - Folienbereiche pro Thema über die Agenda und `grep` nach Schlüsselbegriffen finden, nicht durch Lesen aller Folien.
- `strategy`: der schnellste Weg zur guten Note für genau diese Klausur (2–4 Sätze oder kurze Liste).
- `subjectType` und `language` (Sprache des Materials).
- `notation`: Symbole und Begriffe des Profs.

Prüfen:
```bash
python3 "$SKILL/../lernly-trainer-bauen/scripts/validate.py" "<Kursordner>/_lernly"
```
(Hinweise „Themen ohne Datei“ sind an dieser Stelle normal.)

Mit Ordnerzugriff zusätzlich `<Kursordner>/00_LERNLY.md` schreiben: kurze, lesbare Fassung des Bauplans (Tabelle Aufgabe · Punkte · Thema · Stufe), Quellen und der Hinweis, dass die Kursdaten in `_lernly/` liegen. Höchstens eine Seite.

## 5. Eine Rückfrage

Zeig den Bauplan kompakt (Tabelle: Aufgabe · Punkte · Thema · Stufe) und frag **einmal**, gebündelt:
- Stimmt der Aufbau? Fehlt ein Thema, das der Prof angekündigt hat?
- Klausurdatum (falls nicht gefunden) und Hilfsmittel (falls unklar).
- Ausgeklammerte Ordner/Dateien: richtig so?

Korrigiere `kurs.json` nach der Antwort. Dann direkt weiter mit dem Skill **lernly-trainer-bauen** (wenn der Student zustimmt) oder auf `/lernly:trainer-bauen` hinweisen.

## Token-Regeln

- Nie ganze Foliensätze lesen. Erst `_uebersicht.md`, dann `grep`, dann gezielt Seitenbereiche (`sed -n '/=== Seite 46 ===/,/=== Seite 65 ===/p' datei.txt`).
- Bilder nur für Seiten mit wenig Text, die laut Bauplan Punkte bringen.
- Keine Inhalte in den Chat kopieren. Ergebnisse stehen in Dateien, im Chat nur kurze Zusammenfassungen.
