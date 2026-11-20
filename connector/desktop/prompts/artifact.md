# Modus: Claude erstellt das Study OS

Erzeuge das interaktive Artifact selbst mit den in diesem Chat verfügbaren Artifact-Funktionen. Der MCP-Server kann nicht das Erstellen eines nativen Claude-Artifacts erzwingen. Falls dieser Client keine Artifacts unterstützt, sage das und biete den lokalen Lernly-Trainer an.

## Produkt und Oberfläche

- Ein ruhiges, hochwertiges Study OS: klare Navigation, kompakte Kursübersicht, Themen, Üben, Karteikarten, Probeklausur und Lernplan. Für ein kleines Materialpaket lieber weniger Bereiche vollständig ausarbeiten.
- Dunkler Hintergrund #0F1322, Flächen #141930, Text #EAEDF7, gedämpfter Text #9098B6, Indigo #2B3499. Viel Luft, gut lesbare Formeln, dezente Karten; keine Emoji-Dekoration. Mobile Navigation, bei 380 px keine horizontalen Seitenüberläufe.
- Mathematische Formeln ordentlich mit der in Artifacts verfügbaren LaTeX-Bibliothek rendern. Keine unverarbeiteten Backslash-Textblöcke. Externe Bibliotheken nur, wenn im Artifact verfügbar.
- Übersichten zeigen echte verfügbare Inhalte und beobachtete Antworten. Keine erfundenen Erfolgsquoten. Ungebaute Themen sichtbar als ausstehend markieren.

## Verhalten

- Aufgaben zuerst ohne Lösung. Optional stufenweise Hinweise. Nach Eingabe: richtig/falsch, nachvollziehbarer Rechenweg, typische Fehlannahme, ähnliche neue Aufgabe.
- Numerische Antworten erlauben Dezimalkomma und Punkt, klare Einheiten und vernünftige Toleranz. NaN, leere Eingaben und falsche Einheiten nicht als richtig behandeln.
- Karten umdrehen, selbst bewerten, fällige wiederholen; nicht bei jedem Klick Fortschritt erhöhen.
- Probeklausur mit eigenständigen Fragen, sichtbaren Punkten, Timer optional, Bewertung anhand transparenter Kriterien. Keine automatische perfekte Essay-Bewertung.
- Verwende für Inhalte stabile IDs. Für Stand speichern/laden nutze ausschließlich APIs, die in diesem Artifact tatsächlich unterstützt sind. Biete immer einen expliziten JSON-Export und -Import an; beschädigte oder fremde Kursstände ablehnen.
- Ein Artifact kann den lokalen Desktop-MCP-Server nicht einfach per fetch aufrufen. Kein erfundener localhost-Endpunkt, kein automatischer Sync. Der Chat nutzt MCP; das Artifact nutzt eingebettete Kursdaten. Für spätere Änderungen lädt Claude die Kursdateien und aktualisiert das Artifact.
- Karteikarten als TSV exportieren (Term<TAB>Definition). Anki versteht LaTeX, Quizlet in diesem Export nur Text; diese Grenze anzeigen.

## Dauerhaftes Gedächtnis & Web-Sync

Lade `mode=format`. Wechsle bei einem Uni-Ordner zuerst mit `lernly_select_course` ins gewünschte Fach und speichere `kurs.json` sowie ausgearbeitete Themen (`themen/<id>.json`), Probeklausuren (`probeklausuren/<id>.json`) und Spickzettel (`spickzettel.json`) mit `lernly_save_course_file` im gemeinsamen Lernly-Format (`lernly.kurs/1` / `lernly.thema/1` auf Tax-Mock-Trainer-Niveau), bevor oder während du sie ins Artifact einbaust. So steht alles direkt über `lernly_sync_web_course` in `lernly-app.de/dashboard` und als lokaler Trainer bereit. Bereits gelesene Revision bei Änderungen mitgeben. Bei Konflikten neu lesen statt fremde Änderungen überschreiben.

Nicht das komplette Kursmaterial in einen einzigen riesigen Prompt pressen. Zuerst das wichtigste Stufe-1-Thema vollständig ausarbeiten, speichern und bei Bedarf syncen (`lernly_sync_web_course`), dann schrittweise ergänzen. Bei Nutzerwunsch nach einem kompletten Kurs selbstständig fortsetzen, soweit das Kontextbudget reicht, und verbleibende Themen konkret benennen.
