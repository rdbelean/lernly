---
description: Kurs für Lernly einrichten – Ordner scannen, 4-Fragen-Klausur-Briefing klären, Altklausuren auswerten und Bauplan der Klausur erstellen
argument-hint: "[Kursordner oder Kursname]"
---

Richte diesen Kurs für Lernly ein. Folge dem Skill **lernly-kurs-einrichten** Schritt für Schritt:

1. Zuerst den Ordner scannen (`inventory.py` bzw. `lernly_inventory`) und das **geführte 4-Fragen-Klausur-Briefing** (Fachtyp, Unterlagen-Zuordnung, Klausur-Rahmen, Lern-Ziel & Umfang) mit sinnvollen Standard-Vorschlägen in einer einzigen kompakten Nachricht klären.
2. Danach Altklausuren zuerst auswerten, Themen streng nach Klausur-Punkten & Häufigkeit in Stufen 1–3 gewichten und `_lernly/kurs.json` speichern.

Kursordner oder Hinweis des Studenten: $ARGUMENTS

Ist nichts angegeben: Nutze den freigegebenen Ordner oder die hochgeladenen Dateien. Gibt es beides nicht, bitte den Studenten in einem Satz, den Kursordner freizugeben oder die Dateien hochzuladen (Altklausuren mit Lösungen, Folien, Übungsblätter).
