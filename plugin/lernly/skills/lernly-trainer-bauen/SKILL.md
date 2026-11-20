---
name: lernly-trainer-bauen
description: Baut aus einem eingerichteten Lernly-Kurs (_lernly/kurs.json) den Klausur-Trainer. Claude schreibt Thema für Thema nur Inhalte im kompakten JSON-Format (Theorie, Standardantwort, Rechenaufgaben mit Varianten, Textaufgaben mit Punkte-Checkliste, MC, Karteikarten), danach Probeklausur und Spickzettel; ein Skript setzt alles in die fertige Trainer-Oberfläche (eine HTML-Datei). Nutzen nach lernly-kurs-einrichten, bei /lernly:trainer-bauen, oder wenn jemand für einen eingerichteten Kurs Lernmaterial, Übungen oder Karteikarten will.
---

# Lernly: Trainer bauen

Die Oberfläche ist fertig (`assets/trainer.html`). **Du schreibst nie HTML, CSS oder JavaScript.** Du schreibst nur Inhalte als JSON in `_lernly/`. Das spart den Großteil der Tokens und macht jeden Trainer gleich gut.

`$SKILL` = der Ordner, in dem diese SKILL.md liegt (in Claude Code `${CLAUDE_SKILL_DIR}`). `_lernly` = Arbeitsordner des Kurses.

## Vorher

1. `_lernly/kurs.json` muss existieren. Sonst zuerst den Skill **lernly-kurs-einrichten**.
2. Lies einmal: `$SKILL/references/format.md` (Format, Pflicht), `$SKILL/references/fachtypen.md` (Mischung), `$SKILL/references/qualitaet.md` (Check). Schau dir `$SKILL/references/beispiel-dcf.json` an: So gut muss jedes Thema werden.
3. Prüfe, was schon da ist (`ls _lernly/themen _lernly/probeklausuren`). Vorhandene Themen nicht neu schreiben, außer der Student will es.

Argumente des Befehls: keine = alles Fehlende bauen · Themen-IDs = nur diese · `weiter` = mit dem nächsten fehlenden Thema fortsetzen · `spickzettel` · `probeklausur`.

## Reihenfolge

1. **Stufe-1-Themen**, nach `expectedPoints` absteigend.
2. **Trainer bauen** (siehe unten), damit der Student sofort anfangen kann. Kurz Bescheid geben.
3. Stufe-2-Themen, dann Stufe 3.
4. **Probeklausur A** (`probeklausuren/a.json`) im echten Klausurformat.
5. **Spickzettel** (`spickzettel.json`).
6. Trainer neu bauen.

## Pro Thema

1. **Gezielt lesen:** die Altklausur-Aufgaben und Lösungen zu diesem Thema (aus der Einrichtung bekannt) und die Folienbereiche aus `topics[].sources`:
   ```bash
   sed -n '/=== Seite 46 ===/,/=== Seite 65 ===/p' "_lernly/text/<Datei>.txt"
   ```
   Seiten mit wenig Text (Grafik, Formel als Bild) nur dann als Bild ansehen, wenn sie für das Thema wichtig sind.
2. **Zahlen rechnen lassen:** Für jede Rechenaufgabe, Tabelle und Lösung die Werte mit Python berechnen. Für `origin: "neu"` 3–5 Varianten mit sinnvollen anderen Zahlen erzeugen (auch mal mit anderem Ergebnis, z. B. „verkaufen“ statt „kaufen“).
3. **Datei schreiben:** `_lernly/themen/<id>.json` in einem Zug, direkt als Datei. Nicht in den Chat schreiben.
4. **Prüfen:**
   ```bash
   python3 "$SKILL/scripts/validate.py" _lernly --file themen/<id>.json
   ```
   Fehler nur an der gemeldeten Stelle korrigieren (gezielt ersetzen, nicht die Datei neu schreiben). Hinweise ernst nehmen, wenn sie die Qualität betreffen.
5. **Im Chat nur eine Zeile:** „DCF fertig: 4 Aufgaben (2 aus Altklausuren), 4 Karten. Weiter mit …“

## Inhalt: Tax-Mock-Trainer-Tiefe statt oberflächlicher Zusammenfassungen

Jedes Stufe-1- und Stufe-2-Thema braucht echte Klausur-Tiefe (Vorbild: `Tax Mock Trainer` & `Corporate Finance`). Keine kurzen Lehrbuch-Zusammenfassungen! Pflichtbestandteile pro Thema (`themen/<id>.json`):

- **Einfach gesagt (`simple`):** 2–4 Sätze Alltagssprache für die Intuition.
- **Klausur-Sachverhalt / Ausgangsfall (`example`):** Realistischer Fall oder Zahlenaufbau aus Altklausur/Übung mit hervorgehobenen Signalwörtern (`==…==`), damit klar ist, worauf man im Sachverhalt zuerst achtet.
- **Schritt-für-Schritt-Schema mit „Woher kommt die Zahl / Regel?“ (`steps` + `table` / `formula`):** Nummeriertes Rechen- oder Prüfungsschema. Zu **jedem** Schritt gehören: (1) exakter Rechenschritt / Formel / Paragraf bzw. Regel und (2) **„Woher kommt die Zahl / Regel?“** (Rückführung auf Sachverhalt, Tabelle, Formel oder Folie + Seite).
- **Merke-Box (`remember`) & Klausurfalle (`mistakes`):** Ein prägnanter Merksatz plus typische Fehler aus Korrekturhinweisen (Vorzeichen, falsche Perioden, Einheiten, vergessene Hinzurechnungen).
- **Mustersätze (`standardAnswer` + `model_answer`):** Ausformulierte klausurfertige Antwort-/Begründungssätze in Klausurlänge mit `==Punkte-Wörtern==` und Variablen.
- **Aktiv üben & Rechnen (`tasks` + `cards`):** Echte Altklausur-Aufgaben in Originalzahlen (`origin: "altklausur"`), `drill` mit **3–5 realistischen Zahlenvarianten** (`origin: "neu"`) mit Python (`lernly_calculate`) nachgerechnet, `essay` mit feingranularer Punkte-Checkliste, `mc` mit nachvollziehbarer Erklärung warum die Falle falsch ist, und 4–12 gezielte Karteikarten.
- **Streng belegt & sauber:** Quelle mit Dateiname + Seite/Folie nennen (`source`). Inhaltssprache = `kurs.json.language`; Oberfläche und Rückfragen Deutsch. Keine Emojis.

## Probeklausur

- Aufbau, Punkte, Dauer, Wahlaufgaben wie `kurs.json.exam`. `partId` und `topicId` setzen, damit der Trainer pro Thema auswertet.
- Neue Fälle und Zahlen (mit Python gerechnet), Schwierigkeit wie die Altklausuren.
- Lösungen mit Punkte-Checkliste, Schritt-für-Schritt-Rechnung („Woher kommt die Zahl / Regel?“) und Mustersätzen, so wie ein Korrektor bewerten würde.

## Spickzettel

Eine Sektion pro Stufe-1/2-Thema: die Formeln, Prüfungsschemata, Paragrafen und Gliederungen, die aus dem Kopf sitzen müssen. Keine langen Erklärtexte.

## Trainer bauen & Web-Dashboard-Sync (`lernly-app.de`)

```bash
python3 "$SKILL/scripts/build_trainer.py" _lernly
```
Erzeugt `_lernly/output/Lernly-Trainer.html` (bzw. `Lernly-Trainer.html` neben `_lernly/`, oder mit `--out <Pfad>`). Der Build bricht bei Fehlern ab und nennt sie.

Im MCP-Connector danach:
1. **`lernly_sync_web_course`** aufrufen, um den Kurs direkt in das Lernly Web-Dashboard (`lernly-app.de/dashboard`) zu synchronisieren (falls ein Sync-Token hinterlegt oder vom Nutzer angegeben wurde).
2. **`lernly_build_trainer`** aufrufen, um die lokale Offline-HTML-Datei unter `_lernly/output/Lernly-Trainer.html` zu bauen.

Danach dem Studenten kurz sagen:
- Falls gesynct: Der Kurs ist sofort auf **lernly-app.de/dashboard** live gespeichert.
- Lokal liegt die Offline-Datei unter `_lernly/output/Lernly-Trainer.html` (Fortschritt im lokalen Browser bleibt lokal; Web-App speichert dauerhaft).

## Wenn der Platz knapp wird

Lange Kurse passen nicht immer in eine Unterhaltung. Dann nach einem fertigen Thema stoppen, Trainer bauen und sagen: „Weiter in einem neuen Chat mit `/lernly:trainer-bauen weiter`.“ Mit Ordnerzugriff liegt alles in `_lernly/`; im Chat lädt der Student die `Lernly-Trainer.html` hoch, aus der `build_trainer.py --unpack` die Dateien wiederherstellt.
