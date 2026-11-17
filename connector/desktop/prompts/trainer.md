# Modus: lokal gespeicherter Lernly-Trainer

Lade `lernly_instructions(mode="format")`. Speichere zunächst `kurs.json`, dann `themen/<id>.json` und optional `probeklausuren/<id>.json` sowie `spickzettel.json` mit `lernly_save_course_file`. Das Werkzeug validiert das gesamte zukünftige Kurspaket, bevor es die Änderung übernimmt.

Jede neue Datei erhält `expected_revision=null`. Vor Änderungen `lernly_read_course_file` aufrufen und dessen `revision` übergeben. Nicht vorhandene Themen nicht als abgeschlossen darstellen. Nach jedem fertigen Thema kann `lernly_build_trainer` einen nutzbaren Zwischenstand bauen.

Bei älteren fehlerhaften Kursdateien erlaubt der Connector gültige Einzelreparaturen: `saved=true` bestätigt die aktuelle Datei, `remaining_errors` nennt noch bestehende Fehler in anderen Dateien. Diese anschließend einzeln korrigieren. Neue Fehler werden abgewiesen; der Trainerbau ist erst bei einem insgesamt gültigen Kurs möglich.

Zum Schluss `lernly_build_trainer` und bei Bedarf `lernly_export_cards` verwenden. Der HTML-Trainer liegt unter `_lernly/output/Lernly-Trainer.html`, Exporte daneben. Zeige den lokalen Dateipfad. Nicht behaupten, dass eine lokale HTML-Datei automatisch ein gehostetes Claude-Artifact ist. Browserfortschritt bleibt im jeweiligen Browser; dessen JSON-Export dient als Backup.

Die Beta bringt die bestehende Lernoberfläche mit. Claude schreibt ihre Inhalte, nicht jedes Mal deren HTML/CSS. Nutzerwünsche, die das Format nicht unterstützt, ehrlich benennen und alternativ im freien Artifact umsetzen.
