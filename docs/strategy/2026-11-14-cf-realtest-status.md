# Corporate-Finance-Kurstest: Fortsetzung am 14. November 2026

**Ergebnis:** Die Fortsetzung wurde tatsächlich angestoßen, aber vor einem Modellaufruf vom Claude-Nutzungslimit abgewiesen. Der echte Kurstest ist nicht abgeschlossen. Keine Aussage über die Qualität eines daraus erzeugten Trainers ist bisher möglich.

**Versuchsbedingungen.** Bestehende Sitzung `5915a027-1978-42cd-af7c-7fdcc9fb7bbe` und dieselbe isolierte Rohmaterialkopie weiterverwendet. Plugin: `/Users/rdb/lernly/plugin/lernly`, Branch `feat/lernly-plugin-phase0`, Commit `e8b0c79`. Benutzer-Hooks für diesen Aufruf über `disableAllHooks` deaktiviert, Auto-Memory deaktiviert, nur lokale Settings geladen, keine zusätzlichen MCP-Server. Die globalen Hooks wurden nicht verändert. Der Claude-Prozess wurde beauftragt, erst den Bauplan fertigzustellen und die gebündelte Rückfrage zu stellen, noch keinen Trainer zu bauen.

Testkopie und Laufprotokolle:

```text
/private/tmp/claude-501/-Users-rdb--claude-spares-spare-QeXzaN/9254ee3f-f88b-402a-88a2-7eeb4f25813d/scratchpad/realtest/
  cf/                 Rohmaterialkopie und vorhandene Extraktion
  run1.json           Ursprünglicher abgebrochener Modelllauf
  run2.json           Jetzt versuchte Fortsetzung
  run2.err
```

**Beobachtete Laufwerte.**

| Wert | Ursprünglicher Lauf | Fortsetzung |
|---|---:|---:|
| Laufzeit laut Ergebnis | 140.023 ms | 781 ms |
| Schritte (`num_turns`) | 30 | 1 |
| Ausgewiesene Kosten | 0,99172 USD | 0 USD |
| Ausgabe-Tokens | 9.693 | 0 |
| Cache-Erstellung | 145.437 Tokens | 0 |
| Cache-Lesezugriffe | 1.564.790 Tokens | 0 |
| API-Ausführungszeit | 134.547 ms | 0 ms |

Die Fortsetzung meldet `is_error: true` und `You've hit your limit · resets 5am (Europe/Berlin)`. Das äußere Ergebnisfeld `subtype: success` ist hier kein erfolgreicher Kurstest. Der Versuch fand gegen 01:24 Uhr Berliner Zeit statt, also vor dem genannten Reset am selben Tag. Ausgewiesene Modellkosten sind nicht automatisch eine zusätzlich abgebuchte Zahlung beim verwendeten Abonnement.

**Vorhandene Ergebnisse des echten Kurses.** 20 Rohdateien; Inventar und 16 extrahierte PDF-Texte vorhanden. Laut Extraktionsübersicht circa 182.883 Zeichen bzw. 45.720 geschätzte Tokens. Noch kein `_lernly/kurs.json`, keine erzeugten Themen und keine `Lernly-Trainer.html`. Der Bauplan konnte deshalb nicht mit der vorbereiteten Referenz verglichen werden.

**Zusätzliche Befunde aus den vorhandenen Dateien.**

- `Julius Finance/Exam 2020.pdf` und `Julius Finance/ft20_2.pdf` sind nach SHA-256 identisch. Sie dürfen bei Klausurhäufigkeiten nicht als zwei unabhängige Prüfungen zählen. Noch nicht geprüft ist, ob Claude diese Dopplung im fertigen Bauplan selbst erkennen würde.
- `CBRE Valuation Report.pdf` konnte im ursprünglichen Lauf nicht extrahiert werden; die Übersicht nennt eine verschlüsselte PDF. Ob eine andere vorhandene Extraktionsmethode helfen würde, wurde nicht getestet.
- Drei Excel-Arbeitsmappen sind im Inventar, aber nicht im extrahierten Textbestand. Der aktuelle Extraktor unterstützt `.xlsx` nicht. Eine vollständige Verarbeitung der 20 Rohdateien ist daher nicht belegt. Direkte zusätzliche Excel-Auswertung durch Claude wäre gesondert zu beobachten.
- Das Inventar enthält unbekannte PDF-Seitenzahlen; die spätere Extraktionsübersicht enthält die ermittelten Zahlen. Die Inventarzeile „0 Seiten/Folien (soweit zählbar)“ darf nicht als leeres Material interpretiert werden.

**Unabhängiger technischer Kontrolllauf.** Der vorhandene Beispielkurs unter `plugin/.test/testkurs/_lernly` wurde mit dem Validator geprüft und erneut gebaut: keine Validierungsfehler, ein Hinweis auf vier noch fehlende Themen. Ergebnis: zwei Themen, fünf Aufgaben, fünf Karten und eine Probeklausur, circa 97 KB. Ausgabe nach `/private/tmp/lernly-test-continuation/fixture-trainer.html`. Dieser Beispielkurs ist kein neu von Claude aus den Rohunterlagen erzeugtes Ergebnis und zählt deshalb nicht als erfolgreicher Corporate-Finance-Kurstest. Keine Browser-/Mobilprüfung eines echten Kurstrainers durchgeführt, weil dieser noch fehlt.

**Fortsetzung nach verfügbarem Kontingent.**

1. Dieselbe Sitzung mit der Rohmaterialkopie fortsetzen; den Bauplan samt Quellen, Punkten und Häufigkeiten fertigstellen lassen.
2. Ergebnis unabhängig mit `00_COURSE_OVERVIEW.md` vergleichen; insbesondere Dublette, Wahlaufgaben, Corporate-Finance-/Real-Estate-Aufteilung und nicht verarbeitete Dateien berücksichtigen. Claude bekommt die vorbereitete Referenz weiterhin nicht.
3. Als Student die gebündelte Rückfrage beantworten, ohne Claude fehlende Prüfungsinhalte aus der Referenz vorzusagen. Datum/Lernzeit als Testannahmen kennzeichnen.
4. Trainer erzeugen, Prompts und Laufwerte protokollieren, Zahlen und Quellen stichprobenartig unabhängig nachrechnen.
5. Fertigen Trainer im Browser auf Desktop und bei 380 px testen: Navigation, Rechenantworten, Karten, Probeklausur, Speichern/Wiederladen und Exporte.

Ein neuer Lauf nach 5 Uhr wurde nicht eingeplant und ist nicht als Hintergrundprozess aktiv. Keine Änderungen an Plugin-Code, Originalmaterialien, globalen Hooks oder Produktion vorgenommen.
