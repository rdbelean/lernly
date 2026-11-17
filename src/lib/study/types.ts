export type TopicStatus = "sicher" | "laeuft" | "dran";

export type DashboardVizMode = "leiste" | "balken" | "karte" | "waffel";

export type StudyTopic = {
  id: string;
  order: string;
  name: string;
  shortName: string;
  points: number;
  estimated?: boolean;
  mastery: number; // 0..100
  status: TopicStatus;
};

export type DailyPlanItem = {
  id: string;
  order: string;
  title: string;
  minutes: number;
  href: string;
  topicId: string;
};

export type CardVisual =
  | {
      kind: "terminal-value";
      barsLabel: string;
      tvBadge: string;
      tvSubLabel: string;
      tvCaption: string;
      formula: string;
    }
  | {
      kind: "wacc-split";
      equityPct: number;
      debtPct: number;
      formula: string;
    }
  | {
      kind: "formula";
      caption: string;
      formula: string;
    };

export type StudyFlashcard = {
  id: string;
  topicId: string;
  topicLabel: string;
  topicStatus: TopicStatus;
  pointValue: number;
  question: string;
  answer: string;
  visual?: CardVisual;
};

export type CalcParameter = {
  label: string;
  value: string;
};

export type CalcMistakeHint = {
  match: number;
  tolerance?: number;
  message: string;
};

export type CalcStep = {
  num: number;
  text: string;
};

export type CalcExercise = {
  id: string;
  topicId: string;
  topicLabel: string;
  headlineLine1: string;
  headlineLine2: string;
  parameters: CalcParameter[];
  unit: string;
  correctAnswer: number;
  tolerance: number;
  formattedAnswer: string;
  mistakes: CalcMistakeHint[];
  genericError: string;
  steps: CalcStep[];
};

export type RatingQuality = 1 | 2 | 3;

export type CardReviewState = {
  intervalDays: number;
  easeFactor: number;
  reps: number;
  lastRating: RatingQuality;
  nextDueAt: number;
};

export type StudyProgressState = {
  version: 1;
  cardReviews: Record<string, CardReviewState>;
  completedExerciseIds: string[];
  streakDays: number;
};

export type StudyCourseSeed = {
  courseName: string;
  dateLabel: string;
  examCountdownLabel: string;
  initialStreakDays: number;
  topics: StudyTopic[];
  dailyPlan: DailyPlanItem[];
  flashcards: StudyFlashcard[];
  exercises: CalcExercise[];
};
