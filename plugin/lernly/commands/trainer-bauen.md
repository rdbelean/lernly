---
description: Lernly-Trainer bauen – Themen, Aufgaben, Karten, Probeklausur und Spickzettel aus dem Kursprofil
argument-hint: "[leer | weiter | Themen-IDs | probeklausur | spickzettel]"
---

Baue den Lernly-Trainer für den eingerichteten Kurs. Folge dem Skill **lernly-trainer-bauen**.

Auftrag: $ARGUMENTS
- leer: alles Fehlende bauen, Stufe 1 zuerst, nach Stufe 1 einmal den Trainer bauen.
- `weiter`: mit dem nächsten fehlenden Thema fortsetzen.
- Themen-IDs (z. B. `dcf mm`): nur diese Themen (neu) bauen.
- `probeklausur` oder `spickzettel`: nur das.

Gibt es noch kein `_lernly/kurs.json`, starte mit dem Skill **lernly-kurs-einrichten**.
