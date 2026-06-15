// Static demo data for the landing mockups (real app components, fed hardcoded
// values). Realistic populated state — never empty/test. Fully satisfies the
// Zod-derived StudyPack type so the real PackHub/FlashcardDeck render verbatim.
import type { StudyPack } from "@/lib/schema";
import type { PackExamSummary } from "@/components/pack/PackHeader";
import type { LatestAttempt } from "@/components/pack/PackHub";

const REAL_CARDS: StudyPack["flashcards"] = [
  {
    id: "fc-1",
    category: "Wettbewerb",
    question: "Was beschreibt die Preiselastizität der Nachfrage?",
    answer:
      "Wie stark die nachgefragte Menge auf eine Preisänderung reagiert — elastisch (> 1) vs. unelastisch (< 1).",
    difficulty: "medium",
  },
  {
    id: "fc-2",
    category: "Strategie",
    question: "Nenne die fünf Wettbewerbskräfte nach Porter.",
    answer:
      "Rivalität der Wettbewerber, neue Anbieter, Ersatzprodukte, Verhandlungsmacht der Lieferanten und der Abnehmer.",
    difficulty: "hard",
  },
  {
    id: "fc-3",
    category: "Marketing",
    question: "Welche Faktoren bilden den Marketing-Mix?",
    answer: "Product, Price, Place, Promotion — die vier P.",
    difficulty: "easy",
  },
  {
    id: "fc-4",
    category: "Organisation",
    question: "Wofür steht die BCG-Matrix?",
    answer:
      "Portfolio-Analyse nach Marktwachstum und relativem Marktanteil: Stars, Cash Cows, Question Marks, Poor Dogs.",
    difficulty: "medium",
  },
];

// The first three real cards drive the flashcard mockup (1 / 3 + a real stacked
// deck behind the active card).
export const DEMO_CARDS = REAL_CARDS.slice(0, 3);

// Pad the deck to a realistic size — only .length is read in the hub.
const FILLER_CARDS: StudyPack["flashcards"] = Array.from({ length: 30 }, (_, i) => ({
  id: `fc-x${i}`,
  category: "Strategie",
  question: `Konzept ${i + 5} im Überblick?`,
  answer: "Kurzantwort aus deinem Skript.",
  difficulty: "medium" as const,
}));

// Extra Übersicht concepts so "34 Karten / N Konzepte" reads believable.
const FILLER_CONCEPTS = (topic: string, terms: string[]): StudyPack["overview"]["topics"][number]["concepts"] =>
  terms.map((term) => ({
    term,
    definition: `${term} — Kernbegriff aus ${topic}.`,
    author: "Skript",
    importance: "medium" as const,
  }));

// Pad the exam quiz so the "Übungsklausur" mode count and the "Letztes Quiz"
// attempt size agree (~14 questions). Only .length is shown in the hub.
const FILLER_QUESTIONS = Array.from({ length: 12 }, (_, i) => ({
  id: `q-x${i}`,
  stem: `Beispielfrage ${i + 3} im Klausur-Stil?`,
  options: ["Option A", "Option B", "Option C", "Option D"],
  correctIndex: (i % 4) as 0 | 1 | 2 | 3,
  explanation: "Begründung aus deinem Material.",
  type: "apply" as const,
  category: "Strategie",
}));

export const DEMO_PACK: StudyPack = {
  courseTitle: "Strategisches Management",
  examType: "multiple_choice",
  flashcards: [...REAL_CARDS, ...FILLER_CARDS],
  overview: {
    topics: [
      {
        name: "Wettbewerbsstrategie",
        concepts: [
          {
            term: "Five Forces",
            definition: "Branchenstrukturanalyse nach Porter.",
            author: "Porter",
            importance: "high",
            examRelevance: "Klassisches Klausurthema",
            relevanceTag: "kam dran",
          },
          {
            term: "Wettbewerbsvorteil",
            definition: "Kostenführerschaft oder Differenzierung.",
            author: "Porter",
            importance: "high",
          },
          {
            term: "BCG-Matrix",
            definition: "Portfolio nach Wachstum und Marktanteil.",
            author: "Henderson",
            importance: "medium",
          },
          ...FILLER_CONCEPTS("Wettbewerbsstrategie", [
            "Differenzierung",
            "Kostenführerschaft",
            "Nischenstrategie",
          ]),
        ],
      },
      {
        name: "Marktdynamik",
        concepts: [
          {
            term: "Preiselastizität",
            definition: "Reaktion der Menge auf Preisänderungen.",
            author: "Marshall",
            importance: "medium",
          },
          {
            term: "Marktsegmentierung",
            definition: "Aufteilung des Marktes in homogene Gruppen.",
            author: "Smith",
            importance: "medium",
          },
          ...FILLER_CONCEPTS("Marktdynamik", ["Marktwachstum", "Substitution"]),
        ],
      },
      {
        name: "Marketing & Organisation",
        concepts: FILLER_CONCEPTS("Marketing & Organisation", [
          "Marketing-Mix",
          "Markenführung",
          "Wertschöpfungskette",
          "Skaleneffekte",
        ]),
      },
    ],
  },
  authors: [
    {
      name: "Michael E. Porter",
      theory: "Wettbewerbsstrategie & Five Forces",
      useInExam: "Branchenanalyse auf Fallbeispiele anwenden",
    },
  ],
  schedule: {
    daysUntilExam: 14,
    days: [
      { day: 1, label: "Tag 1", tasks: ["Five Forces wiederholen", "10 Karten lernen"] },
      { day: 2, label: "Tag 2", tasks: ["Probeklausur Teil 1"] },
    ],
  },
  quizletExport: "strat-mgmt::fc-1::fc-2::fc-3",
  quiz: {
    questions: [
      {
        id: "q-1",
        stem: "Welcher Faktor zählt nicht zum Marketing-Mix?",
        options: ["Product", "Price", "Personalkosten", "Promotion"],
        correctIndex: 2,
        explanation:
          "Personalkosten gehören zur Kostenrechnung, nicht zu den vier P des Marketing-Mix.",
        type: "definition",
        category: "Marketing",
      },
      {
        id: "q-2",
        stem: "Welche Strategie beschreibt Kostenführerschaft am besten?",
        options: [
          "Höchster Preis im Markt",
          "Niedrigste Stückkosten der Branche",
          "Breiteste Produktpalette",
          "Stärkste Marke",
        ],
        correctIndex: 1,
        explanation: "Kostenführerschaft zielt auf die niedrigsten Kosten der Branche.",
        type: "apply",
        category: "Strategie",
      },
      ...FILLER_QUESTIONS,
    ],
  },
  visualMap: {
    blocks: [
      { title: "Wettbewerbskräfte", subtitle: "Porter", color: "violet", priority: "highest", frameworks: [] },
      { title: "Strategiearten", subtitle: "Kosten vs. Differenzierung", color: "cyan", frameworks: [] },
      { title: "Marktdynamik", color: "blue", frameworks: [] },
      { title: "Marketing-Mix", subtitle: "Die vier P", color: "amber", frameworks: [] },
      { title: "Portfolio-Analyse", subtitle: "BCG", color: "green", frameworks: [] },
      { title: "Wertschöpfung", color: "rose", frameworks: [] },
    ],
  },
  materialLanguage: "de",
};

export const DEMO_EXAM: PackExamSummary = {
  title: "Strategisches Management",
  exam_date: null, // set client-side to a perpetual ~14-day countdown
  color: "violet",
};

export const DEMO_ATTEMPT: LatestAttempt = {
  total_questions: 14,
  correct_count: 11,
  wrong_count: 3,
  per_topic: {
    Wettbewerb: { correct: 4, wrong: 1, skipped: 0 },
    Strategie: { correct: 4, wrong: 1, skipped: 0 },
    Marketing: { correct: 3, wrong: 1, skipped: 0 },
  },
  created_at: "", // set client-side to a fresh relative time
};

export const DEMO_CARD = REAL_CARDS[0];
