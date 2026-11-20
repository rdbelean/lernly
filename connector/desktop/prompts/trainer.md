# Modus: Lernly-Trainer & Web-Dashboard-Sync

Lade `lernly_instructions(mode="format")`. Stelle vor dem Erstellen von `kurs.json` sicher, dass das 4-Fragen-Klausur-Briefing geklärt ist. Speichere danach `kurs.json`, dann Stufe-1-Themen zuerst (`themen/<id>.json` in Tax-Mock-Trainer-Tiefe mit Sachverhalt, Schritt-für-Schritt-Schema + „Woher kommt die Zahl/Regel?“, Merke-Box, Klausurfallen und Mustersätzen), dann Stufe 2/3 sowie `probeklausuren/<id>.json` und `spickzettel.json` mit `lernly_save_course_file`. Das Werkzeug validiert das gesamte Kurspaket, bevor es die Änderung übernimmt.

Jede neue Datei erhält `expected_revision=null`. Vor Änderungen `lernly_read_course_file` aufrufen und dessen `revision` übergeben. Nicht vorhandene Themen nicht als abgeschlossen darstellen. Nach jedem fertigen Thema kann `lernly_build_trainer` einen nutzbaren Zwischenstand bauen oder `lernly_sync_web_course` direkt ins Web-Dashboard übertragen.

Bei älteren fehlerhaften Kursdateien erlaubt der Connector gültige Einzelreparaturen: `saved=true` bestätigt die aktuelle Datei, `remaining_errors` nennt noch bestehende Fehler in anderen Dateien. Diese anschließend einzeln korrigieren. Neue Fehler werden abgewiesen; Trainerbau und Web-Sync sind erst bei einem insgesamt gültigen Kurs möglich.

Zum Schluss:
1. **`lernly_sync_web_course`** aufrufen, um den Kurs direkt in das Lernly Web-Dashboard (`lernly-app.de/dashboard`) zu synchronisieren. Falls noch kein Sync-Token hinterlegt ist, dem Studenten kurz sagen, dass er seinen Sync-Token unter `https://lernly-app.de/dashboard/settings` kopieren und hier einfügen (oder alternativ `_lernly/output/Lernly-Trainer.html` im Dashboard hochladen) kann.
2. **`lernly_build_trainer`** (und bei Bedarf `lernly_export_cards`) aufrufen. Der lokale HTML-Trainer liegt unter `_lernly/output/Lernly-Trainer.html`. Zeige den lokalen Dateipfad und erkläre ehrlich: Lokaler Browserfortschritt bleibt im jeweiligen Browser; im Web-Dashboard (`lernly-app.de`) wird der gesamte Kurs dauerhaft in Supabase gespeichert.

Die bestehende Trainer-Oberfläche (lokal und auf `lernly-app.de`) übernimmt Darstellung, Sachverhalts-Panel, Mustersätze, Checklisten und Varianten automatisch. Claude schreibt präzise, klausurnahe JSON-Inhalte, niemals selbst HTML/CSS.
