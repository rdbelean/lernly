# Qualitäts-Check vor dem Speichern eines Themas (Tax-Mock-Trainer-Standard)

Kurz durchgehen, bevor `validate.py` / `lernly_save_course_file` läuft. Keine oberflächlichen Zusammenfassungen — jedes Stufe-1/2-Thema muss direkt prüfungsreif sein.

## Inhalt & Klausurnähe
- [ ] Alles steht belegbar in den Unterlagen (Folien, Skript, Altklausur, Lösung). Nichts dazuerfunden. Was fehlt, wird ehrlich markiert oder weggelassen.
- [ ] Notation, Paragrafen/Standards und Rechenweg exakt wie beim Prof (`kurs.json.notation`), nicht generisch aus einem Lehrbuch.
- [ ] Jede relevante Altklausur-Aufgabe zu diesem Thema ist enthalten, mit Originalzahlen/-sachverhalt (`origin: "altklausur"`) und vollständiger Musterlösung.
- [ ] Alle Zahlen in `drill`, Tabellen und Lösungen per Python (`lernly_calculate`) nachgerechnet. Rundungstoleranzen (`rel`/`tol`) und Einheiten (`unit`) sind korrekt angegeben.
- [ ] **„Woher kommt die Zahl / Regel?“:** Jeder Rechen- und Prüfungs-Schritt erklärt transparent, aus welcher Angabe, Formel oder Rechtsnorm der Wert/Schluss stammt.
- [ ] **`standardAnswer` (Mustersätze):** Ausformulierte klausurfertige Sätze in echter Klausurlänge, jedes Punkte-Schlüsselwort und jede Kernvariable mit `==…==` markiert.
- [ ] `source` nennt konkrete Dateien + Folien/Seiten zum Nachschlagen.

## Didaktik & Tax-Mock-Trainer-Tiefe
- [ ] Erster Baustein ist `simple`: in Alltagssprache, ohne Fachwörter, 2–4 Sätze.
- [ ] Zweiter Baustein ist ein konkreter **Klausur-Sachverhalt / Fall** (`example`) mit hervorgehobenen Signalwörtern (`==…==`).
- [ ] Rechen- und Fallthemen enthalten ein klares **Schritt-für-Schritt-Schema** (`steps` / `table`), eine prägnante **Merke-Box** (`remember`) und konkrete **Klausurfallen** (`mistakes`).
- [ ] Transfer-/Verstehensthemen enthalten Praxis-Szenarien und Vergleichstabellen (`table`: „A vs. B“) statt bloßer Definitionslisten.
- [ ] `drill` (`origin: "neu"`) hat **3–5 realistische Zahlenvarianten**; `mc` erklärt bei jeder Option die typische Denkfalle.
- [ ] Karten fragen jeweils genau eine Sache präzise ab (kein Textwand-Ballast).

## Format
- [ ] Nur Markdown-light und LaTeX, kein HTML, **keine Emojis**.
- [ ] LaTeX-Backslashes im JSON exakt verdoppelt (`"\\\\frac{a}{b}"`, `"\\\\(x\\\\)"`).
- [ ] IDs mit Themen-Präfix, stabil (bei Updates nie umbenennen).
- [ ] Inhaltssprache = `kurs.json.language`; UI/Navigation/Merke-Boxen auf Deutsch.
