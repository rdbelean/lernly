import type { TrainerBundle } from "./types";

const DCF_DIAGRAM_SVG = `<svg viewBox="0 0 680 220" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Arial, sans-serif"><defs><marker id="dcf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--color-primary)"/></marker></defs><line x1="60" y1="40" x2="640" y2="40" stroke="var(--color-line)" stroke-width="2"/><text x="110" y="26" font-size="13" font-weight="700" text-anchor="middle" fill="var(--color-text)">t = 0</text><text x="260" y="26" font-size="13" font-weight="700" text-anchor="middle" fill="var(--color-text)">t = 1</text><text x="410" y="26" font-size="13" font-weight="700" text-anchor="middle" fill="var(--color-text)">t = 2</text><text x="560" y="26" font-size="13" font-weight="700" text-anchor="middle" fill="var(--color-text)">t = 3</text><rect x="45" y="138" width="130" height="58" rx="8" fill="var(--color-work-bg)" stroke="var(--color-primary)"/><text x="110" y="162" font-size="13" font-weight="700" text-anchor="middle" fill="var(--color-text)">Firm value</text><text x="110" y="180" font-size="12" text-anchor="middle" fill="var(--color-text-dim)">= Summe der PVs</text><rect x="205" y="55" width="110" height="44" rx="8" fill="var(--color-surface)" stroke="var(--color-primary)"/><text x="260" y="74" font-size="13" font-weight="700" text-anchor="middle" fill="var(--color-text)">CF1</text><text x="260" y="91" font-size="12" text-anchor="middle" fill="var(--color-text-dim)">10,0 Mio.</text><rect x="355" y="55" width="110" height="44" rx="8" fill="var(--color-surface)" stroke="var(--color-primary)"/><text x="410" y="74" font-size="13" font-weight="700" text-anchor="middle" fill="var(--color-text)">CF2</text><text x="410" y="91" font-size="12" text-anchor="middle" fill="var(--color-text-dim)">10,0 Mio.</text><rect x="505" y="55" width="110" height="44" rx="8" fill="var(--color-surface)" stroke="var(--color-primary)"/><text x="560" y="74" font-size="13" font-weight="700" text-anchor="middle" fill="var(--color-text)">CF3</text><text x="560" y="91" font-size="12" text-anchor="middle" fill="var(--color-text-dim)">10,0 Mio.</text><rect x="495" y="138" width="150" height="58" rx="8" fill="var(--color-urgent-bg)" stroke="var(--color-urgent-ink)"/><text x="570" y="162" font-size="13" font-weight="700" text-anchor="middle" fill="var(--color-text)">TV3 = CF4/(k−g)</text><text x="570" y="180" font-size="12" text-anchor="middle" fill="var(--color-urgent-ink)">11/(8%−1%) = 157,1m</text><line x1="205" y1="90" x2="178" y2="146" stroke="var(--color-primary)" stroke-width="1.6" marker-end="url(#dcf-arrow)"/><line x1="355" y1="92" x2="178" y2="158" stroke="var(--color-primary)" stroke-width="1.6" marker-end="url(#dcf-arrow)"/><line x1="505" y1="94" x2="178" y2="166" stroke="var(--color-primary)" stroke-width="1.6" marker-end="url(#dcf-arrow)"/><line x1="495" y1="170" x2="178" y2="172" stroke="var(--color-primary)" stroke-width="1.6" marker-end="url(#dcf-arrow)"/></svg>`;

export const DEMO_TRAINER_BUNDLE: TrainerBundle = {
  course: {
    schema: "lernly.kurs/1",
    id: "corporate-finance",
    title: "Corporate Finance & Valuation",
    subtitle: "Demo-Kurs im lernly.kurs/1 Format · Klausur 60 P",
    language: "de",
    subjectType: "gemischt",
    exam: {
      date: "2026-12-04",
      time: "09:00",
      durationMin: 60,
      totalPoints: 60,
      aids: "Taschenrechner, keine Formelsammlung",
      format: "Fünf Pflichtaufgaben, bei Q5/Q6 eine Wahlaufgabe.",
      fidelity: "strict",
      parts: [
        {
          id: "I",
          name: "Corporate Finance",
          points: 60,
          slots: [
            {
              id: "q1",
              label: "Q1",
              name: "WACC & Kapitalkosten",
              points: 12,
              frequency: "4 von 5 Altklausuren",
            },
            {
              id: "q2",
              label: "Q2",
              name: "DCF → Equity Value → Buy/Sell",
              points: 15,
              frequency: "5 von 5 Altklausuren",
            },
            {
              id: "q3",
              label: "Q3",
              name: "Modigliani-Miller & Leverage",
              points: 15,
              frequency: "5 von 5 Altklausuren",
            },
            {
              id: "q5",
              label: "Q5",
              name: "Agency Conflicts",
              points: 10,
              choiceGroup: "q5q6",
              frequency: "3 von 5 Altklausuren",
            },
          ],
        },
      ],
    },
    strategy:
      "Starte mit den sicheren Rechenrezepten: **DCF** (15 P, 5/5 Altklausuren) und **WACC** (12 P) liefern fast die halbe Klausur mit immer demselben Ablauf.",
    topics: [
      {
        id: "dcf",
        title: "DCF → Equity Value → Buy or Sell",
        slotIds: ["q2"],
        expectedPoints: 15,
        tier: 1,
        why: "5 von 5 Altklausuren, immer gleiches 6-Schritte-Muster",
        effort: "mittel",
        sources: "Folien 46–64 (Lecture 3), Addendum II, Altklausur 2023 Q2",
      },
      {
        id: "wacc",
        title: "WACC & Tax Shield",
        slotIds: ["q1"],
        expectedPoints: 12,
        tier: 1,
        why: "4 von 5 Altklausuren, Pflichtrezept vor DCF",
        effort: "niedrig",
        sources: "Folien 32–45, Übung 2",
      },
    ],
    notation: "WACC, k_E, k_D, D/E; Beträge in Mio. (m)",
    updatedAt: "2026-11-20",
  },
  topics: {
    dcf: {
      schema: "lernly.thema/1",
      id: "dcf",
      theory: [
        {
          type: "simple",
          md: "Ein Unternehmen ist so viel wert wie alles Geld, das es in Zukunft abwirft. Weil **1 € heute mehr wert ist als 1 € später**, zinsen wir jeden künftigen Cashflow auf heute ab und zählen zusammen = **Unternehmenswert (Firm Value)**. Ziehe den **Marktwert der Schulden** ab, und der Rest gehört den Aktionären (**Equity Value**).",
        },
        {
          type: "example",
          md: "Ein Stand zahlt dir jedes Jahr 10 € für immer. Alternativ bekommst du am Markt 10 %. Wert heute: \\(10 / 0{,}10 = \\mathbf{100\\,€}\\). Wächst der Cashflow um 2 % pro Jahr: \\(10 / (0{,}10 - 0{,}02) = \\mathbf{125\\,€}\\).",
        },
        {
          type: "figure",
          svg: DCF_DIAGRAM_SVG,
          caption:
            "Jeder Pfeil teilt durch \\((1+\\text{WACC})^t\\). Der Terminal Value steht am Ende von Jahr 3 und wird daher 3-mal abgezinst, nicht 4-mal.",
        },
        {
          type: "steps",
          title: "Das 6-Schritte-Rezept (immer gleich)",
          items: [
            "**Formeln zuerst hinschreiben.** Altklausur-Lösungen geben schon dafür Teilpunkte.",
            "**Cashflows für Jahre 1–3 berechnen.** Bei \\(CF_0\\) mit Wachstum \\(g\\): \\(CF_1=CF_0\\cdot(1+g)\\), \\(CF_2=CF_1\\cdot(1+g)\\), …",
            "**Terminal Value bei t = 3:** \\(TV_3=\\frac{CF_4}{\\text{WACC}-g}\\) mit \\(CF_4=CF_3\\cdot(1+g)\\). Ohne Wachstum: \\(TV_3=\\frac{CF}{\\text{WACC}}\\).",
            "**Abzinsen** aller CFs und des TV mit \\((1+\\text{WACC})^t\\) → Summe = Firm Value.",
            "**Equity = Firm Value − MARKTWERT des Fremdkapitals** (nie den Buchwert nehmen!).",
            "**Vergleichen & entscheiden:** Wert je Aktie vs. Kurs → höher = unterbewertet = **buy**, tiefer = **sell**.",
          ],
        },
        {
          type: "formula",
          tex: [
            "PV(CF_t)=\\frac{CF_t}{(1+\\text{WACC})^t}",
            "TV_3=\\frac{CF_4}{\\text{WACC}-g}\\qquad\\text{(ohne Wachstum: }TV_3=\\tfrac{CF}{\\text{WACC}}\\text{)}",
            "\\text{Firm value}=\\sum_{t=1}^{3}\\frac{CF_t}{(1+\\text{WACC})^t}+\\frac{TV_3}{(1+\\text{WACC})^3}",
            "\\text{Equity}=\\text{Firm value}-\\text{Marktwert FK}",
          ],
        },
        {
          type: "heading",
          text: "Durchgerechnet: Altklausur 2023 Q2 (15 Punkte)",
        },
        {
          type: "text",
          md: "Market Cap 80m, 12m Aktien, Buchwert FK 45m, **Marktwert FK 50m**, CF 10m für 3 Jahre, danach 11m mit 1 % Wachstum, WACC 8 %.",
        },
        {
          type: "table",
          head: ["Schritt", "Rechnung", "Ergebnis"],
          rows: [
            ["PV Jahr 1", "\\(\\frac{10}{1{,}08}\\)", "9,259m"],
            ["PV Jahr 2", "\\(\\frac{10}{1{,}08^2}\\)", "8,573m"],
            ["PV Jahr 3", "\\(\\frac{10}{1{,}08^3}\\)", "7,938m"],
            ["TV bei t = 3", "\\(\\frac{11}{0{,}08-0{,}01}\\)", "157,143m"],
            ["PV des TV", "\\(\\frac{157{,}143}{1{,}08^3}\\)", "124,745m"],
            ["Firm Value", "Summe", "150,516m"],
            ["Equity Value", "\\(150{,}516-50\\) (Marktwert!)", "100,516m"],
            ["Wert pro Aktie", "\\(\\frac{100{,}516}{12}\\)", "8,38 €"],
            ["Entscheidung", "100,5m > 80m Market Cap", "unterbewertet → **buy**"],
          ],
          sumRows: [5, 8],
        },
      ],
      standardAnswer: [
        {
          type: "model_answer",
          title: "Klausurfertiger Antwortsatz (DCF)",
          md: "Mit der ==Entity-Methode== diskontieren wir die ==Free Cashflows to the Firm== mit dem ==WACC== von 8 %. Der ==Terminal Value== am Ende von Jahr 3 beträgt \\(TV_3=\\frac{CF_4}{\\text{WACC}-g}=\\frac{11}{0{,}08-0{,}01}=157{,}14\\text{m}\\), abgezinst auf heute 124,75m.\n\n\\(\\text{Firm Value}=9{,}26+8{,}57+7{,}94+124{,}75=150{,}52\\text{m}\\). Der ==Equity Value== ergibt sich abzüglich des ==Marktwerts des Fremdkapitals==: \\(150{,}52-50=100{,}52\\text{m}\\) (8,38 € pro Aktie).\n\nDa der ==innere Wert== über dem Marktpreis liegt, ist die Aktie ==unterbewertet== — Empfehlung: ==buy==.",
        },
      ],
      tasks: [
        {
          kind: "drill",
          id: "dcf-ex23",
          name: "DCF → Equity Value → Buy oder Sell",
          origin: "altklausur",
          originLabel: "Altklausur 2023, Q2 (15 P)",
          variants: [
            {
              text: "Market Cap 80m, 12m Aktien. Buchwert FK 45m, **Marktwert FK 50m**. Free Cashflows: 10m in Jahren 1–3, danach 11m mit 1 % Wachstum pro Jahr. WACC 8 %.\n\nBerechne Firm Value, Equity Value und den Wert pro Aktie. Kaufen oder verkaufen?",
              fields: [
                { label: "Firm Value", answer: 150.52, rel: 0.005, unit: "m" },
                { label: "Equity Value", answer: 100.52, rel: 0.005, unit: "m" },
                { label: "Wert pro Aktie", answer: 8.38, tol: 0.02, unit: "€" },
              ],
              choice: {
                label: "Entscheidung",
                options: ["buy", "sell"],
                answer: "buy",
              },
              solution: [
                {
                  type: "steps",
                  items: [
                    "PVs der Detailjahre 1–3: \\(9{,}26 + 8{,}57 + 7{,}94 = 25{,}77\\text{m}\\).",
                    "Terminal Value bei \\(t=3\\): \\(\\frac{11}{0{,}08 - 0{,}01} = 157{,}14\\text{m}\\), abgezinst mit \\(1{,}08^3\\) = **124,75m**.",
                    "Firm Value = \\(25{,}77 + 124{,}75\\) = **150,52m**.",
                    "Equity Value = \\(150{,}52 - 50\\) (Marktwert!) = **100,52m** → pro Aktie: **8,38 €**.",
                    "100,52m > 80m Market Cap → unterbewertet → **buy**.",
                  ],
                },
              ],
            },
          ],
        },
        {
          kind: "drill",
          id: "dcf-growth",
          name: "DCF mit Wachstum ab CF0 (Zahlentraining)",
          origin: "neu",
          hint: "Wechsle die Zahlenvariante zum Üben",
          variants: [
            {
              text: "Letzter Free Cashflow \\(CF_0=300\\text{m}\\). Er wächst 3 Jahre lang um 1 % p. a., danach um 0,5 % ewig. WACC 6 %, Marktwert FK 1.000m, 100m Aktien, Aktienkurs 40 €.",
              fields: [
                { label: "Firm Value", answer: 5559.84, rel: 0.005, unit: "m" },
                { label: "Equity Value", answer: 4559.84, rel: 0.005, unit: "m" },
                { label: "Wert pro Aktie", answer: 45.6, rel: 0.005, unit: "€" },
              ],
              choice: {
                label: "Entscheidung",
                options: ["buy", "sell"],
                answer: "buy",
              },
              solution: [
                {
                  type: "steps",
                  items: [
                    "\\(CF_1=303{,}00\\), \\(CF_2=306{,}03\\), \\(CF_3=309{,}09\\).",
                    "\\(CF_4=309{,}09\\cdot 1{,}005=310{,}64\\) → \\(TV_3=\\frac{310{,}64}{0{,}06-0{,}005}=5647{,}92\\text{m}\\).",
                    "Barwerte: \\(285{,}85 + 272{,}37 + 259{,}52 + \\frac{5647{,}92}{1{,}06^3}\\) = **5.559,84m**.",
                    "Equity = **4.559,84m** → pro Aktie **45,60 €** > 40 € → **buy**.",
                  ],
                },
              ],
            },
            {
              text: "Letzter Free Cashflow \\(CF_0=120\\text{m}\\). Er wächst 3 Jahre um 2 % p. a., danach um 1 % ewig. WACC 7 %, Marktwert FK 400m, 50m Aktien, Aktienkurs 20 €.",
              fields: [
                { label: "Firm Value", answer: 2077.24, rel: 0.005, unit: "m" },
                { label: "Equity Value", answer: 1677.24, rel: 0.005, unit: "m" },
                { label: "Wert pro Aktie", answer: 33.54, rel: 0.005, unit: "€" },
              ],
              choice: {
                label: "Entscheidung",
                options: ["buy", "sell"],
                answer: "buy",
              },
              solution: [
                {
                  type: "steps",
                  items: [
                    "\\(CF_1=122{,}40\\), \\(CF_2=124{,}85\\), \\(CF_3=127{,}34\\).",
                    "\\(CF_4=127{,}34\\cdot 1{,}01=128{,}62\\) → \\(TV_3=\\frac{128{,}62}{0{,}07-0{,}01}=2143{,}64\\text{m}\\).",
                    "Barwerte: **2.077,24m** → Equity **1.677,24m** → pro Aktie **33,54 €** → **buy**.",
                  ],
                },
              ],
            },
            {
              text: "Letzter Free Cashflow \\(CF_0=80\\text{m}\\). Er wächst 3 Jahre um 3 % p. a., danach um 1,5 % ewig. WACC 9 %, Marktwert FK 250m, 20m Aktien, Aktienkurs 50 €.",
              fields: [
                { label: "Firm Value", answer: 1128.07, rel: 0.005, unit: "m" },
                { label: "Equity Value", answer: 878.07, rel: 0.005, unit: "m" },
                { label: "Wert pro Aktie", answer: 43.9, rel: 0.005, unit: "€" },
              ],
              choice: {
                label: "Entscheidung",
                options: ["buy", "sell"],
                answer: "sell",
              },
              solution: [
                {
                  type: "steps",
                  items: [
                    "\\(CF_1=82{,}40\\), \\(CF_2=84{,}87\\), \\(CF_3=87{,}42\\).",
                    "\\(CF_4=88{,}73\\) → \\(TV_3=\\frac{88{,}73}{0{,}09-0{,}015}=1183{,}06\\text{m}\\).",
                    "Firm Value **1.128,07m** → Equity **878,07m** → pro Aktie **43,90 €** < 50 € → **sell**.",
                  ],
                },
              ],
            },
          ],
        },
        {
          kind: "essay",
          id: "dcf-explain",
          name: "Entity-Methode & Kaufempfehlung erklären",
          origin: "probeklausur",
          originLabel: "Beispielklausur Q2 (6 P)",
          points: 6,
          question:
            "Erkläre, wie ein Unternehmen mit der **Entity-Methode (DCF)** bewertet wird und wie du vom Unternehmenswert zur Kauf-/Verkaufsempfehlung kommst.",
          checklist: [
            { text: "**Free Cashflows to the Firm** mit dem **WACC** diskontieren", points: 1 },
            { text: "Detailplanungsphase + **Terminal Value** \\(TV=\\frac{CF_{T+1}}{\\text{WACC}-g}\\)", points: 1 },
            { text: "Summe der Barwerte = **Unternehmenswert (Firm Value)**", points: 1 },
            { text: "Equity = Firm Value − **Marktwert** des Fremdkapitals", points: 1 },
            { text: "Vergleich Equity Value / Wert je Aktie mit Market Cap / Aktienkurs", points: 1 },
            { text: "Fazit: höher → **unterbewertet → buy**, tiefer → sell", points: 1 },
          ],
          modelAnswer: [
            {
              type: "text",
              md: "Bei der ==Entity-Methode== zinsen wir die ==Free Cashflows to the Firm== mit dem ==WACC== auf heute ab. Nach der Detailplanungsphase erfasst der ==Terminal Value== \\(TV_T=\\frac{CF_{T+1}}{\\text{WACC}-g}\\) alle weiteren Jahre.\n\nDie Summe aller Barwerte ist der ==Firm Value==. Nach Abzug des ==Marktwerts des Fremdkapitals== bleibt der ==Equity Value==. Liegt der innere Wert je Aktie über dem Kurs, ist die Aktie ==unterbewertet== → **buy**.",
            },
          ],
        },
        {
          kind: "mc",
          id: "dcf-traps",
          name: "Schnellcheck: Die 3 klassischen DCF-Fallen",
          origin: "neu",
          questions: [
            {
              q: "Cashflows liegen für Jahre 1–3 vor. Über wie viele Jahre zinst du \\(TV_3\\) ab?",
              options: ["2 Jahre", "3 Jahre", "4 Jahre"],
              answer: 1,
              explain:
                "\\(TV_3\\) steht am Ende von Jahr 3 und wird daher mit \\((1+\\text{WACC})^3\\) abgezinst — 4 Jahre ist der häufigste Klausurfehler.",
            },
            {
              q: "Welchen Schuldenwert ziehst du vom Firm Value ab?",
              options: [
                "Buchwert des Fremdkapitals",
                "Marktwert des Fremdkapitals",
                "Nennwert der nächsten Anleihe",
              ],
              answer: 1,
              explain:
                "Eigenkapital ist der Restanspruch zu heutigen Marktpreisen — daher immer den **Marktwert** abziehen.",
            },
            {
              q: "Wert pro Aktie berechnet sich als …",
              options: [
                "Firm Value ÷ Aktienanzahl",
                "Equity Value ÷ Aktienanzahl",
                "Market Cap ÷ Aktienanzahl",
              ],
              answer: 1,
              explain:
                "Aktionäre haben Anspruch auf das Eigenkapital (Equity), nicht auf das Gesamtkapital.",
            },
          ],
        },
      ],
      cards: [
        {
          id: "dcf-c1",
          front: "Terminal Value bei t = 3 (mit Wachstum)",
          back: "\\(TV_3=\\frac{CF_4}{\\text{WACC}-g}\\) mit \\(CF_4=CF_3\\cdot(1+g)\\). Abzinsen mit \\((1+\\text{WACC})^3\\).",
        },
        {
          id: "dcf-c2",
          front: "Brücke vom Firm Value zum Equity Value",
          back: "Equity = Firm Value − **Marktwert** des Fremdkapitals (niemals Buchwert!).",
        },
        {
          id: "dcf-c3",
          front: "Wann lautet die Empfehlung im DCF „buy“?",
          back: "Wenn Equity Value > Market Cap (bzw. Wert je Aktie > Aktienkurs) → unterbewertet → **buy**.",
        },
        {
          id: "dcf-c4",
          front: "Entity-Methode: Welche Cashflows, welcher Zinssatz?",
          back: "Free Cashflows **to the Firm (FCFF)**, abgezinst mit dem **WACC**.",
        },
      ],
      mistakes: [
        "Den **Buchwert** statt des **Marktwerts** der Schulden abziehen.",
        "Mit \\(CF_0\\) statt \\(CF_1\\) beginnen.",
        "Den Terminal Value mit \\((1+\\text{WACC})^4\\) statt \\((1+\\text{WACC})^3\\) abzinsen.",
        "Den buy/sell-Schlusssatz vergessen (verschenkte Punkte).",
      ],
      hook: "**CF – TV – PV – minus D – Vergleich**: Cashflows ab Jahr 1 → Terminal Value → Barwerte → minus Marktwert FK → mit Kurs vergleichen.",
      source: "Folien 46–64 (Rezept auf Folie 51), Addendum II, Altklausuren 2015–2023.",
    },
    wacc: {
      schema: "lernly.thema/1",
      id: "wacc",
      theory: [
        {
          type: "simple",
          md: "Der **WACC** (Weighted Average Cost of Capital) ist der gewichtete Durchschnitt aus dem, was Eigenkapitalgeber und Kreditgeber fordern. Besonderheit: **Fremdkapitalzinsen sparen Steuern (Tax Shield)**, deshalb werden nur die FK-Kosten mit \\((1 - s)\\) multipliziert.",
        },
        {
          type: "formula",
          tex: [
            "\\text{WACC} = \\frac{E}{E+D}\\cdot r_E + \\frac{D}{E+D}\\cdot r_D \\cdot (1 - s)",
          ],
          note: "Gewichte immer auf Basis von Marktwerten bilden (\\(V = E + D\\)).",
        },
      ],
      standardAnswer: [
        {
          type: "model_answer",
          md: "Der ==WACC== gewichtet die ==Eigenkapitalkosten== und die um den ==Tax Shield== \\((1-s)\\) reduzierten ==Fremdkapitalkosten== entsprechend ihren ==Marktwertanteilen== am Gesamtkapital.",
        },
      ],
      tasks: [
        {
          kind: "drill",
          id: "wacc-calc",
          name: "WACC mit Tax Shield berechnen",
          origin: "altklausur",
          originLabel: "Altklausur Q1 (12 P)",
          variants: [
            {
              text: "Marktwert Eigenkapital \\(E = 600\\text{m}\\), Marktwert Fremdkapital \\(D = 400\\text{m}\\), EK-Kosten \\(r_E = 9\\,\\%\\), FK-Kosten \\(r_D = 5\\,\\%\\), Steuersatz \\(s = 30\\,\\%\\).\n\nBerechne den WACC in Prozent.",
              fields: [{ label: "WACC", answer: 6.8, tol: 0.05, unit: "%" }],
              solution: [
                {
                  type: "steps",
                  items: [
                    "Gesamtkapital: \\(600 + 400 = 1.000\\text{m}\\) → **60 % EK**, **40 % FK**.",
                    "FK-Kosten nach Steuern: \\(5\\,\\% \\times (1 - 0{,}30) = \\mathbf{3{,}5\\,\\%}\\).",
                    "\\(\\text{WACC} = 0{,}60 \\times 9\\,\\% + 0{,}40 \\times 3{,}5\\,\\% = 5{,}4\\,\\% + 1{,}4\\,\\% = \\mathbf{6{,}8\\,\\%}\\).",
                  ],
                },
              ],
            },
            {
              text: "Marktwert Eigenkapital \\(E = 750\\text{m}\\), Marktwert Fremdkapital \\(D = 250\\text{m}\\), EK-Kosten \\(r_E = 10\\,\\%\\), FK-Kosten \\(r_D = 6\\,\\%\\), Steuersatz \\(s = 25\\,\\%\\).\n\nBerechne den WACC in Prozent.",
              fields: [{ label: "WACC", answer: 8.63, tol: 0.05, unit: "%" }],
              solution: [
                {
                  type: "steps",
                  items: [
                    "Gewichte: **75 % EK**, **25 % FK**.",
                    "FK nach Steuern: \\(6\\,\\% \\times (1 - 0{,}25) = 4{,}5\\,\\%\\).",
                    "\\(\\text{WACC} = 0{,}75 \\times 10\\,\\% + 0{,}25 \\times 4{,}5\\,\\% = 7{,}5\\,\\% + 1{,}125\\,\\% \\approx \\mathbf{8{,}63\\,\\%}\\).",
                  ],
                },
              ],
            },
          ],
        },
      ],
      cards: [
        {
          id: "wacc-c1",
          front: "Warum steht der Tax Shield \\((1-s)\\) nur beim Fremdkapital?",
          back: "Fremdkapitalzinsen mindern als Aufwand den steuerpflichtigen Gewinn; Dividenden an Eigentümer nicht.",
        },
        {
          id: "wacc-c2",
          front: "Buchwerte oder Marktwerte im WACC?",
          back: "Immer **Marktwerte** für \\(E\\) und \\(D\\) verwenden.",
        },
      ],
      mistakes: [
        "Tax Shield \\((1-s)\\) komplett vergessen.",
        "Tax Shield fälschlich auch auf die Eigenkapitalkosten anwenden.",
        "Buchwerte statt Marktwerte zur Gewichtung nehmen.",
      ],
      hook: "**Nur der Kredit spart Steuern** — daher \\((1-s)\\) exklusiv ans \\(r_D\\).",
      source: "Folien 32–45, Übung 2.",
    },
  },
};
