import { DEMO_TRAINER_BUNDLE } from "./demoCourse";
import { scheduleCard } from "./sm2";
import type {
  TrainerBundle,
  TrainerMockHistoryEntry,
  TrainerProgressState,
  TrainerRating,
} from "./types";

const BUNDLE_KEY = "lernly.trainer.bundle.v1";
const PROGRESS_KEY = "lernly.trainer.progress.v1";

type BundleSnapshot = {
  bundle: TrainerBundle;
  isCustom: boolean;
};

const DEFAULT_BUNDLE_SNAPSHOT: BundleSnapshot = {
  bundle: DEMO_TRAINER_BUNDLE,
  isCustom: false,
};

const DEFAULT_PROGRESS: TrainerProgressState = {
  version: 1,
  solvedDrills: {},
  checkedChecklist: {},
  knownCards: {},
  taskRatings: {},
  cardRatings: {},
  cardSchedule: {},
  readTopics: {},
  mockHistory: [],
};

let cachedBundleRaw: string | null = null;
let cachedBundleSnapshot: BundleSnapshot = DEFAULT_BUNDLE_SNAPSHOT;

let cachedProgressRaw: string | null = null;
let cachedProgressSnapshot: TrainerProgressState = DEFAULT_PROGRESS;

const bundleListeners = new Set<() => void>();
const progressListeners = new Set<() => void>();

function notifyBundle() {
  for (const fn of bundleListeners) fn();
}

function notifyProgress() {
  for (const fn of progressListeners) fn();
}

export function getServerTrainerBundleSnapshot(): BundleSnapshot {
  return DEFAULT_BUNDLE_SNAPSHOT;
}

export function readTrainerBundleSnapshot(): BundleSnapshot {
  if (typeof window === "undefined") return DEFAULT_BUNDLE_SNAPSHOT;
  try {
    const raw = window.localStorage.getItem(BUNDLE_KEY);
    if (raw === cachedBundleRaw) return cachedBundleSnapshot;
    cachedBundleRaw = raw;
    if (!raw) {
      cachedBundleSnapshot = DEFAULT_BUNDLE_SNAPSHOT;
      return cachedBundleSnapshot;
    }
    const parsed = JSON.parse(raw) as Partial<TrainerBundle>;
    if (!parsed?.course?.topics || !parsed.topics) {
      cachedBundleSnapshot = DEFAULT_BUNDLE_SNAPSHOT;
      return cachedBundleSnapshot;
    }
    cachedBundleSnapshot = {
      bundle: parsed as TrainerBundle,
      isCustom: true,
    };
    return cachedBundleSnapshot;
  } catch {
    return DEFAULT_BUNDLE_SNAPSHOT;
  }
}

export function saveTrainerBundle(bundle: TrainerBundle): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(bundle);
    window.localStorage.setItem(BUNDLE_KEY, raw);
    cachedBundleRaw = raw;
    cachedBundleSnapshot = { bundle, isCustom: true };
  } catch {
    cachedBundleSnapshot = { bundle, isCustom: true };
  }
  resetTrainerProgress();
  notifyBundle();
}

export function resetTrainerBundle(): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(BUNDLE_KEY);
    } catch {
      /* ignore */
    }
  }
  cachedBundleRaw = null;
  cachedBundleSnapshot = DEFAULT_BUNDLE_SNAPSHOT;
  resetTrainerProgress();
  notifyBundle();
}

export function subscribeTrainerBundle(callback: () => void): () => void {
  bundleListeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === BUNDLE_KEY) callback();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    bundleListeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function getServerTrainerProgressSnapshot(): TrainerProgressState {
  return DEFAULT_PROGRESS;
}

export function readTrainerProgress(): TrainerProgressState {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (raw === cachedProgressRaw) return cachedProgressSnapshot;
    cachedProgressRaw = raw;
    if (!raw) {
      cachedProgressSnapshot = DEFAULT_PROGRESS;
      return cachedProgressSnapshot;
    }
    const parsed = JSON.parse(raw) as Partial<TrainerProgressState>;
    if (parsed?.version !== 1) {
      cachedProgressSnapshot = DEFAULT_PROGRESS;
      return cachedProgressSnapshot;
    }
    cachedProgressSnapshot = {
      version: 1,
      solvedDrills: parsed.solvedDrills ?? {},
      checkedChecklist: parsed.checkedChecklist ?? {},
      knownCards: parsed.knownCards ?? {},
      taskRatings: parsed.taskRatings ?? {},
      cardRatings: parsed.cardRatings ?? {},
      cardSchedule: parsed.cardSchedule ?? {},
      readTopics: parsed.readTopics ?? {},
      mockHistory: Array.isArray(parsed.mockHistory) ? parsed.mockHistory : [],
    };
    return cachedProgressSnapshot;
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function writeTrainerProgress(next: TrainerProgressState): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(next);
    window.localStorage.setItem(PROGRESS_KEY, raw);
    cachedProgressRaw = raw;
    cachedProgressSnapshot = next;
  } catch {
    cachedProgressSnapshot = next;
  }
  notifyProgress();
}

export function markTrainerDrillSolved(taskId: string): void {
  const cur = readTrainerProgress();
  if (cur.solvedDrills[taskId] && (cur.taskRatings[taskId] ?? 0) >= 2) return;
  writeTrainerProgress({
    ...cur,
    solvedDrills: { ...cur.solvedDrills, [taskId]: true },
    taskRatings: { ...cur.taskRatings, [taskId]: 2 },
  });
}

export function toggleTrainerChecklistItem(
  taskId: string,
  index: number,
): void {
  const cur = readTrainerProgress();
  const prevList = cur.checkedChecklist[taskId] ?? [];
  const exists = prevList.includes(index);
  const nextList = exists
    ? prevList.filter((i) => i !== index)
    : [...prevList, index];
  writeTrainerProgress({
    ...cur,
    checkedChecklist: { ...cur.checkedChecklist, [taskId]: nextList },
  });
}

export function toggleTrainerCardKnown(cardId: string): void {
  const cur = readTrainerProgress();
  const nextKnown = !cur.knownCards[cardId];
  writeTrainerProgress({
    ...cur,
    knownCards: { ...cur.knownCards, [cardId]: nextKnown },
    cardRatings: { ...cur.cardRatings, [cardId]: nextKnown ? 2 : 0 },
  });
}

export function rateTrainerTask(taskId: string, rating: TrainerRating): void {
  const cur = readTrainerProgress();
  writeTrainerProgress({
    ...cur,
    solvedDrills: {
      ...cur.solvedDrills,
      [taskId]: rating >= 2,
    },
    taskRatings: {
      ...cur.taskRatings,
      [taskId]: rating,
    },
  });
}

export function rateTrainerCard(cardId: string, rating: TrainerRating): void {
  const cur = readTrainerProgress();
  writeTrainerProgress({
    ...cur,
    knownCards: {
      ...cur.knownCards,
      [cardId]: rating >= 2,
    },
    cardRatings: {
      ...cur.cardRatings,
      [cardId]: rating,
    },
    cardSchedule: {
      ...cur.cardSchedule,
      [cardId]: scheduleCard(cur.cardSchedule[cardId], rating, new Date()),
    },
  });
}

export function toggleTrainerTopicRead(topicId: string): void {
  const cur = readTrainerProgress();
  writeTrainerProgress({
    ...cur,
    readTopics: {
      ...cur.readTopics,
      [topicId]: !cur.readTopics[topicId],
    },
  });
}

export function recordTrainerMockResult(
  entry: Omit<TrainerMockHistoryEntry, "id" | "dateIso"> & {
    id?: string;
    dateIso?: string;
  },
): void {
  const cur = readTrainerProgress();
  const fullEntry: TrainerMockHistoryEntry = {
    id: entry.id ?? `${entry.mockId}-${Date.now()}`,
    dateIso: entry.dateIso ?? new Date().toISOString(),
    mockId: entry.mockId,
    mockName: entry.mockName,
    score: entry.score,
    total: entry.total,
  };
  writeTrainerProgress({
    ...cur,
    mockHistory: [...cur.mockHistory, fullEntry].slice(-30),
  });
}

export function resetTrainerProgress(): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(PROGRESS_KEY);
    } catch {
      /* ignore */
    }
  }
  cachedProgressRaw = null;
  cachedProgressSnapshot = DEFAULT_PROGRESS;
  notifyProgress();
}

export function subscribeTrainerProgress(callback: () => void): () => void {
  progressListeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === PROGRESS_KEY) callback();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    progressListeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}
