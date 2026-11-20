import type { McpTopicContent, TrainerBundle } from "./types";

const DCF_DIAGRAM_SVG = `<svg viewBox="0 0 680 220" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Arial, sans-serif"><defs><marker id="dcf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--color-primary)"/></marker></defs><line x1="60" y1="40" x2="640" y2="40" stroke="var(--color-line)" stroke-width="2"/><text x="110" y="26" font-size="13" font-weight="700" text-anchor="middle" fill="var(--color-text)">t = 0</text><text x="260" y="26" font-size="13" font-weight="700" text-anchor="middle" fill="var(--color-text)">t = 1</text><text x="410" y="26" font-size="13" font-weight="700" text-anchor="middle" fill="var(--color-text)">t = 2</text><text x="560" y="26" font-size="13" font-weight="700" text-anchor="middle" fill="var(--color-text)">t = 3</text><rect x="45" y="138" width="130" height="58" rx="8" fill="var(--color-work-bg)" stroke="var(--color-primary)"/><text x="110" y="162" font-size="13" font-weight="700" text-anchor="middle" fill="var(--color-text)">Firm value</text><text x="110" y="180" font-size="12" text-anchor="middle" fill="var(--color-text-dim)">= Summe der PVs</text><rect x="205" y="55" width="110" height="44" rx="8" fill="var(--color-surface)" stroke="var(--color-primary)"/><text x="260" y="74" font-size="13" font-weight="700" text-anchor="middle" fill="var(--color-text)">CF1</text><text x="260" y="91" font-size="12" text-anchor="middle" fill="var(--color-text-dim)">10,0 Mio.</text><rect x="355" y="55" width="110" height="44" rx="8" fill="var(--color-surface)" stroke="var(--color-primary)"/><text x="410" y="74" font-size="13" font-weight="700" text-anchor="middle" fill="var(--color-text)">CF2</text><text x="410" y="91" font-size="12" text-anchor="middle" fill="var(--color-text-dim)">10,0 Mio.</text><rect x="505" y="55" width="110" height="44" rx="8" fill="var(--color-surface)" stroke="var(--color-primary)"/><text x="560" y="74" font-size="13" font-weight="700" text-anchor="middle" fill="var(--color-text)">CF3</text><text x="560" y="91" font-size="12" text-anchor="middle" fill="var(--color-text-dim)">10,0 Mio.</text><rect x="495" y="138" width="150" height="58" rx="8" fill="var(--color-urgent-bg)" stroke="var(--color-urgent-ink)"/><text x="570" y="162" font-size="13" font-weight="700" text-anchor="middle" fill="var(--color-text)">TV3 = CF4/(k−g)</text><text x="570" y="180" font-size="12" text-anchor="middle" fill="var(--color-urgent-ink)">11/(8%−1%) = 157,1m</text><line x1="205" y1="90" x2="178" y2="146" stroke="var(--color-primary)" stroke-width="1.6" marker-end="url(#dcf-arrow)"/><line x1="355" y1="92" x2="178" y2="158" stroke="var(--color-primary)" stroke-width="1.6" marker-end="url(#dcf-arrow)"/><line x1="505" y1="94" x2="178" y2="166" stroke="var(--color-primary)" stroke-width="1.6" marker-end="url(#dcf-arrow)"/><line x1="495" y1="170" x2="178" y2="172" stroke="var(--color-primary)" stroke-width="1.6" marker-end="url(#dcf-arrow)"/></svg>`;

export const CORPORATE_FINANCE_TOPICS: Record<string, McpTopicContent> = {
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

  mm: {
    schema: "lernly.thema/1",
    id: "mm",
    theory: [
      {
        type: "simple",
        md: "Der **Financial Leverage Effect** zeigt: Solange das eingesetzte Fremdkapital weniger Zinsen kostet (\\(i\\)), als die Assets verdienen (\\(\\text{RoA}\\)), hebelt Verschuldung die Eigenkapitalrendite (\\(\\text{RoE}\\)) nach oben — gleichzeitig steigt aber das Risiko für die Aktionäre (\\(k_E\\) wächst linear mit \\(D/E\\)).",
      },
      {
        type: "formula",
        tex: [
          "\\text{RoE} = \\frac{\\text{Profit} - \\text{Cost of Debt}}{\\text{Equity}} = \\text{RoA} + \\frac{D}{E}(\\text{RoA} - i)",
          "k_E = k_U + \\frac{D}{E}(k_U - k_D)",
          "V_L = V_U + PV(\\text{Tax Shield}) - PV(\\text{Financial Distress})",
        ],
        note: "Im MM-Grundmodell ohne Steuern kompensiert das steigende k_E den billigeren Zins k_D exakt → WACC bleibt konstant.",
      },
      {
        type: "table",
        head: ["MM-Annahme (perfekter Markt)", "Abweichung in der Realität", "Folge für die Kapitalstruktur"],
        rows: [
          ["Keine Unternehmenssteuern", "Fremdkapitalzinsen mindern Steuerlast", "**Tax Shield** (\\(V_L = V_U + t\\cdot D\\)) erhöht Unternehmenswert"],
          ["Keine Insolvenzkosten", "Direkte & indirekte Distress Costs steigen mit \\(D/E\\)", "Begrenzt Verschuldung → **Trade-off Optimum D\\***"],
          ["Konstante Investitionspolitik", "Agency Costs of Equity vs. Agency Costs of Debt", "Debt diszipliniert Manager, verursacht aber Risikoanreize"],
          ["Symmetrische Information", "Manager wissen mehr als Investoren", "**Pecking Order**: Innenfinanzierung → Fremdkapital → Eigenkapital"],
        ],
      },
      {
        type: "remember",
        md: "Das Optimum **\\(D^*\\)** liegt exakt dort, wo der Grenznutzen des letzten Euros Schulden (**Tax Shield** bzw. geringere Equity-Agency-Kosten) den Grenzkosten (**Financial Distress** bzw. steigende Debt-Agency-Kosten) entspricht.",
      },
    ],
    standardAnswer: [
      {
        type: "model_answer",
        title: "Klausurfertige Antwort (Leverage, MM & Optimum)",
        md: "Der ==leverage effect== erhöht die Eigenkapitalrendite \\(\\text{RoE} = \\text{RoA} + \\frac{D}{E}(\\text{RoA}-i)\\), solange \\(\\text{RoA} > i\\); fällt \\(\\text{RoA} < i\\), kehrt sich der Hebel negativ um. Deshalb steigen mit der Verschuldung nicht nur erwartete Rendite, sondern auch Volatilität und Risiko.\n\nNach Modigliani–Miller (1958) ist die Kapitalstruktur im perfekten Markt irrelevant, weil Anleger über ==homemade leverage== jeden Verschuldungsgrad selbst nachbauen können und der WACC konstant bleibt (\\(k_E = k_U + \\frac{D}{E}(k_U - k_D)\\)).\n\nHebt man perfekte Annahmen auf, schafft das ==tax shield== Wert (\\(V_L = V_U + t\\cdot D\\)), während ==costs of financial distress== (direkte Verfahrenskosten und indirekte Geschäftsverluste) sowie steigende ==agency costs of debt== gegenüber sinkenden ==agency costs of equity== den Verschuldungsgrad begrenzen. Die optimale Kapitalstruktur \\(D^*\\) maximiert den Unternehmenswert dort, wo Grenznutzen gleich Grenzkosten sind.",
      },
    ],
    tasks: [
      {
        kind: "drill",
        id: "mm-leverage-drill",
        name: "Leverage-Effekt & MM Proposition II berechnen",
        origin: "altklausur",
        originLabel: "Folie 69 & FT20 Q4",
        hint: "Rechne Zins = Debt × i und danach RoE = (Profit − Zins) / Equity",
        variants: [
          {
            text: "Unternehmen mit Assets 8.000m, davon **4.000m Equity** und **4.000m Debt** zu \\(i = 10\\,\\%\\) (Folie 69). Berechne die **RoE in %** für drei Szenarien:\n- Normal: RoA = 15 %\n- Rezession: RoA = 5 %\n- Expansion: RoA = 25 %",
            fields: [
              { label: "RoE Normal (RoA 15 %)", answer: 20, tol: 0.05, unit: "%" },
              { label: "RoE Rezession (RoA 5 %)", answer: 0, tol: 0.05, unit: "%" },
              { label: "RoE Expansion (RoA 25 %)", answer: 40, tol: 0.05, unit: "%" },
            ],
            solution: [
              {
                type: "steps",
                items: [
                  "Zinsaufwand in allen Szenarien: \\(4.000 \\times 10\\,\\% = 400\\text{m}\\).",
                  "Normal (RoA 15 %): Profit \\(1.200 - 400 = 800\\) → \\(\\text{RoE} = \\frac{800}{4.000} = \\mathbf{20\\,\\%}\\).",
                  "Rezession (RoA 5 %): Profit \\(400 - 400 = 0\\) → \\(\\text{RoE} = \\mathbf{0\\,\\%}\\) (negativer Hebel gegen 5 % RoA!).",
                  "Expansion (RoA 25 %): Profit \\(2.000 - 400 = 1.600\\) → \\(\\text{RoE} = \\frac{1.600}{4.000} = \\mathbf{40\\,\\%}\\).",
                ],
              },
            ],
          },
          {
            text: "MM ohne Steuern (Proposition II): Unverschuldete Kapitalkosten \\(k_U = 12\\,\\%\\), Fremdkapitalkosten \\(k_D = 6\\,\\%\\), Verschuldungsgrad \\(D/E = 1{,}0\\) (also 50 % Debt, 50 % Equity).\n\nBerechne die neuen Eigenkapitalkosten \\(k_E\\) und den WACC in Prozent.",
            fields: [
              { label: "Eigenkapitalkosten k_E", answer: 18, tol: 0.05, unit: "%" },
              { label: "WACC", answer: 12, tol: 0.05, unit: "%" },
            ],
            solution: [
              {
                type: "steps",
                items: [
                  "Proposition II: \\(k_E = k_U + \\frac{D}{E}(k_U - k_D) = 12\\,\\% + 1{,}0 \\times (12\\,\\% - 6\\,\\%) = \\mathbf{18\\,\\%}\\).",
                  "\\(\\text{WACC} = 0{,}5 \\times 18\\,\\% + 0{,}5 \\times 6\\,\\% = 9\\,\\% + 3\\,\\% = \\mathbf{12\\,\\%} = k_U\\) (konstant!).",
                ],
              },
            ],
          },
        ],
      },
      {
        kind: "essay",
        id: "mm-optimal-cs",
        name: "a) Financial Leverage Effect & b) Optimal Capital Structure (Trade-off & Agency)",
        origin: "altklausur",
        originLabel: "Old exam 2023, Q4 (19 P)",
        points: 19,
        question:
          "a) Explain the **financial leverage effect**.\nb) Modigliani and Miller propose that capital structure policy is irrelevant under various assumptions. Derive an **optimal capital structure** under corporate taxes and bankruptcy costs OR based on principal-agency costs.",
        checklist: [
          { text: "Leverage-Effekt: Formel \\(\\text{RoE}=\\text{RoA}+\\frac{D}{E}(\\text{RoA}-i)\\) + Vorzeichen bei \\(\\text{RoA}>i\\) vs. \\(i>\\text{RoA}\\)", points: 3 },
          { text: "Vorlesungsbeispiel (Assets 8.000, Debt 4.000 @ 10 % → RoE 0 / 20 / 40 %) + Risikoanstieg", points: 3 },
          { text: "MM (1958): Kapitalstruktur irrelevant im perfekten Markt (Homemade Leverage, Proposition II)", points: 3 },
          { text: "Steuern (Tax Shield \\(V_L = V_U + t\\cdot D\\)) + direkte & indirekte Distress Costs", points: 3 },
          { text: "Trade-off Optimum \\(D^*\\) (\\(V = V_U + PV(\\text{TS}) - PV(\\text{Distress})\\)): Grenznutzen = Grenzkosten (+ Skizze)", points: 4 },
          { text: "Agency-Herleitung: Equity Agency Costs sinken durch Debt vs. Debt Agency Costs steigen → Minimum = Optimum", points: 3 },
        ],
        modelAnswer: [
          {
            type: "text",
            md: "**a) Leverage effect:** As long as \\(\\text{RoA} > i\\), replacing equity with debt boosts \\(\\text{RoE} = (\\text{Profit} - \\text{Cost of Debt}) / \\text{Equity}\\). In the lecture example (8,000 assets, 4,000 debt at 10 %), expected RoE rises from 15 % to 20 %, but swings between 0 % (RoA 5 %) and 40 % (RoA 25 %), raising shareholder risk.\n\n**b) Optimal capital structure:** Under MM's perfect-market assumptions (Proposition I & II), homemade leverage keeps WACC constant. With corporate taxes, debt generates a valuable ==tax shield== (\\(V_L = V_U + t\\cdot D\\)), but higher leverage raises direct and indirect ==costs of financial distress==. Value peaks at \\(D^*\\) where marginal tax benefit equals marginal expected distress cost. In the agency-cost framework, debt cuts ==agency costs of equity== (free cash flow discipline) while increasing ==agency costs of debt== (asset substitution, debt overhang), minimizing total agency costs at the interior optimum.",
          },
        ],
      },
      {
        kind: "mc",
        id: "mm-mc",
        name: "Quick check: MM & Trade-off Theory",
        origin: "altklausur",
        questions: [
          {
            q: "Unter MM ohne Steuern: Was passiert mit dem WACC, wenn ein Unternehmen mehr günstiges Fremdkapital aufnimmt?",
            options: [
              "WACC sinkt linear mit steigendem Verschuldungsgrad",
              "WACC bleibt konstant, weil k_E genau passend ansteigt",
              "WACC steigt, weil Schulden immer teurer als Eigenkapital sind",
            ],
            answer: 1,
            explain: "Nach MM Proposition II gleicht das höhere Risiko für Aktionäre (steigendes k_E) den Zinsvorteil exakt aus.",
          },
          {
            q: "Wann wirkt der Financial Leverage Effect negativ auf die Eigenkapitalrendite (RoE)?",
            options: [
              "Wenn der Fremdkapitalzins i größer als die Gesamtkapitalrendite RoA ist",
              "Wenn die Aktie unterbewertet ist",
              "Immer bei Unternehmen mit positiven Steuersätzen",
            ],
            answer: 0,
            explain: "Bei i > RoA kostet jeder geliehene Euro mehr Zinsen, als er erwirtschaftet — RoE fällt unter RoA.",
          },
          {
            q: "Welche beiden Gegenspieler bestimmen das Optimum D* in der Trade-off Theory?",
            options: [
              "Dividendenrendite vs. Transaktionskosten",
              "Barwert des Tax Shield vs. Barwert der Costs of Financial Distress",
              "Buchwert FK vs. Nennwert Aktien",
            ],
            answer: 1,
            explain: "V = V_U + PV(Tax Shield) − PV(Financial Distress) — Maximum bei Grenznutzen = Grenzkosten.",
          },
        ],
      },
    ],
    cards: [
      {
        id: "mm-c1",
        front: "Wann ist der Leverage-Effekt positiv, wann negativ?",
        back: "Positiv solange **RoA > i** (Fremdkapitalzins); negativ sobald **i > RoA**.",
      },
      {
        id: "mm-c2",
        front: "MM Proposition II (ohne Steuern)",
        back: "\\(k_E = k_U + \\frac{D}{E}(k_U - k_D)\\). Trotz billigerem Debt steigt \\(k_E\\), sodass der WACC konstant bleibt.",
      },
      {
        id: "mm-c3",
        front: "Trade-off Theory: Formel & Optimum D*",
        back: "\\(V = V_U + PV(\\text{Tax Shield}) - PV(\\text{Distress})\\). Optimum \\(D^*\\), wo Grenznutzen = Grenzkosten.",
      },
      {
        id: "mm-c4",
        front: "Pecking-Order-Reihenfolge bei Informationsasymmetrie (Myers/Majluf)",
        back: "1. Innenfinanzierung → 2. Fremdkapital → 3. Neues Eigenkapital (nur als letztes Mittel).",
      },
    ],
    mistakes: [
      "Behaupten, günstiges Fremdkapital senke im MM-Grundmodell ohne Steuern den WACC.",
      "Die indirekten Insolvenzkosten (Verlust von Kunden, Lieferanten, Mitarbeitern vor Insolvenz) weglassen.",
      "In der Trade-off-Skizze die Kurve nicht bei \\(D^*\\) gipfeln lassen oder die Achsen (\\(D\\), \\(V\\)) nicht beschriften.",
    ],
    hook: "**Erst perfekte MM-Welt, dann Tax Shield hoch, Distress/Agency runter → Optimum D***.",
    source: "Folien 67–92, Altklausuren 2015–2023 Q4.",
  },

  emh: {
    schema: "lernly.thema/1",
    id: "emh",
    theory: [
      {
        type: "simple",
        md: "A market is **efficient** if prices already contain the available information. Then you cannot earn systematic abnormal returns with that information, because it is already priced in.",
      },
      {
        type: "table",
        head: ["Form", "Information already in the price", "What does not work any more"],
        rows: [
          ["Weak", "Past prices and volumes", "Technical analysis (charts)"],
          ["Semi-strong", "+ all **public** information", "Fundamental analysis"],
          ["Strong", "+ private / insider information", "Even insider trading"],
        ],
      },
      {
        type: "remember",
        md: "Strong ⊃ semi-strong ⊃ weak. Each stronger form automatically includes the weaker ones.",
      },
    ],
    standardAnswer: [
      {
        type: "model_answer",
        title: "Klausurfertige Antwort (EMH)",
        md: "The ==efficient market hypothesis== states that market prices reflect all available information. Under the ==weak form== prices contain all past price and volume data, so ==technical analysis== cannot earn systematic excess returns. Under the ==semi-strong form== prices also incorporate all public information, rendering ==fundamental analysis== ineffective (tested via ==event studies==). Under the ==strong form== even private insider information is reflected, so not even insiders can earn ==abnormal returns==.",
      },
    ],
    tasks: [
      {
        kind: "essay",
        id: "emh-strong",
        name: "Explain the three forms & test the strong form",
        origin: "altklausur",
        originLabel: "Old exam 2021, Q1 (10 P)",
        points: 10,
        question: "Explain the three forms of market efficiency. How could you test the **strong form**?",
        checklist: [
          { text: "Definition: prices reflect all available information (no systematic abnormal returns)", points: 2 },
          { text: "Weak form: past prices → no technical analysis", points: 2 },
          { text: "Semi-strong form: + public information → no fundamental analysis", points: 2 },
          { text: "Strong form: + private / insider information → no insider profits", points: 2 },
          { text: "Empirical test: examine whether corporate insiders or fund managers earn abnormal returns", points: 2 },
        ],
        modelAnswer: [
          {
            type: "text",
            md: "Prices reflect available information: ==weak== (past prices → chart analysis fails), ==semi-strong== (+ public news → fundamental analysis fails), ==strong== (+ private info → even insiders earn zero ==abnormal returns==). **Test of the strong form:** track trades of corporate insiders or professional mutual fund managers — if they systematically earn abnormal returns (as insider-trading prohibitions presume), the strong form is rejected.",
          },
        ],
      },
      {
        kind: "essay",
        id: "emh-semistrong",
        name: "Discuss semi-strong efficiency & event studies",
        origin: "altklausur",
        originLabel: "Old exam FT23 Q1 (10 P)",
        points: 10,
        question: "Discuss the hypothesis of **semi-strong efficient capital markets** and explain how it is tested empirically.",
        checklist: [
          { text: "Definition: all publicly available information (news, annual reports, announcements) is priced in", points: 3 },
          { text: "Implication: fundamental analysis cannot systematically beat the market", points: 2 },
          { text: "Test method: **event study** around public corporate announcements (earnings, M&A, dividends)", points: 3 },
          { text: "Expected pattern: immediate full price jump on announcement day, no post-event drift", points: 2 },
        ],
        modelAnswer: [
          {
            type: "text",
            md: "Under ==semi-strong efficiency==, all ==publicly available information== is instantaneously incorporated into security prices, leaving no edge for fundamental analysis. Econometricians test this using ==event studies== around earnings surprises or M&A announcements: an immediate one-off jump with zero post-announcement drift supports semi-strong efficiency.",
          },
        ],
      },
      {
        kind: "mc",
        id: "emh-mc",
        name: "Quick check: Weak vs. Semi-Strong vs. Strong",
        origin: "altklausur",
        questions: [
          {
            q: "Die EU verbietet Insiderhandel unter Strafe. Was spricht das über die Markteffizienz aus?",
            options: [
              "Märkte sind nachweislich strong-form efficient",
              "Es widerspricht der strong form, weil Insider sonst keine Überrenditen erzielen könnten",
              "Es widerlegt die weak form",
            ],
            answer: 1,
            explain: "Das Verbot existiert gerade, weil Insider mit privatem Wissen Überrenditen erzielen könnten (Gegenbeleg zur strong form).",
          },
          {
            q: "Mit welcher Methode wird empirisch die semi-strong form getestet?",
            options: [
              "Technische Chart-Muster",
              "Event Studies rund um öffentliche Bekanntmachungen",
              "Dividendenabzinsung",
            ],
            answer: 1,
            explain: "Event Studies prüfen, ob Preise sofort und ohne nachträglichen Drift auf neue öffentliche Nachrichten reagieren.",
          },
          {
            q: "Welche Analyse scheitert schon bei der schwächsten Form (weak form)?",
            options: [
              "Fundamentalanalyse von Bilanzen",
              "Ausnutzen von geheimem Vorstands-Wissen",
              "Technische Chart-Analyse historischer Kurse",
            ],
            answer: 2,
            explain: "Historische Kurs- und Volumenverläufe sind bereits bei weak-form efficiency vollständig eingepreist.",
          },
        ],
      },
    ],
    cards: [
      {
        id: "emh-c1",
        front: "Three forms of market efficiency",
        back: "- **Weak:** past prices (no technical analysis)\n- **Semi-strong:** + public info (no fundamental analysis)\n- **Strong:** + private info (no insider gains)",
      },
      {
        id: "emh-c2",
        front: "How is semi-strong efficiency tested?",
        back: "Via an **event study**: price must adjust immediately and completely upon public news, without delayed drift.",
      },
      {
        id: "emh-c3",
        front: "Does semi-strong efficiency imply strong efficiency?",
        back: "No, only the reverse holds: **Strong ⊃ Semi-strong ⊃ Weak**.",
      },
    ],
    mistakes: [
      "Semi-strong (public info) und strong (private/insider info) verwechseln.",
      "Den empirischen Test (Event Study vs. Insider-Renditen) bei 10-P-Aufgaben vergessen.",
    ],
    hook: "**Weak = Charts, Semi = News/Bilanz, Strong = Insider**.",
    source: "Folien 14–15, Altklausuren 2020–2023 Q1.",
  },

  agency: {
    schema: "lernly.thema/1",
    id: "agency",
    theory: [
      {
        type: "simple",
        md: "**Principal-Agent-Konflikte** entstehen zwischen **Aktionären (Principal)** und **Management (Agent)**, weil das Management Entscheidungen unter **asymmetrischer Information** trifft (Hidden Action / Moral Hazard) und eigene Ziele verfolgt.",
      },
      {
        type: "steps",
        title: "Die 4 Eigenkapital-Agency-Probleme (Folie 87)",
        items: [
          "**Effort provision problem:** Shirking (weniger Einsatz), schlechte Entscheidungen, On-the-job Consumption (Perquisites).",
          "**Risk preference problem:** Manager haben ihr Humankapital undiversifiziert an eine Firma gebunden → bevorzugen zu risikoarme Projekte / zu viel Diversifikation.",
          "**Time preference problem:** Kurzfrist-Orientierung bis zum nächsten Bonus / Vertragsende statt langfristiger Wertschaffung.",
          "**Overinvestment problem (Free Cash Flow):** Management behält freie Cashflows ein und baut ein Imperium (**Empire Building**) auch mit negativem NPV.",
        ],
      },
      {
        type: "table",
        head: ["Kontrollmechanismus (Folie 89)", "Wann wirkt er?", "Wie diszipliniert er das Management?"],
        rows: [
          ["**Kapitalstruktur (mehr Debt)**", "Ex ante", "Feste Zins- und Tilgungszahlungen saugen freien Cashflow ab; höheres Insolvenzrisiko erhöht Leistungsdruck"],
          ["**Board / Aufsichtsrat & Blockbesitzer**", "Ex ante", "Direktes Monitoring durch kompetente Aufseher und Großaktionäre mit echtem Anreiz"],
          ["**Anreizkompatible Vergütung**", "Ex ante", "Aktienpakete, langfristige Optionen, EVA-Boni mit Vesting & Clawbacks"],
          ["**Managerarbeitsmarkt & Übernahmemarkt**", "Ex post", "Schlechte Leistung senkt Marktwert des Managers bzw. macht Firma zum Ziel feindlicher Übernahmen"],
          ["**Eigentümerstruktur & Satzung (Charter)**", "Ex post", "Stimmrechte, Eigentümerwechsel und gesellschaftsrechtliche Schranken korrigieren Fehlentwicklungen"],
        ],
      },
      {
        type: "remember",
        md: "Vollständige Beseitigung wäre unendlich teuer — das Optimum ist immer nur eine **Second-Best-Lösung**, bei der zusätzliche Kontrollkosten gleich den vermiedenen Agency-Verlusten sind.",
      },
    ],
    standardAnswer: [
      {
        type: "model_answer",
        title: "Klausurfertige Antwort (Principal-Agent & Mitigation)",
        md: "Between shareholders (==principal==) and management (==agent==), ==asymmetric information== creates four conflicts: ==effort provision== (shirking, perquisites), ==risk preference== (excessive risk aversion), ==time preference== (short-termism), and ==overinvestment== of free cash flows (empire building).\n\nMitigation relies on ==ex-ante mechanisms== — higher debt (absorbing free cash flow and raising distress discipline), board monitoring, block owners, and long-term ==incentive-compatible pay== — plus ==ex-post mechanisms== — the managerial labor market, market for corporate control (takeovers), ownership structure, and company charter. Because monitoring is costly, only a ==second-best solution== is achievable.",
      },
    ],
    tasks: [
      {
        kind: "essay",
        id: "agency-mitigate",
        name: "Principal-Agent conflicts & mitigation (Ex ante vs. Ex post)",
        origin: "altklausur",
        originLabel: "FT23 / FT20 Q5 (10 P · Wahl vs. Ethik)",
        points: 10,
        question: "Comment on potential **Principal-Agent conflicts** between management and shareholders and explain **how to mitigate them**.",
        checklist: [
          { text: "Definition: Principal (Shareholders) vs. Agent (Management), asymmetrische Information / Hidden Action", points: 2 },
          { text: "Alle 4 Konflikte: Effort provision, Risk preference, Time preference, Overinvestment / Free Cash Flow", points: 2 },
          { text: "Ex-ante Maßnahmen: Debt (Kapitalstruktur), Board Monitoring, Block Owners, Incentive Pay", points: 2 },
          { text: "Ex-post Maßnahmen: Managerial labor market, Takeover market, Ownership structure, Charter", points: 2 },
          { text: "Fazit: Second-Best-Lösung & Hinweis auf Anreizgestaltung (Vesting, keine neuen Exzesse)", points: 2 },
        ],
        modelAnswer: [
          {
            type: "text",
            md: "Shareholders (principals) cannot perfectly observe managers (agents), causing ==effort provision==, ==risk/time preference==, and ==overinvestment== problems. Firms combine ==ex-ante== tools (debt pressure, supervisory board, blockholders, equity-based incentive pay) with ==ex-post== market discipline (managerial labor market, threat of takeovers, charter rules) to reach an optimal ==second-best== governance balance.",
          },
        ],
      },
      {
        kind: "essay",
        id: "agency-debt",
        name: "How debt disciplines managers (Variante 2015)",
        origin: "altklausur",
        originLabel: "Old exam 2015, Q5 (10 P)",
        points: 10,
        question: "Discuss in the framework of the **Principal-Agent Theory** the idea that **debt can be used to discipline managers** of a firm.",
        checklist: [
          { text: "Ausgangsproblem: Free Cash Flow / Overinvestment durch selbstinteressiertes Management", points: 3 },
          { text: "Wirkung 1: Feste Zins- und Tilgungspflichten binden Free Cash Flow statt Empire Building", points: 3 },
          { text: "Wirkung 2: Insolvenzgefahr erhöht Leistungsdruck (Job & Reputation stehen auf dem Spiel)", points: 2 },
          { text: "Gegenkraft: Agency Costs of Debt (Asset Substitution, Debt Overhang / Underinvestment) begrenzen Schulden", points: 2 },
        ],
        modelAnswer: [
          {
            type: "text",
            md: "Raising the ==debt-equity ratio== replaces discretionary dividends with hard interest and principal commitments, draining ==free cash flow== before management can waste it on negative-NPV empire building, while higher distress risk sharpens incentives. Because excessive leverage breeds ==agency costs of debt== (asset substitution, underinvestment), debt only disciplines profitably up to the optimal leverage ratio.",
          },
        ],
      },
      {
        kind: "mc",
        id: "agency-mc",
        name: "Quick check: Equity vs. Debt Agency Conflicts",
        origin: "altklausur",
        questions: [
          {
            q: "Welcher Mechanismus gehört zur EX-ANTE-Kontrolle (vorbeugend)?",
            options: [
              "Markt für Unternehmenskontrolle (feindliche Übernahme nach Misswirtschaft)",
              "Aufnahme von Fremdkapital zur Bindung des Free Cash Flow",
              "Reputationsverlust auf dem Managerarbeitsmarkt",
            ],
            answer: 1,
            explain: "Kapitalstruktur (Debt), Board, Blockbesitzer und Vergütungsdesign sind vorbeugende Ex-ante-Kontrollen (Folie 89).",
          },
          {
            q: "Welches typische Problem beschreibt 'Empire Building' durch Einbehaltung freier Mittel?",
            options: [
              "Overinvestment / Free-Cash-Flow-Problem",
              "Risk-Shifting der Aktionäre",
              "Issuer-Pays-Konflikt",
            ],
            answer: 0,
            explain: "Überschüssiger Free Cash Flow wird in Projekte mit negativem Kapitalwert gesteckt statt ausgeschüttet.",
          },
          {
            q: "Welches Gegenproblem entsteht zwischen Gläubigern und Aktionären bei hoher Verschuldung?",
            options: [
              "Asset Substitution (Überinvestition in zu riskante Projekte auf Kosten der Gläubiger)",
              "Zu geringe Vergütung des Boards",
              "Wegfall der Steuerersparnis",
            ],
            answer: 0,
            explain: "Nach Schuldenaufnahme profitieren Aktionäre vom Upside riskanter Projekte, während Gläubiger das Downside tragen.",
          },
        ],
      },
    ],
    cards: [
      {
        id: "agency-c1",
        front: "Die 4 Eigenkapital-Agency-Probleme (Folie 87)",
        back: "1. Effort provision (Shirking / Perks) · 2. Risk preference · 3. Time preference · 4. Overinvestment (Free Cash Flow)",
      },
      {
        id: "agency-c2",
        front: "Ex-ante vs. Ex-post Kontrolle (Folie 89)",
        back: "**Ex ante:** Debt, Board, Block owners, Vergütung · **Ex post:** Managerarbeitsmarkt, Takeovers, Eigentümerstruktur, Satzung",
      },
      {
        id: "agency-c3",
        front: "Warum führt Agency Control nur zu einer Second-Best-Lösung?",
        back: "Vollständiges Monitoring und perfekte Verträge sind teurer als der verbleibende Restschaden.",
      },
    ],
    mistakes: [
      "Nur 2–3 Probleme aufzählen statt aller vier von Folie 87.",
      "Die klare Trennung zwischen Ex-ante und Ex-post-Maßnahmen weglassen.",
    ],
    hook: "**4 Probleme (Effort, Risk, Time, Free CF) → Ex ante vs. Ex post → Second Best**.",
    source: "Folien 86–89, Altklausuren 2015–2023 Q5.",
  },

  ethics: {
    schema: "lernly.thema/1",
    id: "ethics",
    theory: [
      {
        type: "simple",
        md: "Bei den **Capital-Market-Ethics-Fällen** (Wahlaufgabe Q6 gegen Agency) geht es fast immer um **Independence and Objectivity** (CFA Standards). Die goldene Regel lautet weder Verzicht noch öffentlicher Skandal, sondern **Full Disclosure (Offenlegung)** gegenüber Kunden bzw. Vorgesetzten plus interne **Compliance / Chinese Walls**.",
      },
      {
        type: "steps",
        title: "4-Schritte-Schema für jeden CFA-Ethik-Fall",
        items: [
          "**Buchstabe UND Inhalt ausdrücklich nennen** (z. B. Antwort d — schreiben unter Offenlegung).",
          "**Interessenkonflikt klar benennen:** Gefährdung von *Independence & Objectivity*.",
          "**Richtige Lösung begründen:** Transparente **Offenlegung (Disclosure)** + Einhaltung interner Compliance / Information Barriers.",
          "**Alle anderen Optionen gezielt verwerfen:** Unterscheiden zwischen *Überreaktion* (Social Media, Staatsanwaltschaft ohne Rechtsverstoß, Auftragsverzicht) und *Unterreaktion / Rechtsbruch* (geheim verschweigen, ohne Meinung berichten).",
        ],
      },
      {
        type: "example",
        title: "Die zwei echten Altklausur-Fälle",
        md: "- **Fall A (MaxCapital / Analystin Jones, FT23 d / FT20 b / FT20 Resit c):** M&A-Mandat & Partners im Board von XYZ. Jones darf den Research-Report **schreiben, sofern sie die besondere Beziehung vollständig offenlegt** (Chinese Walls wahren).\n- **Fall B (PE-Managerin Ms. Smith / Gastgeschenk, FT21 c):** Teures Geschenk beim Auslandstermin darf nur zur Vermeidung kultureller Beleidigung angenommen werden, **ist aber zwingend dem Vorgesetzten / Compliance offenzulegen** (damit die Firma entscheidet).",
      },
    ],
    standardAnswer: [
      {
        type: "model_answer",
        title: "Klausurfertige Antwortvorlage (Ethics Case Q6)",
        md: "**Decision:** Option (d) — Jones may write the research report provided she ==fully discloses== the special relationship.\n\n**Reasoning:** MaxCapital's investment banking ties and partner board seats create a potential conflict that could impair ==independence and objectivity== under CFA standards, yet such relationships are legal and common. Full ==disclosure== enables investors to evaluate potential bias while keeping internal ==information barriers (Chinese walls)== intact.\n\n**Rejection of alternatives:** Refusing to write (a) or omitting an opinion (c) needlessly deprives clients of research; alerting prosecutors (b) or leaking via social media (e) is an unjustified overreaction and breaches employer loyalty without evidence of illegality.",
      },
    ],
    tasks: [
      {
        kind: "essay",
        id: "ethics-case-a",
        name: "Fall A: MaxCapital M&A-Mandat & Research-Report (FT23)",
        origin: "altklausur",
        originLabel: "FT23 Q6 (10 P · Wahl vs. Agency)",
        points: 10,
        question:
          "Analyst Jones works at MaxCapital (M&A advisor & partner board seats at XYZ) and is asked to write a research report on XYZ. Choose the best option (**a–e**) and justify why the chosen option is right and all others are wrong:\n- a) Refuse to write\n- b) Inform regulators / public prosecution\n- c) Write without expressing an opinion\n- d) Write and disclose the special relationship\n- e) Make the relationship public on social media",
        checklist: [
          { text: "Korrekte Wahl: Option (d) + vollständiger Antwortsatz genannt", points: 2 },
          { text: "Konflikt benannt: Independence and Objectivity (CFA Standards) gefährdet, aber legal", points: 2 },
          { text: "Lösung: Full Disclosure an Leser + interne Chinese Walls / Compliance einhalten", points: 2 },
          { text: "Optionen (a) und (c) begründet abgelehnt (unverhältnismäßig / wertlos ohne Empfehlung)", points: 2 },
          { text: "Optionen (b) und (e) begründet abgelehnt (Überreaktion, keine Illegalität, Pflichtverletzung)", points: 2 },
        ],
        modelAnswer: [
          {
            type: "text",
            md: "**Answer d):** Write the report with ==full disclosure==. The M&A relationship and board seats threaten ==independence and objectivity==, but transparency allows readers to assess potential bias while ==information barriers== prevent leakage. Options (a) and (c) harm clients unnecessarily; (b) and (e) escalate without illegal conduct and breach loyalty/compliance.",
          },
        ],
      },
      {
        kind: "essay",
        id: "ethics-case-b",
        name: "Fall B: Ms. Smith & teures Gastgeschenk im Ausland (FT21)",
        origin: "altklausur",
        originLabel: "FT21 Q6 (10 P)",
        points: 10,
        question:
          "PE portfolio manager Ms. Smith receives a very expensive gift from the management of a target firm during a trip abroad, where refusing would be an insult. Discuss options **a–f** (give up deal / accept without condition / not OK without disclosure to supervisor / inform regulators / social media / donate to charity).",
        checklist: [
          { text: "Korrekte Wahl: (c) Annahme nicht OK ohne Offenlegung beim Supervisor / Arbeitgeber", points: 2 },
          { text: "Grundsatz: Geschenke von Zielunternehmen gefährden Independence & Objectivity", points: 2 },
          { text: "Kulturkonflikt gelöst: höflich annehmen, aber umgehend Compliance/Vorgesetzte einbinden", points: 2 },
          { text: "Unterreaktion (b) und Umgehung durch Spende (f) abgelehnt (Einflussnahme bleibt, Boss übergangen)", points: 2 },
          { text: "Überreaktionen (a), (d) Behörden, (e) Social Media sauber widerlegt", points: 2 },
        ],
        modelAnswer: [
          {
            type: "text",
            md: "**Answer c):** Accepting an expensive gift from a prospective target compromises ==independence and objectivity==. While local etiquette may prevent immediate refusal, it is unacceptable unless ==disclosed to the supervisor/employer== so the firm can take custody or apply compliance rules. Simply accepting (b) or donating (f) still bypasses employer oversight; walking away (a) or going to regulators/social media (d, e) overreacts and breaches confidentiality.",
          },
        ],
      },
      {
        kind: "mc",
        id: "ethics-mc",
        name: "Quick check: CFA Ethics Golden Rule",
        origin: "altklausur",
        questions: [
          {
            q: "Welches Grundprinzip löst sowohl Fall A (M&A-Beziehung im Research) als auch Fall B (teures Geschenk)?",
            options: [
              "Sofortige Anzeige bei der Staatsanwaltschaft",
              "Vollständige Offenlegung (Disclosure) + interne Compliance",
              "Jedes Geschäft sofort abbrechen",
            ],
            answer: 1,
            explain: "CFA Standards verlangen bei legalen Interessenkonflikten transparente Offenlegung und Compliance-Kontrolle.",
          },
          {
            q: "Warum reicht im Geschenk-Fall (Fall B) eine private Spende an eine Wohltätigkeitsorganisation (Option f) nicht aus?",
            options: [
              "Weil dadurch trotzdem die Aufsicht / der Vorgesetzte übergangen wird und eine Beeinflussung im Raum steht",
              "Weil Spenden im PE-Geschäft illegal sind",
              "Weil Kunden dann Social Media informieren müssen",
            ],
            answer: 0,
            explain: "Das Geschenk wurde wegen des Deals gegeben — der Arbeitgeber muss zwingend informiert werden und entscheiden.",
          },
        ],
      },
    ],
    cards: [
      {
        id: "ethics-c1",
        front: "Welcher CFA-Standard ist in Fall A & B betroffen?",
        back: "**Independence and Objectivity** — zu schützen durch **Full Disclosure (Offenlegung)** und Compliance.",
      },
      {
        id: "ethics-c2",
        front: "Lösung Fall A (MaxCapital / Analystin Jones)",
        back: "**Option d:** Bericht schreiben, **aber** M&A-/Board-Beziehung vollständig offenlegen + Chinese Walls einhalten.",
      },
      {
        id: "ethics-c3",
        front: "Lösung Fall B (Ms. Smith / teures Geschenk)",
        back: "**Option c:** Ohne Offenlegung gegenüber dem Vorgesetzten nicht OK — Firma entscheidet über Verwahrung/Compliance.",
      },
    ],
    mistakes: [
      "Nur den Buchstaben schreiben ohne Erklärung, warum alle anderen Optionen falsch sind.",
      "Überreaktionen (Social Media / Staatsanwaltschaft) für konsequente Ethik halten.",
    ],
    hook: "**Immer Offenlegung (Disclosure) schlägt Verzicht oder Skandal**.",
    source: "Gastvortrag Capital Market Ethics, Altklausuren FT20–FT23 Q6.",
  },

  ratings: {
    schema: "lernly.thema/1",
    id: "ratings",
    theory: [
      {
        type: "simple",
        md: "**Credit Rating Agencies** (S&P, Moody's, Fitch) schätzen die Ausfallwahrscheinlichkeit (**Probability of Default**) von Unternehmen, Anleihen oder Staaten auf einer Skala von **AAA bis D** (ab **BBB−** aufwärts: *Investment Grade*, darunter *Sub-Investment Grade / High Yield*).",
      },
      {
        type: "steps",
        title: "Rolle & die 3 Hauptkritikpunkte (Folien 37–45)",
        items: [
          "**Funktion:** Senken Informationsasymmetrie zwischen Emittenten und Investoren; bestimmen Zinskosten und bankaufsichtliche Eigenkapitalanforderungen.",
          "**Issuer-pays-Modell & Conflict of Interest:** Der Emittent bezahlt die Agentur → Anreiz zu wohlwollenden Ratings (*Rating Shopping*, Beratung bei strukturierten Produkten 2007/08).",
          "**Procyclicality & Oligopol:** Späte, gebündelte Herabstufungen in Krisen erzwingen Notverkäufe und verschärfen den Abschwung; sehr konzentrierter Markt (ESMA-Aufsicht als Gegenmaßnahme).",
        ],
      },
      {
        type: "table",
        head: ["Merkmal", "Convertible Bond (2015 / Mock)", "CoCo Bond / AT1 (FT21)"],
        rows: [
          ["**Wandlungsrecht**", "Wahlrecht beim **Investor** (Anleihe → Aktie)", "Automatische Pflichtwandlung/Abschreibung beim **Emittenten**"],
          ["**Auslöser**", "Aktienkurs steigt über Wandlungspreis", "Harter **Trigger** (z. B. CET1-Quote fällt unter Schwelle)"],
          ["**Warum emittieren?**", "Niedrigerer Kupon, keine sofortige Verwässerung, reduziert *Asset Substitution*", "Automatischer **Bail-in** in Bankkrisen (zählt zu AT1 unter Basel III)"],
        ],
      },
    ],
    standardAnswer: [
      {
        type: "model_answer",
        title: "Klausurfertige Antwort (Credit Rating Agencies)",
        md: "Credit rating agencies (S&P, Moody's, Fitch) assess a borrower's ==probability of default== on a scale from AAA to D (BBB− and above: ==investment grade==). Acting as third-party monitors, they reduce ==information asymmetry==, guide debt pricing, and serve regulatory capital rules.\n\nUnder the ==issuer-pays model==, the rated issuer pays the agency while investors read ratings for free. This creates ==conflicts of interest== (rating shopping, pre-2008 structured-finance bias), compounded by market oligopoly, ==procyclicality== (synchronized crisis downgrades triggering fire sales), and lagging reactions.",
      },
    ],
    tasks: [
      {
        kind: "essay",
        id: "ratings-cra",
        name: "Role & critique of Credit Rating Agencies (FT23 Q3)",
        origin: "altklausur",
        originLabel: "FT23 / FT20 / FT21 Q3 (5–7 P)",
        points: 6,
        question: "Briefly explain and discuss the role of **Credit Rating Agencies**, who pays whom, and what conflicts of interest arise.",
        checklist: [
          { text: "Aufgabe: Probability of Default schätzen; Big Three (S&P, Moody's, Fitch)", points: 1 },
          { text: "Skala: AAA bis D, Investment Grade (≥ BBB−) vs. High Yield", points: 1 },
          { text: "Ökonomische Rolle: weniger Information Asymmetry, beeinflusst Cost of Debt & Regulierung", points: 1 },
          { text: "Issuer-pays-Modell: Emittent zahlt Agentur, Investor nutzt kostenlos", points: 1 },
          { text: "Conflict of Interest: Rating Shopping & falsche Anreize (z. B. 2007/08)", points: 1 },
          { text: "Weitere Kritik: Procyclicality (Fire Sales), Oligopol, späte Reaktion, ESMA-Aufsicht", points: 1 },
        ],
        modelAnswer: [
          {
            type: "text",
            md: "CRAs estimate ==probability of default== (AAA to D; investment grade ≥ BBB−), lowering ==information asymmetry== and influencing borrowing costs. Because the ==issuer pays==, agencies face ==conflicts of interest== (rating shopping), reinforce crises through ==procyclical== downgrades, react slowly, and operate as an oligopoly despite tighter EU/ESMA oversight.",
          },
        ],
      },
      {
        kind: "essay",
        id: "ratings-coco",
        name: "Convertible Bonds vs. Contingent Convertibles (CoCos)",
        origin: "altklausur",
        originLabel: "FT21 & 2015 Q3 (6 P)",
        points: 6,
        question: "Briefly explain **Convertible Bonds** and **Contingent Convertible Bonds (CoCos)** and compare the rationale behind both instruments.",
        checklist: [
          { text: "Convertible: Straight Bond + Wandlungsoption für den Investor → niedrigerer Kupon, weniger Asset Substitution", points: 2 },
          { text: "CoCo: Anleihe wandelt bei vordefiniertem Bank-Trigger (CET1 / Non-Viability) automatisch in EK oder wird abgeschrieben", points: 2 },
          { text: "CoCo-Rationale: Bail-in durch Gläubiger statt Steuerzahler (Bail-out), zählt zu AT1 unter Basel III", points: 2 },
        ],
        modelAnswer: [
          {
            type: "text",
            md: "A ==convertible bond== grants the **investor** an option to swap debt for shares, lowering coupon costs and curbing asset-substitution agency conflicts. A ==CoCo bond== triggers automatic conversion or write-down at the **issuer's** distress threshold (e.g., low CET1 ratio), providing ==bail-in== loss absorption instead of taxpayer bail-outs and qualifying as Basel III AT1 capital.",
          },
        ],
      },
      {
        kind: "mc",
        id: "ratings-mc",
        name: "Quick check: Ratings, Convertibles & CoCos",
        origin: "altklausur",
        questions: [
          {
            q: "Wo liegt die Grenze zwischen Investment Grade und Sub-Investment Grade (High Yield)?",
            options: [
              "Zwischen AA und A",
              "Unterhalb von BBB− (bei S&P/Fitch)",
              "Unterhalb von CCC",
            ],
            answer: 1,
            explain: "Ab BBB− (bzw. Baa3 bei Moody's) abwärts beginnt der High-Yield-/Junk-Bereich.",
          },
          {
            q: "Worin liegt der Kernunterschied bei der Wandlung zwischen Convertible Bond und CoCo?",
            options: [
              "Beim Convertible entscheidet der Investor, beim CoCo ein vordefinierter Stress-Trigger",
              "CoCos haben niemals Zinszahlungen",
              "Convertibles können nur von Banken begeben werden",
            ],
            answer: 0,
            explain: "Convertibles geben dem Investor eine Call-Option bei gutem Kursverlauf; CoCos schützen Banken im Krisenfall.",
          },
          {
            q: "Warum gelten Credit Ratings als prozyklisch?",
            options: [
              "Weil alle Emittenten jedes Jahr hochgestuft werden",
              "Weil gebündelte Herabstufungen in Krisen Zwangsverkäufe und teurere Refinanzierung auslösen",
              "Weil sie vom Steuerzahler finanziert werden",
            ],
            answer: 1,
            explain: "Viele institutionelle Investoren müssen sub-investment-grade Anleihen sofort abstoßen (Fire Sales).",
          },
        ],
      },
    ],
    cards: [
      {
        id: "ratings-c1",
        front: "Was bedeutet das Issuer-Pays-Modell bei Ratingagenturen?",
        back: "Der Emittent bezahlt das Rating → **Conflict of Interest / Rating Shopping** trotz kostenloser Nutzung durch Investoren.",
      },
      {
        id: "ratings-c2",
        front: "Grenze zum Sub-Investment Grade (High Yield)?",
        back: "Alles unter **BBB−** (S&P/Fitch) bzw. **Baa3** (Moody's).",
      },
      {
        id: "ratings-c3",
        front: "Convertible Bond vs. CoCo Bond?",
        back: "**Convertible:** Investor wandelt bei hohem Aktienkurs · **CoCo:** Pflichtwandlung/-Abschreibung bei niedrigem Bank-CET1 (**Bail-in**).",
      },
    ],
    mistakes: [
      "Convertible und CoCo verwechseln (Wahlrecht beim Investor vs. automatischer Krisen-Trigger).",
      "Nur 'Conflict of interest' schreiben, ohne 'Issuer pays' und 'Procyclicality' zu erklären.",
    ],
    hook: "**BBB− · Issuer pays · Procyclical · CoCo = Bank-Bail-in**.",
    source: "Folien 37–45, Altklausuren 2015–2023 Q3.",
  },
};

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
    dcf: CORPORATE_FINANCE_TOPICS.dcf,
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
