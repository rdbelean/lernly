# Lernly-Inhaltsformat v1 (kompakt)

Ein Kurs liegt im Ordner `_lernly/`:

```
_lernly/
  kurs.json                 Kursprofil (siehe lernly-kurs-einrichten/references/kursprofil.md)
  themen/<topic-id>.json    ein Thema pro Datei, Dateiname = id
  probeklausuren/<id>.json  eine Probeklausur pro Datei
  spickzettel.json
```

Allgemein:
- Reines JSON, UTF-8. **Jeder LaTeX-Backslash doppelt:** `"\\frac{a}{b}"`, `"\\(x\\)"`. Einfache Backslashes zerstören die Formel (`\f`, `\b`, `\t`, `\n`, `\r` sind JSON-Steuerzeichen).
- Texte (`md`) sind **Markdown-light**: `**fett**`, `*kursiv*`, `==Schlüsselwort==` (markiert Punkte-Wörter), `` `code` ``, Listen mit `- ` oder `1. `, Leerzeile = neuer Absatz. **Kein HTML.**
- Formeln im Text: `\\( … \\)` (Zeile) und `\\[ … \\]` (Block). Kein `$`.
- IDs: kleingeschrieben, `a-z 0-9 -`, stabil. Nie umbenennen, sonst geht Lernfortschritt verloren. Aufgaben- und Karten-IDs sind im ganzen Kurs eindeutig: Präfix = Themen-ID (`dcf-ex23`, `dcf-c1`).
- Inhaltssprache = Sprache des Materials (`kurs.json.language`). Die Oberfläche des Trainers ist immer Deutsch.

## Thema: `themen/<id>.json`

```json
{
 "schema": "lernly.thema/1",
 "id": "dcf",
 "theory": [Block, …],
 "standardAnswer": [Block, …],
 "tasks": [Task, …],
 "cards": [{"id": "dcf-c1", "front": "md", "back": "md"}],
 "mistakes": ["md", …],
 "hook": "md",
 "source": "md"
}
```

- `theory` (Pflicht): einfach erklärt → Beispiel → Grafik/Tabelle → Rezept → Formeln → durchgerechnetes Altklausur-Beispiel.
- `standardAnswer`: was man in der Klausur genau so hinschreibt, in Klausurlänge, Punkte-Wörter mit `==…==`. Pflicht für Stufe-1-Themen mit Text- oder Rechenaufgabe.
- `mistakes`: typische Fehler, je ein Satz. `hook`: Merkhilfe (Eselsbrücke, Kette). `source`: Folien/Seiten, z. B. „Folien 46–64, Altklausur 2023 Q2“.
- `cards`: nur, was man 1:1 hinschreiben muss (Formeln, Definitionen, Listen, Gliederungen). 3–12 pro Thema.

## Bausteine (Block)

| type | Felder | Zweck |
|---|---|---|
| `simple` | `md` | „Einfach gesagt“: Alltagssprache, ohne Fachwörter |
| `example` | `md` | Beispiel mit Zahlen oder Alltag |
| `text` | `md` | normaler Text |
| `heading` | `text` | Zwischenüberschrift |
| `remember` | `md` | „Merke“: der eine Satz, der hängen bleiben muss |
| `steps` | `items: [md]`, optional `title` | nummeriertes Rezept |
| `formula` | `tex: ["…"]`, optional `note` | Formelblock, **ohne** `\\(`-Begrenzer |
| `table` | `head: [md]`, `rows: [[md]]`, optional `sumRows: [Zeilenindex]` | Tabelle; Zahlen rechtsbündig |
| `figure` | `svg`, optional `caption` | Grafik als SVG (wird als Bild gezeigt) |
| `model_answer` | `md`, optional `title` | Musterantwort-Kasten |
| `more` | `title`, `md` | aufklappbarer Zusatz (Varianten, Details) |

**SVG-Regeln:** `<svg viewBox="0 0 680 H" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Arial, sans-serif">`, Breite 680, helle Farben auf hellem Grund (wird auf hellem Kasten gezeigt): Text `#1D2733`, gedämpft `#5E6B7B`, Linien `#C9D4DF`, Akzent `#2B3499` / Fläche `#E4E7FB`, Warnung `#B5651D` / `#FDEFD9`, gut `#2F7A55` / `#E2F1E8`. Kein Skript, keine Links, kein `foreignObject`. Schrift ≥ 12. Lieber einfach als vollgepackt.

## Aufgaben (Task)

Gemeinsam: `id`, `kind`, `name` (md), `origin`, optional `originLabel` (z. B. „Altklausur 2023, Q2 (15 P)“), optional `hint`.
`origin`: `altklausur` | `probeklausur` (Probe-/Beispielklausur, Sample Questions) | `uebung` | `folie` | `neu`.
Echte Altklausur-Aufgaben kommen **immer** mit ihren Originalzahlen rein.

**Rechnen `drill`:**
```json
{"kind": "drill", "id": "dcf-growth", "name": "…", "origin": "neu",
 "variants": [{
   "text": "Aufgabenstellung (md)",
   "fields": [{"label": "Firm value", "answer": 5559.84, "rel": 0.005, "unit": "m"}],
   "choice": {"label": "Decision", "options": ["buy", "sell"], "answer": "buy"},
   "solution": [Block, …]
 }]}
```
- `answer` ist eine Zahl (Punkt als Dezimaltrenner). Toleranz: `rel` (relativ, Standard 0,5 %) oder `tol` (absolut). Prozent: in Prozentpunkten speichern (`7.5`, `"unit": "%"`).
- `origin: "neu"` → **3–5 Varianten** mit anderen Zahlen (der Trainer wechselt sie). Altklausur: 1 Variante.
- **Alle Zahlen mit Python berechnen**, nie im Kopf. Lösungsweg Schritt für Schritt (`steps` oder `table`).
- `choice` optional, für Entscheidungen (kaufen/verkaufen, annehmen/ablehnen).

**Text `essay`:**
```json
{"kind": "essay", "id": "emh-strong", "name": "…", "origin": "altklausur", "points": 10,
 "question": "md", "checklist": [{"text": "md", "points": 2}], "modelAnswer": [Block]}
```
- Checkliste = wo die Punkte liegen. Summe = `points`. Je Zeile ein prüfbarer Punkt mit Schlüsselwort.

**Multiple Choice `mc`:**
```json
{"kind": "mc", "id": "dcf-traps", "name": "…", "origin": "neu",
 "questions": [{"q": "md", "options": ["md", …], "answer": 1, "explain": "md"}]}
```
- `answer` = Index ab 0. `explain`: warum richtig und warum die Falle falsch ist.

## Probeklausur: `probeklausuren/<id>.json`

```json
{"schema": "lernly.probeklausur/1", "id": "a", "name": "Probeklausur A", "subtitle": "…",
 "durationMin": 60, "totalPoints": 60,
 "items": [
  {"id": "a1", "no": "Q1", "partId": "I", "topicId": "emh", "points": 10, "type": "open",
   "question": "md", "checklist": [{"text": "md", "points": 2}], "solution": [Block]},
  {"id": "a5", "no": "Q5", "partId": "I", "topicId": "agency", "points": 10, "type": "open",
   "choiceGroup": "q5q6", "question": "…", "checklist": […], "solution": […]},
  {"id": "a7", "no": "MC", "partId": "II", "topicId": "re-basics", "points": 3, "type": "mc",
   "question": "Kreuze an.", "questions": [{"q": "…", "options": […], "answer": 0, "explain": "…"}]}
 ]}
```
- Aufbau, Punkte und Dauer wie die echte Klausur (aus `kurs.json.exam`). Wahlaufgaben mit gleicher `choiceGroup`.
- Neue Fälle und Zahlen, keine Kopie von Altklausuren (die stehen schon in den Themen).
- `type: "mc"`: jede Frage 1 Punkt, `points` = Anzahl Fragen. `totalPoints` zählt jede Wahlgruppe einmal.

## Spickzettel: `spickzettel.json`

```json
{"schema": "lernly.spickzettel/1", "intro": "md (optional)",
 "sections": [{"title": "DCF", "topicId": "dcf", "blocks": [Block]}]}
```
Nur, was man aus dem Kopf können muss. Kurz: Formeln (`formula`), Listen, Gliederungen.

## Prüfen und bauen

```bash
python3 <skill>/scripts/validate.py _lernly --file themen/dcf.json   # ein Thema prüfen
python3 <skill>/scripts/build_trainer.py _lernly                      # Lernly-Trainer.html bauen
```
Fehler nur an der gemeldeten Stelle korrigieren, nicht die ganze Datei neu schreiben.
