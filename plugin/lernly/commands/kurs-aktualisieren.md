---
description: Neue oder geänderte Kursdateien einarbeiten, ohne den Lernfortschritt zu verlieren
argument-hint: "[optional: neue Dateien]"
---

Aktualisiere den Lernly-Kurs mit neuen oder geänderten Dateien. Hinweis des Studenten: $ARGUMENTS

1. Inventar und Textextraktion erneut laufen lassen (Skill **lernly-kurs-einrichten**, Schritte 1–2). Die Extraktion verarbeitet nur neue oder geänderte Dateien. Lies `_lernly/text/_uebersicht.md`: Was ist neu?
2. Nur die neuen Dateien lesen. Neue Altklausur oder Hinweise zur Klausur → Bauplan in `kurs.json` anpassen (Punkte, Häufigkeit, Stufen, `fidelity`). Neue Folien → `sources` der betroffenen Themen ergänzen, neue Themen anhängen.
3. Betroffene Themen gezielt ergänzen (Skill **lernly-trainer-bauen**): neue Altklausur-Aufgaben, neue Inhalte. **IDs nie ändern**, bestehende Aufgaben und Karten behalten, damit der Fortschritt bleibt.
4. Prüfen und Trainer neu bauen. Im Chat kurz sagen, was sich geändert hat (eine Liste, höchstens 5 Punkte).
