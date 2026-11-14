# Qualitäts-Check vor dem Speichern eines Themas

Kurz durchgehen, bevor `validate.py` läuft. Der Student bessert nicht nach, also muss es beim ersten Mal stimmen.

## Inhalt
- [ ] Alles steht so in den Unterlagen (Folien, Skript, Altklausur, Lösung). Nichts dazuerfunden. Was fehlt, steht als „nicht in deinen Unterlagen“ da oder fehlt ganz.
- [ ] Notation, Begriffe und Rechenweg wie beim Prof (`kurs.json.notation`), nicht wie im Lehrbuch.
- [ ] Jede Altklausur-Aufgabe zu diesem Thema ist drin, mit Originalzahlen und richtiger Lösung.
- [ ] Alle Zahlen in `drill`, Tabellen und Lösungen mit Python nachgerechnet. Toleranzen passen zu den Rundungen.
- [ ] `standardAnswer` holt die Punkte der Checkliste: jedes Punkte-Wort ist mit `==…==` markiert.
- [ ] `source` nennt Folien oder Seiten, damit man nachschlagen kann.

## Lernbarkeit (überforderter Student, Handy, kurz vor der Klausur)
- [ ] Erster Baustein ist `simple`: in Alltagssprache, ohne Fachwörter, 2–4 Sätze.
- [ ] Ein konkretes Beispiel mit Zahlen oder aus dem Alltag.
- [ ] Rechenthemen haben ein Rezept in Schritten (`steps`), das man in der Klausur abarbeiten kann.
- [ ] Kurze Sätze. Keine Textwände. Ein Absatz = ein Gedanke.
- [ ] `mistakes` nennt die echten Fallen (aus Lösungen, Korrekturhinweisen, typischen Rechenfehlern).
- [ ] Karten fragen genau eine Sache ab und sind in 10 Sekunden beantwortbar.

## Format
- [ ] Nur Markdown-light und LaTeX, kein HTML, keine Emojis.
- [ ] LaTeX-Backslashes im JSON verdoppelt.
- [ ] IDs mit Themen-Präfix, stabil (bei Updates nie ändern).
- [ ] Inhaltssprache = `kurs.json.language`.
