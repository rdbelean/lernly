import type {
  CalcExercise,
  DailyPlanItem,
  StudyCourseSeed,
  StudyFlashcard,
  StudyTopic,
} from "./types";

export const CORPORATE_FINANCE_TOPICS: StudyTopic[] = [
  {
    id: "dcf",
    order: "01",
    name: "Discounted Cashflow",
    shortName: "DCF",
    points: 22,
    mastery: 30,
    status: "dran",
  },
  {
    id: "leverage",
    order: "02",
    name: "Leverage & MM",
    shortName: "Leverage & MM",
    points: 19,
    estimated: true,
    mastery: 68,
    status: "laeuft",
  },
  {
    id: "kapitalstruktur",
    order: "03",
    name: "Kapitalstruktur",
    shortName: "Kapitalstr.",
    points: 18,
    mastery: 85,
    status: "laeuft",
  },
  {
    id: "wacc",
    order: "04",
    name: "WACC",
    shortName: "WACC",
    points: 16,
    mastery: 45,
    status: "laeuft",
  },
  {
    id: "ertragswert",
    order: "05",
    name: "Ertragswert",
    shortName: "Ertragswert",
    points: 11,
    mastery: 100,
    status: "sicher",
  },
  {
    id: "dividenden",
    order: "06",
    name: "Dividenden",
    shortName: "Dividenden",
    points: 9,
    mastery: 100,
    status: "sicher",
  },
  {
    id: "agency",
    order: "07",
    name: "Agency",
    shortName: "Agency",
    points: 5,
    mastery: 0,
    status: "laeuft",
  },
];

export const CORPORATE_FINANCE_DAILY_PLAN: DailyPlanItem[] = [
  {
    id: "plan-dcf-tv",
    order: "01",
    title: "Discounted Cashflow · Terminal Value",
    minutes: 25,
    href: "/karten?topic=dcf",
    topicId: "dcf",
  },
  {
    id: "plan-cards",
    order: "02",
    title: "12 Karten wiederholen",
    minutes: 8,
    href: "/karten",
    topicId: "dcf",
  },
  {
    id: "plan-wacc-calc",
    order: "03",
    title: "WACC · 1 Rechenaufgabe",
    minutes: 15,
    href: "/rechnen",
    topicId: "wacc",
  },
];

export const CORPORATE_FINANCE_FLASHCARDS: StudyFlashcard[] = [
  {
    id: "cf-dcf-1",
    topicId: "dcf",
    topicLabel: "DCF · 22 P",
    topicStatus: "dran",
    pointValue: 2.1,
    question: "Was ist der Terminal Value?",
    answer:
      "Der geschätzte Unternehmenswert nach der Detailplanungsphase (meist ab Jahr 6). In der Praxis macht er oft 60–80 % des gesamten DCF-Werts aus.",
    visual: {
      kind: "terminal-value",
      barsLabel: "Jahr 1–5",
      tvBadge: "TV",
      tvSubLabel: "ca. 70 %",
      tvCaption: "ab Jahr 6",
      formula: "TV = FCFₙ₊₁ ÷ (WACC − g)",
    },
  },
  {
    id: "cf-dcf-2",
    topicId: "dcf",
    topicLabel: "DCF · 22 P",
    topicStatus: "dran",
    pointValue: 2.0,
    question: "Wie berechnest du den Free Cash Flow to Firm (FCFF)?",
    answer:
      "EBIT × (1 − s) + Abschreibungen − Investitionen (CapEx) − Veränderung des Net Working Capital. Der FCFF steht allen Kapitalgebern zu.",
    visual: {
      kind: "formula",
      caption: "Zahlungsstrom vor Zinsen an EK und FK",
      formula: "FCFF = EBIT·(1 − s) + D&A − CapEx − ΔNWC",
    },
  },
  {
    id: "cf-dcf-3",
    topicId: "dcf",
    topicLabel: "DCF · 22 P",
    topicStatus: "dran",
    pointValue: 1.9,
    question: "Welcher Fehler passiert am häufigsten beim Abzinsen des Terminal Value?",
    answer:
      "Der Terminal Value nach Gordon Growth steht am Ende von Jahr n (nicht n+1). Er muss genau mit (1 + WACC)ⁿ auf heute abgezinst werden.",
    visual: {
      kind: "formula",
      caption: "Barwert des Terminal Value",
      formula: "PV(TV) = TVₙ ÷ (1 + WACC)ⁿ",
    },
  },
  {
    id: "cf-dcf-4",
    topicId: "dcf",
    topicLabel: "DCF · 22 P",
    topicStatus: "dran",
    pointValue: 1.8,
    question: "Wie kommst du vom Enterprise Value zum Equity Value?",
    answer:
      "Du ziehst die verzinslichen Finanzschulden (Net Debt = Fremdkapital minus Cash) vom Enterprise Value ab.",
    visual: {
      kind: "formula",
      caption: "Brücke zum Marktwert des Eigenkapitals",
      formula: "Equity Value = Enterprise Value − Schulden + Cash",
    },
  },
  {
    id: "cf-wacc-1",
    topicId: "wacc",
    topicLabel: "WACC · 16 P",
    topicStatus: "laeuft",
    pointValue: 2.0,
    question: "Warum wird beim WACC nur der Fremdkapitalzinssatz um Steuern gekürzt?",
    answer:
      "Fremdkapitalzinsen mindern den steuerpflichtigen Gewinn (Tax Shield). Dividenden an Eigenkapitalgeber sind steuerlich nicht abzugsfähig.",
    visual: {
      kind: "wacc-split",
      equityPct: 60,
      debtPct: 40,
      formula: "WACC = (E/V)·rₑ + (D/V)·r_d·(1 − s)",
    },
  },
  {
    id: "cf-wacc-2",
    topicId: "wacc",
    topicLabel: "WACC · 16 P",
    topicStatus: "laeuft",
    pointValue: 1.6,
    question: "Verwendest du im WACC Buchwerte oder Marktwerte für E und D?",
    answer:
      "Immer Marktwerte (Zielkapitalstruktur). Buchwerte spiegeln historische Anschaffungskosten wider, nicht die aktuellen Opportunitätskosten.",
  },
  {
    id: "cf-lev-1",
    topicId: "leverage",
    topicLabel: "Leverage & MM · ≈19 P",
    topicStatus: "laeuft",
    pointValue: 2.1,
    question: "Was besagt Modigliani-Miller Proposition I ohne Steuern?",
    answer:
      "Auf vollkommenen Kapitalmärkten ist der Unternehmenswert unabhängig von der Kapitalstruktur. Verschuldung verändert nur die Aufteilung, nicht die Größe des Kuchens.",
    visual: {
      kind: "formula",
      caption: "Irrelevanztheorem ohne Steuern",
      formula: "V_L = V_U",
    },
  },
  {
    id: "cf-lev-2",
    topicId: "leverage",
    topicLabel: "Leverage & MM · ≈19 P",
    topicStatus: "laeuft",
    pointValue: 1.8,
    question: "Was passiert mit den Eigenkapitalkosten bei steigendem Verschuldungsgrad (MM II)?",
    answer:
      "Sie steigen linear mit dem Verschuldungsgrad D/E, weil Eigenkapitalgeber das höhere finanzielle Risiko kompensiert haben wollen.",
    visual: {
      kind: "formula",
      caption: "MM Proposition II ohne Steuern",
      formula: "r_E = r_U + (r_U − r_D) · (D / E)",
    },
  },
  {
    id: "cf-kap-1",
    topicId: "kapitalstruktur",
    topicLabel: "Kapitalstr. · 18 P",
    topicStatus: "laeuft",
    pointValue: 1.8,
    question: "Was beschreibt die Trade-off-Theorie der Kapitalstruktur?",
    answer:
      "Unternehmen wählen den Verschuldungsgrad, bei dem der zusätzliche Nutzen aus dem Tax Shield genau den zusätzlichen erwarteten Insolvenzkosten entspricht.",
    visual: {
      kind: "formula",
      caption: "Unternehmenswert mit Steuern & Insolvenzkosten",
      formula: "V_L = V_U + PV(Tax Shield) − PV(Insolvenz)",
    },
  },
  {
    id: "cf-kap-2",
    topicId: "kapitalstruktur",
    topicLabel: "Kapitalstr. · 18 P",
    topicStatus: "laeuft",
    pointValue: 1.5,
    question: "In welcher Reihenfolge finanzieren Unternehmen laut Pecking-Order-Theorie?",
    answer:
      "Zuerst Innenfinanzierung (einbehaltene Gewinne), dann Fremdkapital, und erst als letztes neues Eigenkapital – wegen asymmetrischer Information.",
  },
  {
    id: "cf-div-1",
    topicId: "dividenden",
    topicLabel: "Dividenden · 9 P",
    topicStatus: "sicher",
    pointValue: 1.2,
    question: "Warum reagieren Aktienkurse oft positiv auf unerwartete Dividendenerhöhungen?",
    answer:
      "Signaling: Das Management signalisiert stabile künftige Cashflows, weil eine spätere Dividendenkürzung vom Markt stark abgestraft wird.",
  },
  {
    id: "cf-ag-1",
    topicId: "agency",
    topicLabel: "Agency · 5 P",
    topicStatus: "laeuft",
    pointValue: 1.1,
    question: "Was ist das Free-Cash-Flow-Problem nach Jensen?",
    answer:
      "Management mit viel überschüssigem Cash neigt zu unrentablen Prestige-Investitionen (Empire Building), statt das Geld an Aktionäre auszuschütten.",
  },
];

export const CORPORATE_FINANCE_EXERCISES: CalcExercise[] = [
  {
    id: "ex-wacc-1",
    topicId: "wacc",
    topicLabel: "WACC · 16 P",
    headlineLine1: "Berechne den",
    headlineLine2: "WACC",
    parameters: [
      { label: "Eigenkapital E", value: "600 Mio." },
      { label: "Fremdkapital D", value: "400 Mio." },
      { label: "EK-Kosten", value: "9 %" },
      { label: "FK-Kosten", value: "5 %" },
      { label: "Steuersatz", value: "30 %" },
    ],
    unit: "%",
    correctAnswer: 6.8,
    tolerance: 0.05,
    formattedAnswer: "6,8 %",
    mistakes: [
      {
        match: 7.4,
        tolerance: 0.05,
        message: "Fast. Du hast die Steuer auf Fremdkapital vergessen.",
      },
      {
        match: 5.8,
        tolerance: 0.05,
        message: "Fast. Der Steuersatz gilt nur für Fremdkapital, nicht für Eigenkapital.",
      },
      {
        match: 5.18,
        tolerance: 0.06,
        message: "Fast. Kürze nur die FK-Kosten um (1 − 0,30), nicht den gesamten WACC.",
      },
    ],
    genericError: "Noch nicht ganz. Prüfe Gewichtung (60 % EK, 40 % FK) und Tax Shield.",
    steps: [
      {
        num: 1,
        text: "Gesamtkapital: 600 + 400 = 1.000 Mio. (60 % EK, 40 % FK)",
      },
      {
        num: 2,
        text: "FK nach Steuern: 5 % × (1 − 0,30) = 3,5 %",
      },
      {
        num: 3,
        text: "WACC = 0,60 × 9 % + 0,40 × 3,5 % = 5,4 % + 1,4 %",
      },
    ],
  },
  {
    id: "ex-dcf-tv",
    topicId: "dcf",
    topicLabel: "DCF · 22 P",
    headlineLine1: "Berechne den",
    headlineLine2: "Terminal Value",
    parameters: [
      { label: "FCF in Jahr 6", value: "12 Mio." },
      { label: "WACC", value: "8 %" },
      { label: "Wachstumsrate g", value: "2 %" },
    ],
    unit: "Mio.",
    correctAnswer: 200,
    tolerance: 0.5,
    formattedAnswer: "200 Mio.",
    mistakes: [
      {
        match: 150,
        tolerance: 0.5,
        message: "Fast. Du hast die Wachstumsrate g im Nenner vergessen.",
      },
      {
        match: 120,
        tolerance: 0.5,
        message: "Fast. Im Nenner steht WACC minus g, nicht plus g.",
      },
    ],
    genericError: "Noch nicht ganz. Teile den FCF in Jahr 6 durch (WACC − g).",
    steps: [
      {
        num: 1,
        text: "Nenner (WACC − g): 8 % − 2 % = 6 % = 0,06",
      },
      {
        num: 2,
        text: "Gordon-Growth-Formel: TV₅ = FCF₆ ÷ (WACC − g)",
      },
      {
        num: 3,
        text: "TV₅ = 12 Mio. ÷ 0,06 = 200 Mio.",
      },
    ],
  },
  {
    id: "ex-mm-re",
    topicId: "leverage",
    topicLabel: "Leverage & MM · ≈19 P",
    headlineLine1: "Berechne die",
    headlineLine2: "EK-Kosten",
    parameters: [
      { label: "r_U (unverschuldet)", value: "8 %" },
      { label: "r_D (Fremdkapital)", value: "4 %" },
      { label: "Verschuldungsgrad D/E", value: "0,5" },
      { label: "Steuersatz", value: "0 %" },
    ],
    unit: "%",
    correctAnswer: 10,
    tolerance: 0.05,
    formattedAnswer: "10 %",
    mistakes: [
      {
        match: 12,
        tolerance: 0.05,
        message: "Fast. Multipliziere die Risikoprämie noch mit D/E = 0,5.",
      },
      {
        match: 6,
        tolerance: 0.05,
        message: "Fast. Bei Verschuldung steigen die EK-Kosten über r_U (Plus, nicht Minus).",
      },
    ],
    genericError: "Noch nicht ganz. Nutze r_E = r_U + (r_U − r_D) × (D / E).",
    steps: [
      {
        num: 1,
        text: "Risikospread: r_U − r_D = 8 % − 4 % = 4 %",
      },
      {
        num: 2,
        text: "Finanzrisiko-Zuschlag: 4 % × 0,5 = 2 %",
      },
      {
        num: 3,
        text: "r_E = 8 % + 2 % = 10 %",
      },
    ],
  },
];

export const CORPORATE_FINANCE_SEED: StudyCourseSeed = {
  courseName: "Corporate Finance",
  dateLabel: "DI, 17. NOVEMBER",
  examCountdownLabel: "KLAUSUR IN 6 TAGEN",
  initialStreakDays: 9,
  topics: CORPORATE_FINANCE_TOPICS,
  dailyPlan: CORPORATE_FINANCE_DAILY_PLAN,
  flashcards: CORPORATE_FINANCE_FLASHCARDS,
  exercises: CORPORATE_FINANCE_EXERCISES,
};

export function getTotalPoints(topics: readonly StudyTopic[]): number {
  return topics.reduce((sum, topic) => sum + topic.points, 0);
}

export function getSecuredPoints(topics: readonly StudyTopic[]): number {
  const exact = topics.reduce(
    (sum, topic) => sum + (topic.points * topic.mastery) / 100,
    0,
  );
  return Math.round(exact);
}

export function getPrimaryFocusTopic(topics: readonly StudyTopic[]): StudyTopic {
  const urgent = topics.filter((topic) => topic.status === "dran");
  const pool = urgent.length > 0 ? urgent : topics;
  return pool.reduce((best, topic) =>
    topic.points > best.points ? topic : best,
  );
}

export function getDailyPlanMinutes(items: readonly DailyPlanItem[]): number {
  return items.reduce((sum, item) => sum + item.minutes, 0);
}

export function formatTopicPoints(topic: Pick<StudyTopic, "points" | "estimated">): string {
  return topic.estimated ? `≈${topic.points}` : String(topic.points);
}
