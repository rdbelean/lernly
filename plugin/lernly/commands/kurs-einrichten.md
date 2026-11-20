---
description: Fach aus dem Uni-Ordner auswählen, Altklausuren & Folien selbstständig analysieren, Klausur-Bauplan erstellen und nach Lernly syncen
argument-hint: "[Fachname oder Kursordner]"
---

Richte das gewünschte Fach für Lernly ein und baue es direkt bis in das Web-Dashboard auf. Folge den Skills **lernly-kurs-einrichten** und **lernly-trainer-bauen**:

1. Ist ein ganzer Uni-Ordner verbunden (`lernly_status`), wähle mit `lernly_select_course` zuerst gezielt das Fach aus `$ARGUMENTS` (falls noch kein Fach genannt wurde und mehrere Unterordner vorhanden sind, frage in einem Satz nach dem Fach).
2. Analysiere alle Altklausuren, Lösungen und die relevanten Vorlesungsfolien **selbstständig**, entscheide eigenständig über Fachtyp, Punkte-Gewichtung und Stufen 1–3, speichere `_lernly/kurs.json` sowie die Themen in Tax-Mock-Trainer-Tiefe und synce alles mit `lernly_sync_web_course` nach `lernly-app.de/dashboard`.

Gewünschtes Fach / Hinweis des Studenten: $ARGUMENTS
