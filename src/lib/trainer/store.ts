import { DEMO_TRAINER_BUNDLE } from "./demoCourse";
import type { TrainerBundle, TrainerProgressState } from "./types";

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
  if (cur.solvedDrills[taskId]) return;
  writeTrainerProgress({
    ...cur,
    solvedDrills: { ...cur.solvedDrills, [taskId]: true },
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
  writeTrainerProgress({
    ...cur,
    knownCards: { ...cur.knownCards, [cardId]: !cur.knownCards[cardId] },
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
