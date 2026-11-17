---
description: Karteikarten für Anki oder Quizlet exportieren
argument-hint: "[anki | quizlet | beide]"
---

Exportiere die Karteikarten des Lernly-Kurses.

```bash
python3 "<Ordner des Skills lernly-trainer-bauen>/scripts/export_cards.py" _lernly --format <anki|quizlet|both>
```
Format: $ARGUMENTS (leer = beide).

Gib die Dateien aus (mit Ordnerzugriff: Pfad nennen; im Chat: zum Herunterladen) und erkläre in je einem Satz den Import:
- **Anki** (Desktop): Datei → Importieren → die Textdatei wählen. Deck und Tags werden aus der Datei übernommen, Formeln rendert Anki.
- **Quizlet:** Neues Lernset → Importieren → Inhalt der Datei einfügen, Trennung „Tab“ und „Neue Zeile“. Formeln erscheinen dort als LaTeX-Text.
