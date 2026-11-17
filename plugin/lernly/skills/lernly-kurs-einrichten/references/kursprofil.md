# Kursprofil: `_lernly/kurs.json`

Das Kursprofil ist das Gedächtnis des Kurses: Bauplan der Klausur, Themen mit Punkten und Stufen, Quellen. Alles Weitere baut darauf auf.

```json
{
 "schema": "lernly.kurs/1",
 "id": "corporate-finance",
 "title": "Corporate Finance & Valuation",
 "subtitle": "Klausur WS 2026/27 · Teil I",
 "language": "en",
 "subjectType": "gemischt",
 "exam": {
  "date": "2026-12-04", "time": "09:00",
  "durationMin": 60, "totalPoints": 60,
  "aids": "Taschenrechner, keine Formelsammlung",
  "format": "Fünf Pflichtaufgaben, bei Q5/Q6 eine wählen.",
  "fidelity": "strict",
  "parts": [{"id": "I", "name": "Corporate Finance", "points": 60, "slots": [
   {"id": "q1", "label": "Q1", "name": "Market efficiency", "points": 10, "frequency": "5 von 5 Altklausuren"},
   {"id": "q2", "label": "Q2", "name": "DCF → equity → buy/sell", "points": 15, "frequency": "5 von 5"},
   {"id": "q5", "label": "Q5", "name": "Agency conflict", "points": 10, "choiceGroup": "q5q6", "frequency": "3 von 5"},
   {"id": "q6", "label": "Q6", "name": "CFA ethics case", "points": 10, "choiceGroup": "q5q6", "frequency": "3 von 5"}]}]
 },
 "strategy": "md: der schnellste Weg zur guten Note, 2–4 Sätze oder eine kurze Liste",
 "topics": [
  {"id": "dcf", "title": "DCF → equity value → buy or sell", "slotIds": ["q2"],
   "expectedPoints": 15, "tier": 1, "why": "5 von 5 Altklausuren, immer gleiches Muster",
   "effort": "mittel", "sources": "Folien 46–64 (Datei: Lecture 3.pdf), Addendum II"},
  {"id": "agency", "title": "Agency conflicts", "slotIds": ["q5"], "expectedPoints": 10, "tier": 2,
   "why": "Wahlaufgabe", "effort": "mittel", "pairWith": "ethics", "sources": "Folien 86–89"}
 ],
 "notation": "WACC, k_E, k_D, D/E; Beträge in Mio. (m)",
 "sources": [{"file": "Altklausuren/Exam 2023.pdf", "kind": "altklausur", "pages": 3, "note": "mit Lösung"}],
 "updatedAt": "2026-11-14"
}
```

## Felder

- `language`: Sprache des **Materials** (Mehrheit der Folien/Altklausuren), nicht des Studenten. Bestimmt die Sprache aller Inhalte.
- `subjectType`: `rechnen` | `verstehen` | `argumentieren` | `gemischt` (siehe `lernly-trainer-bauen/references/fachtypen.md`).
- `exam.fidelity`:
  - `strict`: mindestens 2 Altklausuren mit wiederkehrendem Muster. Punkte und Häufigkeit sind belegt.
  - `likely`: 1 Altklausur, Beispielfragen oder klare Hinweise des Profs („Formulas will not be provided“, „Aufgabe 1 ist immer …“).
  - `broad`: keine Klausurbelege. Gewichtung aus Folienanteil und Betonung geschätzt. In `strategy` ehrlich sagen.
- `exam.parts[].slots[]`: die Aufgabenplätze der Klausur (Q1, Q2 …, „Teil B Aufgabe 3“, „MC-Block“) mit Punkten und Häufigkeit über die Altklausuren. Ohne Altklausur: grobe Blöcke (z. B. „Rechenaufgaben“, „Verständnisfragen“) mit geschätzten Punkten.
- `topics[]`: Lerneinheiten, die zu Slots passen. Ein Slot kann mehrere Themen haben, ein Thema mehrere Slots.
  - `expectedPoints`: erwartete Punkte dieses Themas in der Klausur. Summe ≈ `exam.totalPoints` (Wahlgruppen einmal gezählt).
  - `tier`: 1 = „sicher lernen“ (zusammen ca. 70 % der Punkte, wenig Aufwand je Punkt), 2 = „wenn Zeit ist“, 3 = „nur wenn alles sitzt“.
  - `why`: Beleg in wenigen Wörtern („4 von 5 Altklausuren“, „Prof: kommt sicher dran“, „geschätzt“).
  - `effort`: `niedrig` | `mittel` | `hoch`.
  - `pairWith`: das andere Thema einer Wahlaufgabe.
  - `sources`: Dateien und Folien/Seiten. Daraus liest `trainer-bauen` gezielt.
- `notation`: wie der Prof schreibt (Symbole, Einheiten, Begriffe), damit alles zur Klausur passt.

IDs nie umbenennen, wenn der Trainer schon benutzt wird. Neue Themen anhängen ist ok.
