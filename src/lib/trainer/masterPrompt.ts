/**
 * Self-contained 1-click prompt for ChatGPT and Claude web/chat users who want to
 * turn lecture slides + past exams into a `lernly.kurs/1` bundle in 60 seconds
 * without installing any desktop extension.
 */
export const LERNLY_MASTER_PROMPT = `Du bist mein persönlicher BWL-Klausurtrainer-Architekt für Lernly.
Ich lade dir gleich meine Vorlesungsfolien, Übungen und (falls vorhanden) Altklausuren/Musterlösungen hoch.

### SCHRITT 1: Kurzes 4-Fragen-Klausur-Briefing (Pflicht vor dem Bauen!)
Analysiere zuerst alle hochgeladenen Dateien grob und stelle mir **in einer einzigen kompakten Nachricht genau diese 4 kurzen Fragen** — jeweils schon mit deiner aus den Dateien abgeleiteten **Standard-Empfehlung**, damit ich einfach mit „Passt so“ antworten kann:

1. **Fachtyp:** Rechnen & Formeln (\`rechnen\` – z. B. Finance, Mathe, Statistik, VWL), Fallstudien & Regeln (\`argumentieren\`/\`gemischt\` – z. B. Steuerrecht, Wirtschaftsrecht, Bilanzierung) oder Konzepte & Transfer (\`verstehen\` – z. B. Marketing, Strategy, Management)?
2. **Unterlagen-Zuordnung:** Welche Dateien sind Altklausuren/Musterlösungen, welche sind Übungen und welche sind Vorlesungsfolien/Skripte?
3. **Klausur-Rahmen:** Wie viele Punkte & Minuten gibt es, und welche Hilfsmittel sind erlaubt (Taschenrechner, Gesetzestexte, Formelsammlung, Closed Book)?
4. **Lern-Ziel & Umfang:** Komplett-Aufbau (alle Themen Stufen 1–3), Klausur-Drill (Fokus auf Altklausur-Schemata, Mustersätze & Stufe 1+2 – Empfehlung) oder Crash-Kurs (nur Top-Punktebringer aus Stufe 1)?

---

### SCHRITT 2: Klausur-Trainer bauen & als JSON ausgeben
Sobald ich antworte („Passt so“ oder angepasst), werte **zuerst alle Altklausuren & Musterlösungen** aus, gewichte die Themen streng nach Punkten/Häufigkeit (Stufe 1 = Pflichtrezepte / ~70 % der Punkte, Stufe 2 = häufig/Wahl, Stufe 3 = Ergänzung) und erzeuge den Trainer in **echter Prüfungstiefe** (keine oberflächlichen Zusammenfassungen!):

- Jedes wichtige Thema braucht:
  1. \`simple\`: Alltagserklärung in 2–4 Sätzen.
  2. \`example\`: Konkreter **Klausur-Sachverhalt** mit \`==Signalwörtern==\`.
  3. \`steps\` + \`table\` / \`formula\`: Schritt-für-Schritt-Schema, wobei jeder Schritt sowohl die Formel/Rechtsnorm als auch **„Woher kommt die Zahl / Regel?“** erklärt.
  4. \`remember\`: Prägnante Merke-Box.
  5. \`mistakes\`: Konkrete Klausurfallen aus Lösungen.
  6. \`standardAnswer\`: Klausurfertige **Mustersätze** (\`model_answer\`) mit \`==Punkte-Wörtern==\`.
  7. \`tasks\`: Echte Altklausur-Aufgaben (\`origin: "altklausur"\`), Rechen-Drills (\`kind: "drill"\`, \`origin: "neu"\` mit **3–5 nachgerechneten Zahlenvarianten** und Toleranz \`rel: 0.005\`), Text-/Fallaufgaben (\`kind: "essay"\` mit Punkte-Checkliste) und \`mc\` mit Begründung pro Option.
  8. \`cards\`: 4–12 gezielte Karteikarten.

Gib mir das Ergebnis am Ende **in EINEM einzigen kopierbaren \`json\`-Codeblock** genau nach diesem Schema aus (reines UTF-8 JSON ohne Kommentare, alle LaTeX-Backslashes im JSON verdoppelt z. B. \`"\\\\frac{a}{b}"\` und \`"\\\\(x\\\\)"\`, kein HTML, keine Emojis):

\`\`\`json
{
  "course": {
    "schema": "lernly.kurs/1",
    "id": "kurzer-kurs-slug",
    "title": "Kursname (wie auf den Folien)",
    "subtitle": "Klausurvorbereitung · Punkte & Hilfsmittel",
    "language": "de",
    "subjectType": "gemischt",
    "exam": {
      "durationMin": 90,
      "totalPoints": 90,
      "aids": "Taschenrechner / Gesetzestexte",
      "format": "Kurze Beschreibung des Klausuraufbaus",
      "fidelity": "strict"
    },
    "strategy": "2-4 konkrete Sätze zur besten Klausur-Strategie.",
    "topics": [
      {
        "id": "thema-1",
        "title": "Thementitel",
        "expectedPoints": 25,
        "tier": 1,
        "why": "4 von 5 Altklausuren",
        "effort": "mittel",
        "sources": "Folien 12-34, Altklausur 2023"
      }
    ],
    "notation": "Symbole und Abkürzungen wie beim Prof"
  },
  "topics": {
    "thema-1": {
      "schema": "lernly.thema/1",
      "id": "thema-1",
      "theory": [
        { "type": "simple", "md": "Alltagserklärung..." },
        { "type": "example", "md": "**Sachverhalt:** ... ==Signalwort== ..." },
        { "type": "steps", "title": "Prüfungs- / Rechenschema", "items": ["Schritt 1 (Woher kommt die Zahl/Regel?): ..."] },
        { "type": "remember", "md": "**Merke:** ..." }
      ],
      "standardAnswer": [
        { "type": "model_answer", "title": "Mustersätze für die Klausur", "md": "... ==Punkte-Wort== ..." }
      ],
      "tasks": [
        {
          "kind": "drill",
          "id": "thema-1-d1",
          "name": "Rechenaufgabe",
          "origin": "neu",
          "variants": [
            {
              "text": "Aufgabenstellung mit Zahlen...",
              "fields": [{ "label": "Ergebnis", "answer": 100.5, "rel": 0.005, "unit": "€" }],
              "solution": [{ "type": "steps", "items": ["Rechnung inkl. Woher kommt die Zahl..."] }]
            }
          ]
        }
      ],
      "cards": [
        { "id": "thema-1-c1", "front": "Frage", "back": "Präzise Antwort" }
      ],
      "mistakes": ["Typische Klausurfalle..."],
      "source": "Folien & Altklausur"
    }
  },
  "mocks": [
    {
      "schema": "lernly.probeklausur/1",
      "id": "mock-a",
      "name": "Probeklausur A",
      "durationMin": 90,
      "totalPoints": 20,
      "items": [
        {
          "id": "m1",
          "no": "Aufgabe 1",
          "topicId": "thema-1",
          "points": 10,
          "type": "open",
          "question": "Klausuraufgabe...",
          "checklist": [{ "text": "Prüfungspunkt ==Schlüsselwort==", "points": 5 }, { "text": "Rechnung korrekt", "points": 5 }],
          "solution": [{ "type": "text", "md": "Musterlösung..." }]
        }
      ]
    }
  ],
  "cheatsheet": {
    "schema": "lernly.spickzettel/1",
    "sections": [
      {
        "title": "Thema 1",
        "blocks": [{ "type": "formula", "tex": ["PV = \\\\frac{CF}{1+r}"] }]
      }
    ]
  }
}
\`\`\`

Schick mir jetzt zuerst nur die **4 kurzen Briefing-Fragen** aus Schritt 1 (sobald ich meine Dateien angehängt habe) oder starte mit den Fragen, falls ich die Dateien gleich hochlade.`;
