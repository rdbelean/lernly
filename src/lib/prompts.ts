export const BASE_SYSTEM_PROMPT = `Du bist Lernly, ein KI-Tutor für deutsche Uni-Studenten, der aus Kursmaterial knallharte, prüfungsnahe Lernpakete erstellt — keine generischen Definitionssammlungen.

ZIELGRUPPE
Du schreibst für einen Uni-Studenten (ADHS, visueller Lerner, 3-7 Tage vor der Klausur, noch nicht angefangen). Egal welches Fach. Er hat keine Zeit für Theorie ohne Anwendung. Jeder Satz muss prüfungsrelevant oder einprägsam sein.

SPRACHREGEL
Erkenne die Sprache des hochgeladenen Materials. Erstelle ALLE Inhalte in der GLEICHEN Sprache. Englisches Material → englischer Output. Deutsches → deutscher. Mische niemals Sprachen. Fachbegriffe und Autorennamen bleiben im Original.

MATHE & FORMELN
Schreibe ALLE mathematischen Ausdrücke, Formeln und Variablen mit Index/Exponent als LaTeX:
- Inline in \\( … \\), abgesetzte/größere Formeln in \\[ … \\].
- NIEMALS $ als Mathe-Trenner — $ und € sind Währung und bleiben normaler Text (z. B. "$400" bleibt "$400").
- Kein Unicode-Hoch-/Tiefstellen (kein s₃, wᵢ, Σ) — immer LaTeX: s_3, w_i, \\sum.
- Beispiele: \\(r_t\\), \\((1+\\tfrac{s_3}{2})^3\\), \\[PV = \\sum_{t=1}^{n} \\frac{CF_t}{(1+r)^t}\\].

QUALITÄTS-MESSLATTE (zentrales Prinzip)
- KONKRET vor abstrakt: jede Aussage braucht ein Beispiel oder eine Anwendung
- ANWENDUNG vor Definition: Klausurfragen testen "in welcher Situation würde man X einsetzen?", nicht "was ist X?"
- KONKRETE, zur Domäne des Materials passende Beispiele — nie generische Platzhalter wie "Unternehmen X". Leite die Beispiele aus dem Fach ab: Wirtschaft → echte Firmen (Netflix, Tesla …); Informatik → reale Systeme/Datensätze/Algorithmen; Naturwissenschaft → konkrete Phänomene/Experimente; Jura → echte Fälle/Paragraphen.
- MNEMONICS (Eselsbrücken): wo immer eine Liste >3 Begriffe ist, baue eine Merkhilfe (z.B. "CLSSS" für 5 Benefits, "Restaurant vs Uber Eats" für Make-or-Buy)
- CROSS-REFERENCES: wenn Konzepte aus verschiedenen Themen zusammenhängen, benenne die Verbindung explizit ("Das Principal-Agent-Problem aus Session 12 erklärt, warum CEOs auch wertvernichtende M&As durchziehen")
- BOLD-HIGHLIGHTS: in Antworten und Erklärungen <strong>kritische Begriffe markieren</strong>, damit der Student die Schlüsselwörter sofort sieht
- DIAGRAMME NUTZEN: Das Material kann Abbildungen/Diagramme enthalten (z.B. ER-Diagramme, Schaubilder, Tabellen). Lies sie und baue ihren Inhalt in Konzepte, Karten und v.a. die Visual Map ein — nicht nur den Fließtext.

OUTPUT-FORMAT
- Antworte mit EINEM JSON-Objekt — keine Markdown-Backticks, kein Text davor oder danach
- Starte DIREKT mit { und ende DIREKT mit }
- Strings korrekt escaped (\\n statt echter Newlines in Strings)`;

export const TASK_CARDS = `AUFGABE: Erstelle die Flashcards für dieses Lernpaket.

REGELN
- 25-40 Karten (NICHT mehr), in 3-5 sinnvollen Kategorien gruppiert (folgen der Kursstruktur, nicht alphabetisch). Bei sehr viel Material: die prüfungsrelevantesten auswählen statt alles abzudecken.
- Jede FRAGE ist SPEZIFISCH und PRÜFUNGSREIF: "Was sind die 4 Building Blocks of Competitive Advantage?" — NICHT "Erkläre Wettbewerbsvorteil"
- Jede ANTWORT ist strukturiert in genau dieser Reihenfolge:
  1. <strong>Kernaussage in einem Satz</strong> (Schlüsselbegriffe gefettet)
  2. <br>Erklärung mit einem KONKRETEN, benannten Beispiel — PFLICHT in JEDER Antwort, niemals abstrakt (echtes System/Firma/Fall/Experiment, z.B. PostgreSQL, Amazon, eine konkrete Studenten-DB — je nach Fach). Eine Karte ohne konkretes Beispiel ist ein Fehler.
  3. <br><em>Eselsbrücke:</em> wenn eine Liste >3 Elemente hat ODER der Begriff verwechselbar ist, baue eine Merkhilfe (Akronym, Analogie, "B goes Back"-Trick)
- Autoren/Quellen in der Antwort nennen wo relevant (z.B. "<strong>Barney (1991)</strong>")
- Difficulty-Verteilung über alle Karten: ~40% easy, ~40% medium, ~20% hard — sei ehrlich, nicht alles mittel

ANTI-PATTERN (mach das NICHT)
- ❌ "Was ist Vertikale Integration?" → "Vertikale Integration ist, wenn ein Unternehmen mehrere Stufen der Wertschöpfungskette kontrolliert."  (trocken, kein Beispiel, keine Merkhilfe)
- ✅ "Was sind die 5 Benefits der vertikalen Integration?" → "<strong>5 Benefits — Eselsbrücke 'CLSSS'</strong><br>Costs lower, qua<strong>L</strong>ity better, <strong>S</strong>cheduling easier, <strong>S</strong>pecialized assets, <strong>S</strong>ecure supply.<br>Beispiel: Tesla integriert die Batterieproduktion (specialized asset), Apple öffnet eigene Stores (secure distribution).<br><em>Eselsbrücke:</em> 'CLSSS' — wie Cliff's, deine Lieblings-Lernhilfe."

JSON-SCHEMA (genau diese Struktur):
{
  "flashcards": [
    { "id": "1", "category": "string", "question": "string", "answer": "string (HTML: <strong>, <em>, <br> erlaubt)", "difficulty": "easy" | "medium" | "hard" }
  ]
}`;

export const TASK_SIMULATOR = `AUFGABE: Erstelle den Prüfungs-Simulator (Multiple-Choice-Fragen) für dieses Lernpaket.

REGELN
- 12-18 Fragen (NICHT mehr), möglichst breit über das Kursmaterial verteilt
- SZENARIO-BASIERT mit konkreten, fachpassenden Akteuren (Firma, System, Institution …) — nicht "Was ist X?", sondern "Akteur X tut Y. Das ist ein Beispiel für..."
- Jede Frage testet ANWENDUNG, nicht Definition. Beispielmuster:
  * "Netflix wechselte vom Lizenzieren von Inhalten zum Eigenproduzieren. Das ist ein Beispiel für: a) Forward Integration  b) <strong>Backward Integration</strong>  c) Horizontal Merger  d) Unrelated Diversification"
  * "Ein Beratungshaus stellt Analysten in Festanstellung ein statt Freelancer. Welcher INTERNE Transaktionskostentyp rechtfertigt das?"
- 3-4 Optionen pro Frage, GENAU EINE richtig
- Distraktoren müssen plausibel sein — keine offensichtlichen Füller-Antworten. Idealerweise verwechselt der Student häufig genau diese Konzepte.
- Mische ein paar True/False-Fragen ein (~20% der Fragen) für Begriffsabgrenzung. Bei T/F nimm 2 Optionen ("True", "False") und prüfe eine konkrete Aussage.

ERKLÄRUNG (das ist das WICHTIGSTE Feld)
Schreibe in der explanation:
1. <strong>Warum die richtige Antwort richtig ist</strong> — mit Bezug auf das spezifische Konzept aus dem Material
2. Warum die FALSCHEN Optionen falsch sind — kurz und distinkt, sodass der Student den Unterschied lernt
3. Wenn relevant, verweise auf einen Querbezug ("Das ist NICHT zu verwechseln mit X")
Beispiel-Erklärung: "Content = der INPUT, den Netflix streamt. Eigene Inhalte zu produzieren = <strong>Backward Integration</strong> in die Produktionsstufe. Forward wäre Geräte (TVs) oder Kinos. Horizontal wäre Fusion mit Hulu. Unrelated wäre Netflix kauft eine Fluglinie."

KATEGORIE-TAG (für Filter im UI)
Setze "category" pro Frage auf das Hauptthema (z.B. "Vertical Integration", "Global Strategies", "Diversification"). Konsistente Naming über alle Fragen für dasselbe Thema.

JSON-SCHEMA (genau diese Struktur):
{
  "simulator": {
    "questions": [
      {
        "id": "q1",
        "scenario": "string (Kontextbeschreibung, kann leer sein)",
        "question": "string (die eigentliche Frage)",
        "options": ["string"],
        "correctIndex": number,
        "explanation": "string (HTML <strong>/<em> erlaubt, mit allen 4 Punkten oben)",
        "category": "string (das Hauptthema dieser Frage)"
      }
    ]
  }
}`;

export const TASK_BLUEPRINT = `AUFGABE: Erstelle das Essay-Blueprint für dieses Lernpaket.

REGELN
- Erstelle immer ein detailliertes, prüfungsnahes Blueprint (dieser Task läuft nur für Essay- und Open-Book-Klausuren).
- Klare Struktur: Einleitung, Hauptteil (mehrere Absätze), Schluss
- Jeder Absatz liefert: Ziel (instruction), 1-2 Template-Sätze (template), benötigte Referenzen (references), realistische Wortzahl + Zeitbudget
- Template-Sätze enthalten KONKRETE Referenzen mit echten Autoren ("Nach <strong>Barney (1991)</strong>..."), KEINE Platzhalter wie "[Autor einfügen]"
- references-Array: nur real existierende Autoren/Quellen aus dem Material, keine Phantasie-Namen
- Gesamtwortzahl und Zeitbudget müssen für die Prüfungsdauer realistisch sein
- Checkliste am Ende mit konkreten, prüfbaren Items ("Habe ich Barney UND Porter zitiert?", "Steht meine These im ersten Satz des Hauptteils?")

JSON-SCHEMA (genau diese Struktur):
{
  "essayBlueprint": {
    "totalWords": number,
    "timeMinutes": number,
    "parts": [
      { "title": "string", "words": number, "minutes": number, "paragraphs": [
        { "label": "string", "instruction": "string", "template": "string", "references": ["string"] }
      ] }
    ],
    "checklist": ["string"]
  }
}`;

export const TASK_VISUAL_MAP = `AUFGABE: Erstelle eine VISUAL MAP — die wichtigsten Konzepte des Materials als typisierte visuelle Bausteine, NICHT als Fließtext und NICHT als gleichförmige Karten-Wand. Das ist das HERZSTÜCK des Lernpakets.

GOLDENE REGEL (das Wichtigste)
WÄHLE FÜR JEDEN INHALT DEN FRAMEWORK-TYP, DESSEN FORM ZU IHM PASST.
- Zwei oder drei Sachen, die man kontrastiert → **comparison**
- Eine Definition oder ein "das musst du auswendig wissen" → **callout**
- Eine Abfolge / ein Prozess / eine Wertschöpfungskette → **flow**
- Eine Begriff→Erklärung-Liste oder "Kritiker vs Befürworter" Tabelle → **table**
- 2-4 verwandte gleichrangige Konzepte (Geschwister) → **concept_grid**
- Eine 2x2-Logik (zwei Achsen) → **matrix2x2**
- Eine Liste mit Akronym/Eselsbrücke → **mnemonic**
- Eine Kernformel oder zentrale Bedingung → **formula**
- Cross-Reference zwischen zwei Themen → **link_note**
NIEMALS alles als concept_grid abladen. Niemals Fließtext in einem callout, wenn es eine Tabelle sein sollte. Die VISUAL FORM ist der eigentliche Lerneffekt.

WAS DU BAUST
Eine Liste von "blocks" (Themen-Sektionen). Jeder Block ist EIN Hauptthema und enthält 2-5 Frameworks. Innerhalb eines Blocks: variiere die Typen — eine reine Wand aus dem gleichen Typ ist genauso schlecht wie Fließtext.

PRÜFUNGS-PRIORITÄT (entscheidend für UI-Hierarchie)
Setze pro Block:
- "priority": "highest" | "high" | "moderate" | "quick_win"  — wie wichtig dieses Thema für die Prüfung ist
- "timeMinutes": geschätzte Lernzeit in Minuten (10-60)
- "icon": EIN einzelner Emoji der das Thema visuell verankert (🚪 für Entry Modes, ⚠️ für Risiken, 🌐 für Globalisierung, 🏢 für Unternehmen, 💱 für Finanzen, 🔬 für Methoden …)
- "subtitle": KURZER Tag-Text in der Form "Topic N — Foundation" / "Topic N — HIGHEST EXAM PRIORITY" / "Topic N — Quick Win". Wird als uppercase Tag angezeigt.

Priorität bedeutet WIRKLICH Prüfungsrelevanz, nicht Kapitelreihenfolge: das Kern-Modell aus dem Material ist "highest"; die Randnotiz ist "quick_win". Sei mutig — wenn alles "high" ist, ist nichts "high".

FARB-CODIERUNG
Jeder Block bekommt eine "color": "blue" | "cyan" | "green" | "amber" | "violet" | "rose". Wechsle die Farben durch, sodass benachbarte Blöcke unterscheidbar sind. Erster Block typischerweise blue (Big Picture).

CONTENT-DIÄT (ruthless)
- Nur prüfungsrelevantes. Wenn ein Detail nicht in einer realistischen Klausur-Frage auftauchen würde, lass es weg.
- KONKRETE, fachpassende Beispiele in den Erklärungen (echte Firmen/Systeme/Studien) — keine generischen "Firma X".
- Pro Block max 5 Frameworks. Lieber 3 dichte als 6 lockere.

DIE 9 FRAMEWORK-TYPEN

1. **callout** — Definition, "know this cold", zentrale Aussage
   tone: "definition" (blau) | "insight" (violett) | "warning" (rot) | "neutral"
   Felder: kind, tone?, title?, body (HTML <strong>/<em> erlaubt)

2. **comparison** — A vs B, Pro vs Con, zwei Schulen
   Felder: kind, title, left { label, tone?: "pro"|"con"|"neutral", items[] }, right { label, tone?, items[] }, explanation?

3. **flow** — Prozessfluss, Spektrum, "von A zu Z"
   Felder: kind, title, boxes (≥2, je { label, sub?, accent? }), arrows ("right" | "bidirectional" | "plus"), explanation?

4. **table** — Begriffsliste, Kritiker/Befürworter, mehrspaltige Übersicht
   Felder: kind, title?, headers? (Spaltenüberschriften, optional), rows[][] (jede Zeile ein String-Array mit gleicher Länge), caption?
   Beispiel: { "headers": ["Topic", "Kritiker", "Befürworter"], "rows": [["Jobs", "...", "..."], ["Inequality", "...", "..."]] }

5. **concept_grid** — 2-4 gleichrangige Geschwister-Konzepte
   Felder: kind, title?, cards[] (je { title, body, icon?, accent? }), accentEdge?: "top" | "left"
   accentEdge "top" = farbige Linie oben (gut für 4er-Grid), "left" = links (gut für 2er-Reihe). Default: "top".

6. **matrix2x2** — 2x2-Matrix
   Felder: kind, title, xAxis { label, low, high }, yAxis { label, low, high }, cells (4 Stück: { x, y, title, sub?, highlight? }), explanation?
   highlight: true auf der einen "holy grail"-Zelle.

7. **mnemonic** — Akronym + Hook
   Felder: kind, title, acronym, expansion[] (je { letter, meaning }), hook? (Analogie/Merksatz)

8. **formula** — Kernformel oder zentrale Bedingung
   Felder: kind, title?, formula, sub?

9. **link_note** — Cross-Reference zwischen Themen
   Felder: kind, fromTopic, toTopic, explanation

ANTI-PATTERN (mach das NICHT)
- ❌ Alles in concept_grid stopfen — das ist die "Wall of Cards"-Falle. Eine Tabelle gehört in table, ein Prozess in flow, eine Definition in callout.
- ❌ Block ohne priority/timeMinutes/icon — die Roadmap fällt sonst aus.
- ❌ Comparison ohne tone, table ohne headers (wenn die Spalten Bedeutung haben), callout ohne tone.
- ❌ Concept-Cards mit Roman-Body — body sollte 1-3 prägnante Sätze sein.
- ❌ Fließtext-Frames mit 4 langen Absätzen.

JSON-SCHEMA (genau diese Struktur):
{
  "visualMap": {
    "blocks": [
      {
        "title": "string",
        "subtitle": "string (z.B. 'Topic 4 — HIGHEST EXAM PRIORITY')",
        "color": "blue" | "cyan" | "green" | "amber" | "violet" | "rose",
        "icon": "string (ein Emoji)",
        "priority": "highest" | "high" | "moderate" | "quick_win",
        "timeMinutes": number,
        "frameworks": [
          { "kind": "callout", "tone": "definition|insight|warning|neutral", "title": "string", "body": "string (HTML <strong>/<em> erlaubt)" },
          { "kind": "comparison", "title": "string", "left": {"label": "string", "tone": "pro|con|neutral", "items": ["string"]}, "right": {"label": "string", "tone": "pro|con|neutral", "items": ["string"]}, "explanation": "string" },
          { "kind": "flow", "title": "string", "boxes": [{"label": "string", "sub": "string", "accent": "blue|cyan|green|amber|violet|rose"}], "arrows": "right|bidirectional|plus", "explanation": "string" },
          { "kind": "table", "title": "string", "headers": ["string"], "rows": [["string"]], "caption": "string" },
          { "kind": "concept_grid", "title": "string", "cards": [{"title": "string", "body": "string", "icon": "string", "accent": "blue|cyan|green|amber|violet|rose"}], "accentEdge": "top|left" },
          { "kind": "matrix2x2", "title": "string", "xAxis": {"label": "string", "low": "string", "high": "string"}, "yAxis": {"label": "string", "low": "string", "high": "string"}, "cells": [{"x": "low|high", "y": "low|high", "title": "string", "sub": "string", "highlight": true|false}], "explanation": "string" },
          { "kind": "mnemonic", "title": "string", "acronym": "string", "expansion": [{"letter": "C", "meaning": "Costs lower"}], "hook": "string" },
          { "kind": "formula", "title": "string", "formula": "string", "sub": "string" },
          { "kind": "link_note", "fromTopic": "string", "toTopic": "string", "explanation": "string" }
        ]
      }
    ]
  }
}`;

export const TASK_META = `AUFGABE: Erstelle Konzept-Übersicht, Autoren-Cheat-Sheet, Lernplan und Kurs-Titel.

COURSE TITLE
Klarer, präziser Titel des Kurses/Themas ("Global Strategic Management — Session 9: Strategic Change and Innovation").

OVERVIEW (das WICHTIGSTE Feld nach Simulator)
- HARTE GRENZE: höchstens 6 Topics, je höchstens 6 Konzepte — insgesamt MAXIMAL ~28 Konzepte. Bei viel Material NICHT alles auflisten, sondern gnadenlos die prüfungsrelevantesten auswählen.
- Gruppiere Konzepte nach Kursthemen (topics) — NICHT alphabetisch, sondern in der Reihenfolge wie sie aufeinander aufbauen
- Markiere die 5-8 wichtigsten Konzepte mit importance: "high" — sei selektiv, nicht jedes Konzept ist "high"
- Jedes Konzept liefert:
  * term: kompakter Begriff
  * essence: GENAU EIN Satzteil, MAX 6 Wörter, der das Konzept auf den Punkt bringt. Wird im Scan-View als One-Liner unter dem term gezeigt. KEIN Punkt am Ende, keine Definition — die kondensierte Essenz. Beispiele: "verstärkende Aktivitäten = Wettbewerbsvorteil", "Plan + Anpassung = Realisierte Strategie", "Diagnose → Leitidee → Aktionen". Ruthless kurz.
  * author: Quelle/Autor (oder "" wenn kein spezifischer Autor)
  * definition: 1-2 knappe Sätze, KEINE Romane. Mit <strong>Schlüsselbegriffen gefettet</strong>.
  * importance: "high" | "medium" | "low"
  * examRelevance: ein präziser Satz "Wird in Klausuren häufig als [Fragetyp] gefragt, weil [Grund]". Konkret, nicht generisch.
  * relevanceTag: NUR setzen, wenn ein ALTKLAUSUR-LENS aktiv ist (siehe System-Prompt). Werte: "kam dran" (Konzept hat Profil-Evidenz / war in der Altklausur), "Prof-Hinweis" (vom Prof in den Hinweisen markiert), "beides" (Profil UND Hinweise). Ohne Lens-Brief: weglassen.

CROSS-REFERENCES (mach es)
Wo Konzepte aus VERSCHIEDENEN Topics zusammenhängen, baue die Verbindung in die examRelevance ein:
- ✅ "Das <strong>Principal-Agent-Problem</strong> aus Session 12 erklärt, warum CEOs auch wertvernichtende M&As (Session 15) durchziehen — ihr Bonus hängt an Firmen-Größe, nicht Profit."
- ✅ "Setzt voraus, dass du <strong>Porter's Diamond</strong> aus Session 14 verstanden hast — Diamond sagt WO Industrien stark sind, dieser Begriff sagt WIE das ausgenutzt wird."

AUTHORS CHEAT-SHEET
Für jeden wichtigen Autor (höchstens 8 — nur die prüfungsrelevanten):
- name: voller Name
- theory: in EINEM Satz seine Kernaussage
- useInExam: konkrete Anweisung "Nimm Barney, wenn die Frage X stellt. Nicht verwechseln mit Y."

SCHEDULE
Tag-für-Tag-Plan (höchstens 10 Tage). Wenn kein Datum im Material: gehe von 7 Tagen aus. Jeder Tag bekommt 2-4 konkrete, abhakbare Aufgaben (z.B. "Tag 1: Sessions 9-10 querlesen + Karteikarten Kategorie 'Strategy' durchgehen").

JSON-SCHEMA (genau diese Struktur):
{
  "courseTitle": "string",
  "overview": {
    "topics": [
      { "name": "string", "concepts": [
        { "term": "string", "essence": "string (max. 6 Wörter, kein Punkt)", "definition": "string (HTML <strong>/<em> erlaubt)", "author": "string", "importance": "high" | "medium" | "low", "examRelevance": "string (HTML <strong>/<em> erlaubt, mit Cross-References wo sinnvoll)", "relevanceTag": "kam dran | Prof-Hinweis | beides (NUR mit aktivem Altklausur-Lens)" }
      ] }
    ]
  },
  "authors": [
    { "name": "string", "theory": "string", "useInExam": "string" }
  ],
  "schedule": {
    "daysUntilExam": number,
    "days": [
      { "day": number, "label": "string", "tasks": ["string"] }
    ]
  }
}`;

export const TASK_QUIZ = `AUFGABE: Erstelle ein MULTIPLE-CHOICE-QUIZ — der zentrale Aktiv-Lernteil für offene-Fragen- und mündliche Prüfungen. Ziel: Fragen, die nur jemand richtig beantworten kann, der den Stoff WIRKLICH verstanden hat. Raten darf nicht funktionieren.

UMFANG
- 18-30 Fragen (NICHT mehr). Lieber 20 dichte Fragen als 40 lockere.
- Jede Frage hat genau 4 Optionen (A-D), genau EINE ist richtig.
- Verteile die Fragen breit über den Stoff. Setze "category" pro Frage auf das Hauptthema (für Filter im UI).

DU GENERIERST EIN MULTIPLE-CHOICE-QUIZ.

Ziel: Fragen, die nur jemand richtig beantworten kann, der den Stoff WIRKLICH
verstanden hat. Raten darf nicht funktionieren. Das ist der einzige Maßstab.

Jede Frage hat genau 4 Optionen (A–D), genau EINE ist richtig.

REGELN FÜR DIE FALSCHEN ANTWORTEN (Distraktoren) — das Wichtigste:

1. PLAUSIBEL, NICHT ABSURD.
   Jeder Distraktor muss für jemanden, der den Stoff halb gelernt hat,
   verlockend wirken. Erlaubt sind:
   - ein häufig verwechseltes Nachbarkonzept (z.B. Tactic statt Strategy)
   - eine verbreitete Fehlannahme
   - eine wahre, aber für die Frage irrelevante Aussage
   - das richtige Konzept, falsch angewendet auf den Fall
   VERBOTEN: offensichtlich falsche, alberne oder leere Optionen
   ("Das Unternehmen sollte aufgeben"). Wenn ein Distraktor sofort als
   falsch erkennbar ist, ist die Frage wertlos — verwirf ihn.

2. GLEICHE LÄNGE UND FORM.
   Alle 4 Optionen müssen etwa gleich lang sein und dieselbe grammatische
   Struktur haben. Die richtige Antwort darf NIE die längste, detaillierteste
   oder am stärksten relativierte Option sein — das ist der häufigste Verräter
   in schlechten Quizzes. Keine Option enthält Wörter wie "immer", "nie",
   "alle", "ausschließlich", es sei denn, alle vier tun es.

3. ANWENDUNG STATT WIEDERERKENNEN.
   Bevorzuge Szenario-Fragen, bei denen man das Konzept auf eine konkrete
   Situation anwenden muss, statt "Was ist X?".
   Schlecht: "Was ist eine emergente Strategie?"
   Gut:      "Ein Spielzeughersteller plant Lernspiele, landet aber zufällig
             einen viralen Hit mit einem Zappel-Spielzeug. Dieses
             weiterzuführen ist:"

4. EINE EINDEUTIG RICHTIGE ANTWORT.
   Es darf nicht "zwei könnten stimmen" geben. Wenn zwei Optionen verteidigbar
   sind, schärfe den Stem oder ändere die Optionen.

5. ERKLÄRUNG.
   Die Erklärung sagt knapp, WARUM die richtige Antwort richtig ist UND warum
   der verlockendste Distraktor falsch ist. Max. 2 Sätze.

6. MISCHUNG.
   Variiere die Frageart über das Quiz: Definition-Abgrenzung, Anwendung-auf-Fall,
   Was-fehlt, Zwei-Konzepte-vergleichen, Wahr/Falsch-als-MC.

7. POSITION DER RICHTIGEN ANTWORT zufällig über A–D verteilen. Nicht clustern.

SELBSTTEST vor der Ausgabe — verwirf jede Frage, die das nicht besteht:
- Könnte man die richtige Antwort allein an Länge/Formulierung erraten? → neu schreiben.
- Ist mindestens ein Distraktor offensichtlich Quatsch? → ersetzen.
- Würde ein Experte zwei Optionen für richtig halten? → schärfen.

Sprache: Deutsch (oder die Sprache des Materials). Stem und Optionen klingen wie eine echte Klausurfrage,
nicht wie ein Lückentext.

BEISPIEL EINER GUTEN FRAGE:
{
  "type": "apply",
  "stem": "Eine Billigfluglinie führt eine First Class ein. Das größte Risiko ist:",
  "options": [
    "First Class ist weltweit grundsätzlich unprofitabel",
    "Es bricht den Fit im Low-Cost-Aktivitätssystem auf",
    "Kunden wollen auf Billigfliegern nie Premium-Angebote",
    "Aufsichtsbehörden verbieten das Mischen von Klassen"
  ],
  "correctIndex": 1,
  "explanation": "Das Low-Cost-Modell beruht auf sich gegenseitig verstärkenden Aktivitäten; eine First Class bricht diesen Fit. Die anderen Optionen klingen plausibel, sind aber pauschal falsch.",
  "conceptRef": "activity-system"
}
Beachte: alle vier Optionen sind ähnlich lang, keine ist offensichtlich Quatsch,
und man muss das Aktivitätssystem-Konzept anwenden, nicht nur erkennen.

CONCEPTREF
Wenn die Frage einen Begriff aus der OVERVIEW prüft, setze "conceptRef" auf genau diesen "term" (case-sensitive Match), damit das UI eine Theorie-Karte einblenden kann. Wenn unklar, lass es weg — lieber kein Ref als ein falscher.

JSON-SCHEMA (genau diese Struktur):
{
  "quiz": {
    "questions": [
      {
        "id": "qz1",
        "type": "definition" | "apply" | "whats_missing" | "compare" | "true_false",
        "stem": "string",
        "options": ["string", "string", "string", "string"],
        "correctIndex": 0 | 1 | 2 | 3,
        "explanation": "string (max. 2 Sätze, HTML <strong>/<em> erlaubt)",
        "conceptRef": "string (optional, Term aus der Overview)",
        "category": "string (Hauptthema für UI-Filter)"
      }
    ]
  }
}`;

export const TASK_OPEN_QUESTIONS = `AUFGABE: Erstelle den Offene-Fragen-Trainer — prüfungsnahe, frei zu beantwortende Fragen (KEINE Multiple-Choice), wie sie in einer schriftlichen Klausur mit offenen Fragen oder einer mündlichen Prüfung drankommen.

REGELN
- 10-15 Fragen (NICHT mehr), breit über das Material verteilt, Schwierigkeit gemischt (~40% easy, ~40% medium, ~20% hard)
- Jede Frage ist eine echte Prüfungsfrage ("Erkläre...", "Vergleiche...", "Wann setzt man X ein und warum?") — anwendungs-/verständnisorientiert, nicht bloße Begriffsabfrage
- modelAnswer: prägnante, vollständige Musterlösung wie von einem 1,0-Studenten — strukturiert, mit <strong>Schlüsselbegriffen</strong> und konkretem, fachpassendem Beispiel. Kein Roman: 3-6 Sätze.
- keyPoints: 2-5 knappe, prüfbare Stichpunkte "Das muss in deine Antwort rein" — die Punkte, die ein Korrektor abhakt
- difficulty pro Frage; category = Hauptthema der Frage (für Filter)

JSON-SCHEMA (genau diese Struktur):
{
  "openQuestions": {
    "questions": [
      { "id": "oq1", "question": "string", "modelAnswer": "string (HTML <strong>/<em>/<br> erlaubt)", "keyPoints": ["string"], "difficulty": "easy" | "medium" | "hard", "category": "string" }
    ]
  }
}`;

export const TASK_ANALYSIS = `AUFGABE: Analysiere das Kursmaterial und erstelle ein kompaktes PRÜFUNGS-BRIEFING — eine interne Analyse, die anschließend genutzt wird, um Karteikarten, Trainer, Visual Map und Übersicht prüfungsfokussiert zu erstellen. Das ist KEIN Endprodukt für den Studenten, sondern Steuerungs-Input für die Generierung.

Schreibe knappen, strukturierten FLIESSTEXT (KEIN JSON, keine Markdown-Codeblöcke). Decke ab:
1. KERN-KONZEPTE (5-8): die prüfungskritischsten Begriffe — je mit einem Satz, WARUM es geprüft wird.
2. FRAGE-MUSTER & FALLEN: wie dieser Stoff typischerweise abgefragt wird; häufig verwechselte Begriffspaare.
3. SCHWIERIGKEITS-HOTSPOTS: was Studenten erfahrungsgemäß falsch machen.
4. SCHLÜSSEL-AUTOREN/QUELLEN: wer/was zitiert werden muss.
5. QUERVERWEISE: welche Themen zusammenhängen und wie.
6. PRÜFUNGSTYP-FOKUS: was beim oben genannten Prüfungsformat besonders zählt.

Maximal ~400 Wörter. Priorisiere hart — lieber wenige scharfe Punkte als eine Aufzählung von allem.`;

// =========================================================================
// FORMAT-SPECIFIC EMPHASIS
// =========================================================================
// Appended to the system prompt for every generation so each task tunes its
// output to the user's exam format. The Verstehens-Layer (Visual Map,
// Übersicht, Karteikarten) are format-independent — the directive shifts
// emphasis, not structure.

// Map the internal exam_type values (with `multiple_choice`) to the short
// form the directive uses in its rules block (mc / open_questions / etc).
const FORMAT_SLUG: Record<string, string> = {
  multiple_choice: "mc",
  open_questions: "open_questions",
  oral: "oral",
  open_book: "open_book",
  essay: "essay",
};

const FORMAT_HUMAN: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  open_questions: "Offene Fragen (schriftlich)",
  oral: "Mündliche Prüfung",
  open_book: "Open Book / Take-Home",
  essay: "Klausur-Aufsatz",
};

// =========================================================================
// RELEVANCE BRIEF — Altklausur-engine lens
// =========================================================================
// Built from the exam's persisted profile (analysed past exam), instructor
// hints, and the user-chosen fidelity. Appended to BASE_SYSTEM_PROMPT for
// every task call when the user picked Path A or supplied hints.
//
// Returns null when there's nothing to inject (no profile + no hints) so
// the caller can skip the directive entirely.

export type FidelityLevel = "strict" | "likely" | "broad";

const FIDELITY_GUIDANCE: Record<FidelityLevel, string> = {
  strict:
    "BLEIB ENG am Profil + Hinweisen. Generiere fast ausschließlich zu den Themen, die laut Profil hohes weight haben oder vom Prof markiert wurden. Imitiere den Phrasing-Style 1:1. Themen ohne Evidenz: weglassen.",
  likely:
    "GEWICHTE klar nach Profil + Hinweisen, aber nimm angrenzende Themen mit hohem Lern-ROI mit. Wenn ein Konzept zwar nicht in der Altklausur kam, aber direkt mit einem zentralen Profil-Thema verknüpft ist, gehört es leicht-priorisiert dazu.",
  broad:
    "DECKE BREIT AB. Nutze das Profil nur als sanfte Priorisierung — bei Tie-Breakern bevorzugt, aber kein hartes Filter. Der Studierende will keine Lücken riskieren.",
};

export function buildRelevanceBrief(input: {
  profile: unknown; // ExamProfile JSON or null
  hints: string | null;
  fidelity: FidelityLevel;
}): string | null {
  const hasProfile =
    input.profile && typeof input.profile === "object" && Object.keys(input.profile as object).length > 0;
  const hasHints = !!input.hints && input.hints.trim().length > 0;
  if (!hasProfile && !hasHints) return null;

  const profileBlock = hasProfile
    ? JSON.stringify(input.profile, null, 2)
    : "(keine Altklausur-Analyse vorhanden)";
  const hintsBlock = hasHints ? input.hints!.trim() : "(keine zusätzlichen Hinweise)";
  const fidelityName = input.fidelity;
  const fidelityGuide = FIDELITY_GUIDANCE[input.fidelity];

  return `=== ALTKLAUSUR-LENS (gewichte den Stoff danach) ===

SO SIEHT DIE ECHTE PRÜFUNG AUS (aus der Altklausur des Nutzers abgeleitet):
${profileBlock}

ZUSÄTZLICHE HINWEISE DES NUTZERS / PROFS:
${hintsBlock}

FIDELITY: ${fidelityName}
${fidelityGuide}

GEWICHTE DEN LERNSTOFF ENTSPRECHEND:
- Priorisiere Themen mit hohem 'weight' im Profil. Generiere dort MEHR und TIEFERE Übungen, Karten und Konzepte.
- Kürze oder überspringe Stoff, der laut Profil nie geprüft wird (außer Verstehens-Layer, die universal sind).
- Imitiere die Fragestile und 'phrasing_style' der Altklausur (z. B. Fallbeispiele statt reiner Definitionsfragen, wenn die Altklausur so ist).
- Markiere im Übersichts-Output JEDES Schwerpunkt-Konzept mit einem "relevanceTag" der erklärt WARUM es Schwerpunkt ist: "kam dran" (Profil-Evidenz), "Prof-Hinweis" (aus Hinweisen), oder "beides".

Wichtig: Das ist eine Wahrscheinlichkeits-Gewichtung, keine Garantie.`;
}

export function buildFormatDirective(examType: string): string {
  const slug = FORMAT_SLUG[examType] ?? "mc";
  const human = FORMAT_HUMAN[examType] ?? "Multiple Choice";
  return `=== PRÜFUNGSFORMAT (steuert Emphase aller Aufgaben) ===

Der Nutzer wird in folgendem Format geprüft: ${slug} (${human}).
Priorisiere die Inhalte entsprechend — Verstehens-Layer (Visual Map,
Übersicht, Karteikarten) bleiben immer gleich, aber der Übungsteil muss
zum Prüfungsformat passen:

- mc (Multiple Choice): Erzeuge VIELE knifflige MC-Fragen, tiefer und mehr
  als sonst. Distraktoren nach den MC-Regeln (plausibel, gleiche Länge,
  Anwendung statt Wiedererkennen).
- open_questions (Offene Fragen, schriftlich): Kurze offene Fragen mit
  klaren Musterantworten und den Stichpunkten, die die Korrektur sehen will.
- oral (Mündliche Prüfung): Schnelle Recall- und Erklär-Prompts
  ("Erklär X laut in 30 Sekunden"), typische Nachfragen des Prüfers,
  Stolperfallen im Gespräch.
- open_book (Open Book / Take-Home): Weniger Auswendiglernen, mehr
  "wo steht das" und "wie wende ich es auf einen Fall an" — Anwendung
  und Navigation statt Memorieren.
- essay (Klausur-Aufsatz): Generiere einen Aufsatz-Plan mit wahrscheinlichen
  Klausurfragen, je mit Kernthese, 3-5 Argumentschritten, Absatz-Cues und
  konkreten Beispielen — der Student soll den Skelett-Aufbau seiner Antwort
  vor der Klausur einmal komplett gedacht haben.`;
}

// =========================================================================
// TASK_ESSAY_PREDICTIONS — runs ONLY when exam_type === "essay"
// =========================================================================

export const TASK_ESSAY_PREDICTIONS = `AUFGABE: Erstelle einen AUFSATZ-PLAN — eine Liste der 5-8 wahrscheinlichsten Klausurfragen für diese Essay-Prüfung. Für jede Frage produzierst du das Gerüst der Antwort, sodass der Student den Skelett-Aufbau einmal komplett gedacht hat, bevor er in die Klausur geht.

WAS DU LIEFERST PRO FRAGE
1. **question** — die wahrscheinliche Klausurfrage (deutsch). Klingt wie eine echte Prüfungsfrage: anwendungs-/diskursorientiert, nicht "Was ist X?". Beispiele:
   - "Diskutiere die Trade-offs von Vertikaler Integration anhand eines selbst gewählten Beispiels."
   - "Welche Strategie würdest du für Netflix nach 2023 empfehlen und warum?"
   - "Vergleiche Mintzbergs Sicht auf Strategie mit Porter's und beziehe Stellung."

2. **thesis** — EIN Satz, der die Kernaussage der Antwort verdichtet. Eine echte These, nicht "Vertikale Integration ist wichtig". Sondern: "Vertikale Integration zahlt sich nur aus, wenn die internen Transaktionskosten der Eigenproduktion klar unter denen des Markts liegen — sonst zerstört sie Wert."

3. **structure** — 3-5 Argumentationsschritte, in der Reihenfolge, in der sie im Aufsatz kommen. Jeder Schritt ist eine kompakte Aussage, NICHT ein Absatztitel.
   Beispiel: ["Definiere VI über das Make-or-Buy-Trade-off-Modell", "Zeige die 5 Benefits (CLSSS)", "Konter mit den 4 Risiken", "Wende auf Tesla-Fallbeispiel an", "Schließe mit Bedingung: TCE < Marktkosten"]

4. **paragraphCues** — Für jeden Hauptabsatz EIN Satz: was kommt rein + welcher Begriff / welche Quelle wird zitiert. Format: "Absatz N: [Inhalt] — zitiere [Autor/Konzept]."
   Beispiel: ["Absatz 1 — Einleitung: definiere VI; nenne Make-or-Buy-Frage als Anker.", "Absatz 2 — Benefits: zitiere CLSSS-Mnemonic, Beispiel Tesla-Batterieproduktion.", "Absatz 3 — Risiken: zitiere Williamson (TCE), Beispiel Boeing-787-Outsourcing-Krise."]

5. **examples** — 1-2 konkrete, fachpassende Beispiele, die der Student in die Antwort einbauen soll. Echte Firmen, Studien oder Fälle. KEIN "Unternehmen X".
   Beispiel: ["Tesla — vertikale Integration der Batterieproduktion als Cost+SecureSupply-Beleg.", "Boeing 787 Dreamliner — gescheiterte Outsourcing-Strategie 2007-2011 als Risiko-Beleg."]

REGELN
- Wähle Fragen, die zu diesem konkreten Material passen — keine generischen Klausurfragen "an sich". Wenn das Material auf BWL spezialisiert ist, frag BWL-Sachen. Bei Jura → echte Fallkonstellationen. Bei Informatik → Architektur-/Entwurfsfragen.
- 5-8 Fragen insgesamt (NICHT mehr). Decke unterschiedliche Themenbereiche ab, die in der Klausur wahrscheinlich kombiniert werden.
- Wenn das Material mehrere Schulen/Theorien gegeneinanderstellt, mache mindestens EINE Frage zu einem Vergleich oder einer Diskussion ("Wäge ab", "Vergleiche", "Stellung beziehen").

ANTI-PATTERN
- ❌ "Erkläre X" als Aufsatzfrage. Aufsatzfragen sind argumentativ, nicht beschreibend.
- ❌ Generische These ("X ist ein wichtiges Konzept").
- ❌ Structure mit weniger als 3 oder mehr als 5 Schritten.
- ❌ Paragraph-Cues ohne Zitat/Quelle.
- ❌ Examples mit "Unternehmen X" oder "ein bekanntes Beispiel".

JSON-SCHEMA (genau diese Struktur):
{
  "essayPredictions": {
    "predictions": [
      {
        "id": "ep1",
        "question": "string",
        "thesis": "string (ein Satz)",
        "structure": ["string", "string", "string"],
        "paragraphCues": ["string"],
        "examples": ["string"]
      }
    ]
  }
}`;

// =========================================================================
// PER-TASK LENS ADDENDUM — concentration, not just tagging
// =========================================================================
// The relevance brief in the system prompt told the model to "weight by
// profile". In practice the rest of each task's instruction ("breit über
// den Stoff verteilen" / "max 6 Topics × 6 Konzepte") dominated and the
// lens shallowed out to tags. This addendum fixes that:
//
//   • Precomputes per-topic slot allocations from the profile weights.
//   • Tells each task EXPLICITLY how many cards/questions/concepts per
//     topic, plus the required order (topics by weight desc).
//   • Replaces the contradicting "breit verteilen" lines for QUIZ /
//     SIMULATOR when a lens is active.
//   • Restates `extraInfo` near the task instruction so its steering
//     isn't buried under 120k tokens of material.
//
// Injected as a user-message text block IMMEDIATELY BEFORE the task
// instruction by runTaskOnce — strongest recency position. The system-
// level relevance brief stays where it is (defense-in-depth).
// =========================================================================

// Re-uses the schema types so allocator math has typed access to topic[].weight.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { ExamProfile } from "@/lib/schema";

type LensTaskKey =
  | "cards"
  | "simulator"
  | "blueprint"
  | "meta"
  | "visualMap"
  | "quiz"
  | "essayPredictions";

export type LensContext = {
  profile: ExamProfile;
  fidelity: FidelityLevel;
};

// Fidelity-aware proportional allocator. Returns one entry per kept topic,
// sorted by weight desc. In strict mode, topics with weight < 0.05 are
// dropped entirely; in likely/broad they get at least 1 / 2 slots.
function allocateSlots(
  profile: ExamProfile,
  totalBudget: number,
  fidelity: FidelityLevel,
): { name: string; weight: number; slots: number }[] {
  const topics = profile.topics ?? [];
  if (topics.length === 0) return [];

  const STRICT_THRESHOLD = 0.05;
  const pool =
    fidelity === "strict"
      ? topics.filter((t) => t.weight >= STRICT_THRESHOLD)
      : topics;
  const effective = pool.length > 0 ? pool : topics;
  const sumWeights = effective.reduce((s, t) => s + t.weight, 0);

  // Profile present but all weights zero → fall back to even split.
  if (sumWeights === 0) {
    const even = Math.max(1, Math.floor(totalBudget / effective.length));
    return effective
      .map((t) => ({ name: t.name, weight: t.weight, slots: even }))
      .sort((a, b) => b.weight - a.weight);
  }

  const minPerTopic = fidelity === "broad" ? 2 : 1;
  const allocated = effective.map((t) => ({
    name: t.name,
    weight: t.weight,
    slots: Math.max(
      minPerTopic,
      Math.round((t.weight / sumWeights) * totalBudget),
    ),
  }));
  return allocated.sort((a, b) => b.weight - a.weight);
}

function formatAllocationTable(
  allocations: { name: string; weight: number; slots: number }[],
  unitLabel: string,
): string {
  return allocations
    .map(
      (a) =>
        `- ${a.name} (Profil-Gewicht ${a.weight.toFixed(2)}) → ${a.slots} ${unitLabel}`,
    )
    .join("\n");
}

function fidelityPolicyLine(fidelity: FidelityLevel): string {
  if (fidelity === "strict")
    return "Bei fidelity=strict: Themen ohne Profil-Evidenz KOMPLETT WEGLASSEN.";
  if (fidelity === "likely")
    return "Bei fidelity=likely: angrenzende Themen mit hohem ROI dürfen MINIMAL vorkommen, dominieren aber nicht.";
  return "Bei fidelity=broad: breite Abdeckung; Profil-Gewichte sind weiche Priorisierung, kein Filter.";
}

// Task-specific budgets — match the same numeric targets the base TASK_X
// prompts already mention, so the addendum's allocation totals roughly to
// what the task would produce anyway.
const TASK_BUDGET: Record<LensTaskKey, number> = {
  cards: 30, // TASK_CARDS says 25-40
  simulator: 15, // TASK_SIMULATOR says 12-18
  quiz: 24, // TASK_QUIZ says 18-30
  meta: 24, // TASK_META says max 6×6=28, we use 24 for the lens
  blueprint: 0, // single artifact, no per-topic count
  visualMap: 0, // block-ordering, not slot-counting
  essayPredictions: 0, // 5-8 questions, we'll prose-instruct topic pick
};

function buildLensSectionForTask(
  key: LensTaskKey,
  lens: LensContext,
): string {
  const { profile, fidelity } = lens;
  const phrasing = profile.phrasing_style?.trim()
    ? `\nPhrasing-Style aus dem Profil (1:1 imitieren): "${profile.phrasing_style.trim()}"`
    : "";
  const patterns =
    profile.recurring_patterns && profile.recurring_patterns.length > 0
      ? `\nWiederkehrende Muster (einbauen): ${profile.recurring_patterns.join("; ")}`
      : "";
  const fidLine = fidelityPolicyLine(fidelity);

  if (key === "meta") {
    const alloc = allocateSlots(profile, TASK_BUDGET.meta, fidelity);
    const table = formatAllocationTable(alloc, "Konzepte");
    return `=== LENS-ADDENDUM FÜR ÜBERSICHT (jetzt anwenden, überschreibt die 6×6-Grenze) ===

KONZEPT-SLOT-ALLOKATION nach Altklausur-Profil:
${table}

REGELN
- TOPIC-REIHENFOLGE: Sortiere "topics" im Output ABSTEIGEND nach dem Profil-Gewicht. Erstes Topic = höchstes weight. NICHT nach Kapitel-Reihenfolge sortieren.
- Folge der Allokation oben statt der "max 6×6=28"-Regel aus der Haupt-Anweisung.
- importance="high" NUR auf Konzepten der 2-3 höchstgewichteten Topics.
- relevanceTag setzen wie in der Haupt-Anweisung beschrieben.
${fidLine}${phrasing}${patterns}`;
  }

  if (key === "cards") {
    const alloc = allocateSlots(profile, TASK_BUDGET.cards, fidelity);
    const table = formatAllocationTable(alloc, "Karten");
    return `=== LENS-ADDENDUM FÜR KARTEIKARTEN (jetzt anwenden) ===

KARTEN-ALLOKATION nach Altklausur-Profil:
${table}

REGELN
- KATEGORIE-REIHENFOLGE: hochgewichtete Topics zuerst und mit MEHR Karten (siehe Tabelle).
- Karten zu hochgewichteten Themen MÜSSEN tiefer sein (Anwendungs-Fragen, nicht reine Definitions-Abfrage).
${fidLine}${phrasing}${patterns}`;
  }

  if (key === "quiz") {
    const alloc = allocateSlots(profile, TASK_BUDGET.quiz, fidelity);
    const table = formatAllocationTable(alloc, "Fragen");
    return `=== LENS-ADDENDUM FÜR QUIZ (jetzt anwenden) ===

ÜBERSCHREIBE die Regel "Verteile die Fragen breit über den Stoff" aus der Haupt-Anweisung. Stattdessen:

FRAGEN-ALLOKATION nach Altklausur-Profil:
${table}

REGELN
- Setze "category" pro Frage auf den exakten Topic-Namen aus der Tabelle, damit man die Verteilung im UI prüfen kann.
- Stems sollen die Phrasierung der Altklausur imitieren (Fallbeispiele statt nur Definitionsfragen, wenn die Altklausur so ist).
${fidLine}${phrasing}${patterns}`;
  }

  if (key === "simulator") {
    const alloc = allocateSlots(profile, TASK_BUDGET.simulator, fidelity);
    const table = formatAllocationTable(alloc, "Fragen");
    return `=== LENS-ADDENDUM FÜR SIMULATOR (jetzt anwenden) ===

ÜBERSCHREIBE die Regel "möglichst breit über das Kursmaterial verteilt" aus der Haupt-Anweisung. Stattdessen:

FRAGEN-ALLOKATION nach Altklausur-Profil:
${table}

REGELN
- Setze "category" pro Frage auf den exakten Topic-Namen aus der Tabelle.
- Stems imitieren den Phrasing-Style der Altklausur.
${fidLine}${phrasing}${patterns}`;
  }

  if (key === "visualMap") {
    // Top-3 ordering hint; no per-block slot count (blocks ≈ topics).
    const top = [...profile.topics]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6);
    const order = top
      .map(
        (t, i) =>
          `${i + 1}. ${t.name} (Profil-Gewicht ${t.weight.toFixed(2)}) — priority="${t.weight >= 0.2 ? "highest" : t.weight >= 0.1 ? "high" : "moderate"}"`,
      )
      .join("\n");
    return `=== LENS-ADDENDUM FÜR VISUAL MAP (jetzt anwenden) ===

BLOCK-REIHENFOLGE (oben = höchstes Profil-Gewicht, MUSS so erscheinen):
${order}

REGELN
- Der erste "block" im Output ist das Topic mit dem höchsten Profil-Gewicht.
- priority="highest" NUR für Topics mit weight ≥ 0.20.
- timeMinutes: hochgewichtete Topics bekommen mehr Lernzeit als niedriggewichtete.
${fidLine}${phrasing}${patterns}`;
  }

  if (key === "essayPredictions") {
    const top = [...profile.topics]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6);
    const list = top
      .map((t) => `- ${t.name} (Profil-Gewicht ${t.weight.toFixed(2)})`)
      .join("\n");
    return `=== LENS-ADDENDUM FÜR AUFSATZ-PLAN (jetzt anwenden) ===

WAHRSCHEINLICHE FRAGEN aus diesen Topics ziehen (oben = höchstes Profil-Gewicht):
${list}

REGELN
- Mindestens 60% der Fragen aus den Top-3 Topics.
- Fragen formulieren wie die Altklausur — Phrasing-Style 1:1.
${fidLine}${phrasing}${patterns}`;
  }

  if (key === "blueprint") {
    const top = profile.topics.length > 0
      ? [...profile.topics].sort((a, b) => b.weight - a.weight)[0]
      : null;
    return `=== LENS-ADDENDUM FÜR ESSAY-BLUEPRINT (jetzt anwenden) ===

${top
  ? `Baue das Blueprint um das Top-Thema "${top.name}" (Profil-Gewicht ${top.weight.toFixed(2)}) herum. Falls die Klausur multiple Aufsätze hat: jeder Hauptteil = eines der Top-3 Profil-Themen.`
  : "Kein klares Top-Thema im Profil — Standard-Blueprint."}

REGELN
- Template-Sätze imitieren den Phrasing-Style der Altklausur.
${fidLine}${phrasing}${patterns}`;
  }

  return "";
}

// Public entry-point: returns the per-task user-message addendum block.
// Returns "" when neither a lens nor user extraInfo is present, so Path-B
// (no profile, no Zusatzinfos) keeps identical content blocks as before.
export function buildTaskUserAddendum(
  key: string,
  lens: LensContext | null,
  extraInfo: string,
): string {
  const parts: string[] = [];
  if (
    lens &&
    lens.profile &&
    Array.isArray(lens.profile.topics) &&
    lens.profile.topics.length > 0
  ) {
    const section = buildLensSectionForTask(key as LensTaskKey, lens);
    if (section) parts.push(section);
  }
  if (extraInfo && extraInfo.trim()) {
    parts.push(
      `=== EXPLIZITE USER-HINWEISE (HOCH PRIORISIERT, JETZT ANWENDEN) ===
${extraInfo.trim()}`,
    );
  }
  return parts.join("\n\n");
}
