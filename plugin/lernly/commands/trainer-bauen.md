---
description: Lernly-Trainer bauen – Themen auf Tax-Mock-Trainer-Niveau, Aufgaben, Mustersätze, Probeklausur, Spickzettel & Web-Sync
argument-hint: "[leer | weiter | Themen-IDs | probeklausur | spickzettel]"
---

Baue den Lernly-Trainer für den eingerichteten Kurs im **Tax-Mock-Trainer-Standard** (Sachverhalt mit Signalwörtern, Schritt-für-Schritt-Schema mit „Woher kommt die Zahl / Regel?“, Merke-Box, Klausurfallen, Mustersätze, Rechen-Drills mit 3–5 Varianten & Probeklausur). Folge dem Skill **lernly-trainer-bauen**.

Auftrag: $ARGUMENTS
- leer: alles Fehlende bauen, Stufe 1 zuerst, danach Trainer bauen und mit `lernly_sync_web_course` ins Web-Dashboard (`lernly-app.de`) syncen (sofern Sync-Token vorhanden).
- `weiter`: mit dem nächsten fehlenden Thema fortsetzen.
- Themen-IDs (z. B. `dcf mm`): nur diese Themen (neu) bauen.
- `probeklausur` oder `spickzettel`: nur das.

Gibt es noch kein `_lernly/kurs.json`, starte mit dem Skill **lernly-kurs-einrichten** (Fach im Uni-Ordner wählen und Unterlagen selbstständig analysieren).
