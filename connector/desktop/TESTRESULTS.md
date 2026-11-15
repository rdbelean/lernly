# Beta-Abnahme — 15. November 2026

Paket: `dist/lernly-beta-0.2.0.mcpb`. Beispiel: `dist/Lernly-Beispieltrainer.html`. Der Nutzer installiert selbst und wählt den Kursordner. Die persönliche Desktop-Installation und der native Artifact-Weg sind noch nicht abgenommen.

## Technik

Build erfolgreich; `node --test connector/desktop/tests/*.test.mjs`: **8/8 bestanden**. Tests starten den gebündelten Server über einen echten MCP-Client/stdio.

Geprüft: Werkzeug-/Prompt-Erkennung; Prompt-Änderungen ohne Neustart; Quellenlesen mit Fortsetzung; Suche, Dubletten und Cache-Invalidierung; PDF/PPTX/XLSX; Pfadgrenzen/Symlinks/Hardlinks; Kursvalidierung, Revisionen, Backups und Neustart; Trainerbau und Exporte; Ablehnung übermaskierten LaTeX; Einzelreparatur mehrerer alter fehlerhafter Dateien ohne neue Fehler zuzulassen; Paketinhalt ohne Testkurse/Zugangsdaten.

## Corporate-Finance-Material

Vorhandene isolierte Rohmaterialkopie: **20 Dateien, 309 Seiten/Folien/Tabellenblätter, keine Extraktionsfehler**, 495.866 Zeichen, etwa 2,6 Sekunden auf diesem Mac. Drei XLSX und CBRE-PDF verarbeitet; 24 textarme Stellen gemeldet; `Exam 2020.pdf` und `ft20_2.pdf` als Dublette erkannt. Keine OCR oder semantische Bildprüfung. Dies ist kein Nachweis für einen vollständigen CF-Trainer. Privates Protokoll: `/private/tmp/lernly-mcp-cf-materials.json`.

## Echter Modelltest

Frische Claude-Code-Sitzungen mit Sonnet 4.6, ausschließlich Lernly-Werkzeuge, Hooks/Memory deaktiviert. Zwei künstliche englische Quellen über Diskontierung; keine vorbereiteten Kursantworten.

| Lauf | Ergebnis | Schritte | Dauer | Ausgewiesene Modellkosten |
|---|---|---:|---:|---:|
| Generierung | Kurs, Thema, vier Rechenfälle, drei Karten, Probeklausur, HTML und beide Exporte gebaut; danach LaTeX-Fehler im Browser gefunden | 25 | 332 s | 0,59345 USD |
| Erste Reparatur | Fehlgeschlagen: zwei alte fehlerhafte Dateien blockierten sich durch Ganzkursvalidierung | 8 | 218 s | 0,35103 USD |
| Reparatur nach Fix | Beide Dateien mit Revisionen korrigiert; keine verbleibenden Fehler; Trainer und Exporte neu gebaut | 9 | 91 s | 0,17171 USD |

Der äußere CLI-Status „success“ im zweiten Lauf war kein erfolgreicher Reparaturnachweis. Ausgewiesene Kosten bedeuten nicht automatisch zusätzliche Abo-Abbuchungen. Keine API-Schlüssel eingerichtet. Private Laufprotokolle: `/private/tmp/lernly-mcp-live-beta/` (`result.json`, `repair-result.json`, `repair-final-result.json`).

Unabhängig nachgerechnet: 751,31 / 597,81 / 1.102,54 / 1.890,36 EUR stimmen; Mock-Lösung 799,61 EUR. Checklisten-Gesamtsumme 10 Punkte. **Qualitätsgrenze:** Die Zuordnung einzelner Checklistenpunkte zu den im Aufgabentext genannten Teilpunkten ist nicht vollständig konsistent. Das Datenformat prüft keine semantische Punktezuordnung in Freitext. Fachliche Prüfung bleibt nötig.

## Browser

Tatsächlich erzeugter und reparierter Trainer auf Desktop und bei 380 px geprüft: keine horizontale Seitenüberbreite; falsche Antwort 1000 abgewiesen und 751,31 akzeptiert; Kartenflip/Bewertung; Lernfortschritt nach Neuladen erhalten; Mock-Lernmodus, Lösung und Selbstbewertung (2 Punkte → 2/10 und 20 %). Fünf Theoriebereich-Formeln gerendert, keine KaTeX- oder Konsolenfehler. Screenshot: `/private/tmp/lernly-beta-trainer-desktop.png`.

Der native Claude-Artifact-Weg ist vorbereitet, aber noch nicht in einem persönlichen Desktop-Chat getestet. Der echte Modelllauf verwendete den lokalen HTML-Trainer. Vollständiger CF-Kursvergleich mit CF Study OS bleibt offen.
