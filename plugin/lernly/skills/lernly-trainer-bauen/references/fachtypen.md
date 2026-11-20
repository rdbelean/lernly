# Fachtypen & Tax-Mock-Trainer-Tiefe pro Thema

`kurs.json.subjectType` bestimmt die Grundmischung (selbstständig aus Altklausuren und Folien abgeleitet). Pro Thema zählt zusätzlich, **wie die Klausur dieses Thema konkret abfragt**.

## 1. Die drei Fachtypen im Detail

| Fachtyp | `subjectType` | Didaktischer Schwerpunkt (Vorbild: Tax Mock Trainer & Corporate Finance) | Pflicht-Aufgabentypen & Karten |
|---|---|---|---|
| **Rechnen & Formeln** (Finance, Mathe, Statistik, VWL, Kostenrechnung) | `rechnen` | **Rechenrezepte & Zahlenherkunft:** `steps` mit Formel + **„Woher kommt die Zahl?“** (Zuweisung aus Angabe/Tabelle), `formula`-Blöcke, durchgerechnetes Altklausur-Musterbeispiel in `table`, `remember` (Merke-Box für Rundung/Einheiten), `mistakes` (Vorzeichen-, Perioden-, Diskontierungsfehler). | Alle Altklausur-Rechnungen (`origin: "altklausur"`) + pro Muster ein **`drill` mit 3–5 realistischen Zahlenvarianten**, klaren Einheiten (`unit`), Rundungstoleranz (`rel`/`tol`), Entscheidung (`choice`) und Lösungsweg. 1 `mc` zu Rechenfallen. Karten für Pflichtformeln ohne Formelsammlung. |
| **Fallstudien & Regeln** (Steuerrecht, Wirtschaftsrecht, Bilanzierung/Accounting) | `argumentieren` oder `gemischt` | **Sachverhalt → Schema → Mustersätze:** Ausgangs-Sachverhalt (`example`) mit **`==Signalwörtern==`**, schrittweises Prüfungs-/Berechnungsschema (`steps` / `table`) mit Rechtsgrundlage (`§`, IFRS, HGB) und **„Woher kommt die Zahl / Regel?“**, `remember` (Merke-Box), `mistakes` (typische Klausurfallen) und **ausformulierte Mustersätze** (`standardAnswer` / `model_answer` mit `==Punkte-Wörtern==`). | Fallbasierte **`drill`**-Berechnungen (z. B. Steuer/Bilanzwert mit „Woher kommt die Zahl?“) + **`essay`**-Falllösungen mit Punkte-Checkliste und vollständigen Mustersätzen. Karten für Prüfungsschemata, Paragrafen und Schwellenwerte. |
| **Konzepte & Transfer** (Marketing, Strategy, Management, Organisation) | `verstehen` | **Praxis-Szenarien & Abgrenzung statt Definitionen:** Kurze Alltagserklärung (`simple`), konkretes Unternehmens-/Marktszenario (`example`), **Vergleichs-/Abgrenzungstabelle** (`table`: „Modell A vs. Modell B“), `remember` (Merke-Box für Kernunterschied), `mistakes` (verwechselte Konzepte) und **`standardAnswer`** mit argumentativen Mustersätzen (`==Schlüsselbegriffe==`). | **`essay`**-Transferfragen („Wende Modell X auf Unternehmen Y an“) mit Checkliste & Mustersätzen + 2–3 **`mc`** mit realistischen Klausur-Distraktoren und Begründung pro falscher Antwort. 6–12 gezielte Karten für abzuprüfende Dimensionen (4P, Porter, Stufenmodelle). |
| **Gemischt** (BWL-Klausuren mit Rechen- & Theorieteil) | `gemischt` | Je Thema exakt das jeweilige Muster (Rechnen vs. Fallstudie vs. Konzept/Transfer) aus dem Klausur-Bauplan anwenden. | Kombination aus `drill` (3–5 Varianten), `essay` mit Checkliste & Mustersätzen und `mc`. |

## 2. Verbindliche Regeln gegen oberflächliche Zusammenfassungen

- **Altklausur zuerst:** Jede echte Altklausur-Aufgabe zum Thema kommt mit ihren Originalzahlen/-sachverhalten als Aufgabe (`origin: "altklausur"`) rein.
- **„Woher kommt die Zahl / Regel?“:** In jeder Musterlösung (`theory` + `drill.variants[].solution` + `essay.modelAnswer`) müssen Zwischenergebnisse und Rechtsfolgen explizit auf die gegebene Information, Formel oder Rechtsnorm zurückgeführt werden — niemals „vom Himmel gefallene“ Zwischenzahlen.
- **Mustersätze (`standardAnswer`):** Für jedes Stufe-1- und Stufe-2-Thema genau den Text formulieren, der in der Klausur die volle Punktzahl holt (Faustregel: ca. 1 Minute bzw. 10–15 Wörter pro Punkt), mit `==Punkte-Wörtern==`.
- **Strikte Klausur-Gewichtung:** Themen sortiert nach `tier` (1 zuerst) und `expectedPoints` absteigend bauen. Wahlaufgaben (`pairWith`) beide abdecken, leichtere zuerst.
- **Auswendig nur, was 1:1 hingeschrieben wird.** Rechenwege übt man über `drill`-Varianten, Fallanwendung über `essay`/`mc`, nicht mit Textwand-Karteikarten.

## 3. Umfang pro Thema (Richtwert)

| Stufe | Theorie-Bausteine (`theory`) | Aufgaben (`tasks`) | Karten (`cards`) | Standardantwort (`standardAnswer`) |
|---|---|---|---|---|
| **1 (Pflicht / ~70 % Punkte)** | **7–12** (`simple`, `example` Sachverhalt, `figure`/`table`, `steps` + „Woher?“, `formula`, `remember`, Altklausur-Beispiel) | **3–6** (inkl. Original-Altklausur + `drill` mit 3–5 Varianten / Fall-`essay`) | **4–12** | **Pflicht** (`model_answer` Mustersätze mit `==…==`) |
| **2 (Häufig / Wahlaufgabe)** | **5–8** | **2–4** | **3–8** | **Pflicht** |
| **3 (Ergänzung)** | **3–5** (kompakt + `remember`) | **1–2** | **0–4** | optional |
