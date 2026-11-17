import { CORPORATE_FINANCE_SEED } from "./seed";
import type { CardReviewState, StudyProgressState } from "./types";

const STORAGE_KEY = "lernly.study.progress.v1";

const DEFAULT_STATE: StudyProgressState = {
  version: 1,
  cardReviews: {},
  completedExerciseIds: [],
  streakDays: CORPORATE_FINANCE_SEED.initialStreakDays,
};

let cachedRaw: string | null = null;
let cachedSnapshot: StudyProgressState = DEFAULT_STATE;
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

export function getServerStudyProgressSnapshot(): StudyProgressState {
  return DEFAULT_STATE;
}

export function readStudyProgress(): StudyProgressState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedSnapshot;
    }
    cachedRaw = raw;
    if (!raw) {
      cachedSnapshot = DEFAULT_STATE;
      return cachedSnapshot;
    }
    const parsed = JSON.parse(raw) as Partial<StudyProgressState>;
    if (parsed.version !== 1 || typeof parsed.cardReviews !== "object") {
      cachedSnapshot = DEFAULT_STATE;
      return cachedSnapshot;
    }
    cachedSnapshot = {
      version: 1,
      cardReviews: parsed.cardReviews ?? {},
      completedExerciseIds: Array.isArray(parsed.completedExerciseIds)
        ? parsed.completedExerciseIds
        : [],
      streakDays:
        typeof parsed.streakDays === "number"
          ? parsed.streakDays
          : DEFAULT_STATE.streakDays,
    };
    return cachedSnapshot;
  } catch {
    return DEFAULT_STATE;
  }
}

function writeStudyProgress(next: StudyProgressState): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(next);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedSnapshot = next;
  } catch {
    cachedSnapshot = next;
  }
  notifyListeners();
}

export function saveCardReview(cardId: string, review: CardReviewState): void {
  const current = readStudyProgress();
  writeStudyProgress({
    ...current,
    cardReviews: {
      ...current.cardReviews,
      [cardId]: review,
    },
  });
}

export function markExerciseCompleted(exerciseId: string): void {
  const current = readStudyProgress();
  if (current.completedExerciseIds.includes(exerciseId)) return;
  writeStudyProgress({
    ...current,
    completedExerciseIds: [...current.completedExerciseIds, exerciseId],
  });
}

export function resetStudyProgress(): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage access errors in restricted WebViews.
    }
  }
  cachedRaw = null;
  cachedSnapshot = DEFAULT_STATE;
  notifyListeners();
}

export function subscribeStudyProgress(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}
