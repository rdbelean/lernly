# Lernly für Claude

Lernly macht aus deinen Kursunterlagen einen Klausur-Trainer, direkt in Claude. Du gibst Claude deinen Kursordner (Folien, Altklausuren, Übungen). Lernly liefert die Methode: was in die Klausur kommt, in welcher Reihenfolge du lernst und wie gute Übungen aussehen. Claude schreibt die Inhalte, Lernly setzt sie in eine fertige Lern-Oberfläche.

**Status:** Phase-0-Test. Noch kein Lernly-Konto nötig, alles läuft bei dir und in deinem Claude.

## Was du bekommst

Eine Datei `Lernly-Trainer.html`, die du im Browser öffnest (auch am Handy):

- **Klausurplan:** Aufbau der Klausur aus den Altklausuren, Themen in drei Stufen („sicher lernen“, „wenn Zeit ist“, „nur wenn alles sitzt“), Standardantworten in Klausurlänge.
- **Themen:** einfach erklärt, Beispiel, Grafik, Rezept, Formeln, durchgerechnete Altklausur-Aufgabe, typische Fehler.
- **Üben:** echte Altklausur-Aufgaben zuerst, Rechenaufgaben mit neuen Zahlen, Textaufgaben mit Punkte-Checkliste, Multiple Choice mit Erklärung.
- **Wiederholen:** Karteikarten mit Wiederholung im richtigen Abstand, nur für das, was du auswendig können musst.
- **Probeklausur:** im echten Format, mit Timer oder im Lernmodus, Auswertung nach Thema.
- **Spickzettel** und eine **Übersicht**: „Punkte, die du jetzt holen würdest“ und was als Nächstes am meisten bringt.

## Voraussetzungen

- Ein Claude-Abo mit Code-Ausführung (in den Einstellungen unter Funktionen aktivieren). Für große Kurse empfohlen: Claude Pro oder höher.
- Am besten **Cowork** oder **Claude Code** mit Zugriff auf deinen Kursordner. Dann musst du nichts hochladen, auch nicht bei riesigen Foliensätzen.
- Im normalen Chat geht es auch: Dateien hochladen, den Trainer am Ende herunterladen.

## So geht's

1. `/lernly:kurs-einrichten` – Claude liest deine Unterlagen, wertet die Altklausuren aus und zeigt dir den Bauplan. Eine Rückfrage, dann geht es weiter.
2. `/lernly:trainer-bauen` – Claude baut Thema für Thema, die wichtigsten zuerst. Danach liegt `Lernly-Trainer.html` bereit.
3. Lernen im Trainer. Der Fortschritt bleibt im Browser gespeichert.
4. `/lernly:wo-stehe-ich` – Lernstand aus dem Trainer einfügen, Claude sagt dir, was jetzt die meisten Punkte bringt.

Weitere Befehle: `/lernly:abfragen`, `/lernly:erklaer-mir`, `/lernly:probeklausur`, `/lernly:kurs-aktualisieren`, `/lernly:export` (Anki, Quizlet).

## Datenschutz

Lernly sieht in dieser Version nichts von dir: keine Dateien, keine Inhalte, keinen Lernstand. Deine Unterlagen liest nur Claude in deinem Konto. Der Trainer ist eine Datei auf deinem Gerät.

## Grenzen (Phase 0)

- Der Fortschritt liegt im Browser, in dem du den Trainer öffnest. Für ein anderes Gerät: „Übersicht → Lernstand kopieren → Komplett“ und dort laden.
- Formeln brauchen beim ersten Öffnen Internet (KaTeX von cdnjs).
- Die Inhalte erstellt Claude aus deinen Unterlagen. Prüf im Zweifel die angegebene Folie.

## Lizenz

Noch nicht festgelegt, siehe `LICENSE`.
