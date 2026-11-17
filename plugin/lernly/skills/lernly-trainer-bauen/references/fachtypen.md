# Fachtypen: welche Mischung pro Thema

`kurs.json.subjectType` bestimmt die Grundmischung. Pro Thema zählt aber, **wie die Klausur dieses Thema abfragt** (Bauplan). Ein Rechenthema in einem Verstehen-Kurs bekommt trotzdem Rechenaufgaben.

| Typ | Beispiele | Theorie | Aufgaben pro Thema | Karten |
|---|---|---|---|---|
| **rechnen** | Mathe, Statistik, Finance, Kostenrechnung, Ökonometrie, Physik | kurz: Idee, Rezept in Schritten, Formeln, durchgerechnetes Altklausur-Beispiel | **Schwerpunkt.** Alle Altklausur-Rechnungen (Originalzahlen) + pro Rechenmuster ein `drill` mit 3–5 neuen Varianten. 1 `mc` zu typischen Fallen | Formeln, die ohne Formelsammlung sitzen müssen |
| **verstehen** | Marketing, Organisation, Management, Recht (Grundlagen), VWL-Konzepte | **Schwerpunkt.** Modelle und Begriffe einfach erklärt, Tabelle oder Grafik pro Modell, Abgrenzungen („A vs. B“), Praxisbeispiel | `mc` mit guten Fallen (2–3 pro Thema), 1 `essay` für „Erkläre/Vergleiche“ | **Schwerpunkt.** Definitionen, Modelle mit ihren Teilen, Listen (4P, Porter, …), 6–12 pro Thema |
| **argumentieren** | Strategie, Ethik, Fallstudien, Essays, Politik, Soziologie | Argumentationsgerüst, Pro/Contra-Tabelle, Bewertungskriterien | **Schwerpunkt.** `essay` mit Punkte-Checkliste und ausformulierter Musterantwort, in Klausurlänge | Gliederungen und Argument-Listen |
| **gemischt** | BWL-Klausuren mit Rechen- und Textteil | je Thema nach Aufgabentyp im Bauplan | je Thema nach Aufgabentyp | je Thema |

## Regeln für alle Typen

- **Altklausur zuerst:** Jede Altklausur-Aufgabe zum Thema kommt als Aufgabe mit `origin: "altklausur"` rein. Sie sind das wertvollste Material.
- **Standardantwort** (`standardAnswer`) für jedes Stufe-1-Thema: genau der Text, der in der Klausur die Punkte holt, in Klausurlänge (Faustregel: ca. 1 Minute bzw. 10–12 Wörter pro Punkt).
- **Auswendig nur, was 1:1 hingeschrieben wird.** Rechenwege übt man mit `drill`, nicht mit Karten.
- **Wahlaufgaben** (`pairWith` im Kursprofil): beide Themen bauen, aber das leichtere zuerst und gründlicher.
- **Stufe 3** bekommt nur das Nötigste: kurze Theorie, Standardantwort, 1 Aufgabe.

## Umfang pro Thema (Richtwert)

| Stufe | Theorie-Bausteine | Aufgaben | Karten |
|---|---|---|---|
| 1 | 6–10 | 3–6 | 3–12 |
| 2 | 4–7 | 2–4 | 3–8 |
| 3 | 2–4 | 1–2 | 0–4 |
