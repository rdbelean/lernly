import { CORPORATE_FINANCE_SEED } from "./seed";
import { resetStudyProgress } from "./storage";
import type { StudyCourseSeed } from "./types";

const COURSE_STORAGE_KEY = "lernly.study.course.v1";

type ActiveCourseSnapshot = {
  course: StudyCourseSeed;
  isCustom: boolean;
};

const DEFAULT_SNAPSHOT: ActiveCourseSnapshot = {
  course: CORPORATE_FINANCE_SEED,
  isCustom: false,
};

let cachedRaw: string | null = null;
let cachedSnapshot: ActiveCourseSnapshot = DEFAULT_SNAPSHOT;
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

export function getServerActiveCourseSnapshot(): ActiveCourseSnapshot {
  return DEFAULT_SNAPSHOT;
}

export function readActiveCourseSnapshot(): ActiveCourseSnapshot {
  if (typeof window === "undefined") {
    return DEFAULT_SNAPSHOT;
  }
  try {
    const raw = window.localStorage.getItem(COURSE_STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedSnapshot;
    }
    cachedRaw = raw;
    if (!raw) {
      cachedSnapshot = DEFAULT_SNAPSHOT;
      return cachedSnapshot;
    }
    const parsed = JSON.parse(raw) as Partial<StudyCourseSeed>;
    if (
      !parsed ||
      typeof parsed.courseName !== "string" ||
      !Array.isArray(parsed.topics) ||
      parsed.topics.length === 0
    ) {
      cachedSnapshot = DEFAULT_SNAPSHOT;
      return cachedSnapshot;
    }
    cachedSnapshot = {
      course: parsed as StudyCourseSeed,
      isCustom: true,
    };
    return cachedSnapshot;
  } catch {
    return DEFAULT_SNAPSHOT;
  }
}

export function saveActiveCourse(course: StudyCourseSeed): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(course);
    window.localStorage.setItem(COURSE_STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedSnapshot = { course, isCustom: true };
  } catch {
    cachedSnapshot = { course, isCustom: true };
  }
  resetStudyProgress();
  notifyListeners();
}

export function clearCustomCourse(): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(COURSE_STORAGE_KEY);
    } catch {
      // Ignore storage access errors in restricted WebViews.
    }
  }
  cachedRaw = null;
  cachedSnapshot = DEFAULT_SNAPSHOT;
  resetStudyProgress();
  notifyListeners();
}

export function subscribeActiveCourse(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === COURSE_STORAGE_KEY) {
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
