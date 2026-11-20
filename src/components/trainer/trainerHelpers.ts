import type {
  McpCard,
  McpCourseTopic,
  McpMockExam,
  McpMockExamItem,
  McpMockExamPart,
  McpTask,
  McpTopicContent,
  TrainerBundle,
  TrainerProgressState,
  TrainerRating,
} from "@/lib/trainer/types";

export type TopicStatusKey = "ok" | "learn" | "red" | "new";

export type TopicBreakdown = {
  ok: number;
  learn: number;
  red: number;
  new: number;
  total: number;
  unit: "P" | "Aufgaben";
  okTasks: number;
  openTasks: number;
  totalTasks: number;
};

export type CourseTaskEntry = {
  topicId: string;
  topicTitle: string;
  topicCaseTitle?: string;
  topicCaseHtml?: string;
  task: McpTask;
};

export type CourseCardEntry = {
  topicId: string;
  topicTitle: string;
  card: McpCard;
};

export function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

export function formatPtsDe(val: number): string {
  return String(round1(val)).replace(".", ",");
}

export function getTaskRating(
  progress: TrainerProgressState,
  taskId: string,
): TrainerRating | null {
  const explicit = progress.taskRatings[taskId];
  if (explicit === 0 || explicit === 1 || explicit === 2 || explicit === 3) {
    return explicit;
  }
  if (progress.solvedDrills[taskId]) return 2;
  return null;
}

export function getCardRating(
  progress: TrainerProgressState,
  cardId: string,
): TrainerRating | null {
  const explicit = progress.cardRatings[cardId];
  if (explicit === 0 || explicit === 1 || explicit === 2 || explicit === 3) {
    return explicit;
  }
  if (progress.knownCards[cardId]) return 2;
  return null;
}

export function ratingToStatus(rating: TrainerRating | null): TopicStatusKey {
  if (rating === null) return "new";
  if (rating === 0) return "red";
  if (rating === 1) return "learn";
  return "ok";
}

export function getTaskStatus(
  progress: TrainerProgressState,
  taskId: string,
): TopicStatusKey {
  return ratingToStatus(getTaskRating(progress, taskId));
}

export function getCardStatus(
  progress: TrainerProgressState,
  cardId: string,
): TopicStatusKey {
  return ratingToStatus(getCardRating(progress, cardId));
}

export function getTaskPoints(task: McpTask): number {
  if (task.kind === "essay") return task.points;
  return 2;
}

export function computeTopicBreakdown(
  topicMeta: McpCourseTopic,
  topicContent: McpTopicContent | undefined,
  progress: TrainerProgressState,
): TopicBreakdown {
  const tasks = topicContent?.tasks ?? [];
  const totalTasks = tasks.length;
  const targetPts = topicMeta.expectedPoints ?? topicMeta.points ?? 0;

  if (totalTasks === 0) {
    return {
      ok: 0,
      learn: 0,
      red: 0,
      new: targetPts,
      total: targetPts,
      unit: targetPts > 0 ? "P" : "Aufgaben",
      okTasks: 0,
      openTasks: 0,
      totalTasks: 0,
    };
  }

  let okTasks = 0;
  let openTasks = 0;
  const rawPts: Record<TopicStatusKey, number> = {
    ok: 0,
    learn: 0,
    red: 0,
    new: 0,
  };

  for (const task of tasks) {
    const status = getTaskStatus(progress, task.id);
    if (status === "ok") okTasks++;
    else openTasks++;
    rawPts[status] += getTaskPoints(task);
  }

  const rawTotal = rawPts.ok + rawPts.learn + rawPts.red + rawPts.new;

  if (targetPts > 0 && rawTotal > 0) {
    const scale = targetPts / rawTotal;
    return {
      ok: round1(rawPts.ok * scale),
      learn: round1(rawPts.learn * scale),
      red: round1(rawPts.red * scale),
      new: round1(rawPts.new * scale),
      total: targetPts,
      unit: "P",
      okTasks,
      openTasks,
      totalTasks,
    };
  }

  let okCount = 0;
  let learnCount = 0;
  let redCount = 0;
  let newCount = 0;
  for (const task of tasks) {
    const s = getTaskStatus(progress, task.id);
    if (s === "ok") okCount++;
    else if (s === "learn") learnCount++;
    else if (s === "red") redCount++;
    else newCount++;
  }

  return {
    ok: okCount,
    learn: learnCount,
    red: redCount,
    new: newCount,
    total: totalTasks,
    unit: "Aufgaben",
    okTasks,
    openTasks,
    totalTasks,
  };
}

export function getSortedCourseTopics(bundle: TrainerBundle): McpCourseTopic[] {
  // Tax Mock Trainer defines an explicit calculation-first recommended order (tier 1 -> 2 -> 3).
  if (bundle.course.id === "german-tax") {
    return [...bundle.course.topics];
  }
  return [...bundle.course.topics].sort((a, b) => {
    const tierDiff = (a.tier ?? 2) - (b.tier ?? 2);
    if (tierDiff !== 0) return tierDiff;
    return (
      (b.expectedPoints ?? b.points ?? 0) - (a.expectedPoints ?? a.points ?? 0)
    );
  });
}

export function collectCourseTasks(
  bundle: TrainerBundle,
  sortedTopics: readonly McpCourseTopic[],
): CourseTaskEntry[] {
  const out: CourseTaskEntry[] = [];
  for (const topicMeta of sortedTopics) {
    const content = bundle.topics[topicMeta.id];
    if (!content) continue;
    for (const task of content.tasks) {
      out.push({
        topicId: topicMeta.id,
        topicTitle: topicMeta.title,
        topicCaseTitle: content.caseTitle,
        topicCaseHtml: content.caseHtml,
        task,
      });
    }
  }
  return out;
}

export function collectCourseCards(
  bundle: TrainerBundle,
  sortedTopics: readonly McpCourseTopic[],
): CourseCardEntry[] {
  const out: CourseCardEntry[] = [];
  for (const topicMeta of sortedTopics) {
    const content = bundle.topics[topicMeta.id];
    if (!content) continue;
    for (const card of content.cards) {
      out.push({
        topicId: topicMeta.id,
        topicTitle: topicMeta.title,
        card,
      });
    }
  }
  return out;
}

export function resolveMockExams(bundle: TrainerBundle): McpMockExam[] {
  if (bundle.mocks && bundle.mocks.length > 0) {
    return bundle.mocks;
  }

  const sortedTopics = getSortedCourseTopics(bundle);
  const parts: McpMockExamPart[] = [];
  const items: McpMockExamItem[] = [];

  for (const topicMeta of sortedTopics) {
    const content = bundle.topics[topicMeta.id];
    if (!content || content.tasks.length === 0) continue;

    const partItems: McpMockExamItem[] = [];
    for (const task of content.tasks) {
      if (task.kind === "essay") {
        const item: McpMockExamItem = {
          id: `sim-${task.id}`,
          no: task.originLabel ?? task.name,
          partId: topicMeta.id,
          topicId: topicMeta.id,
          taskId: task.id,
          points: task.points,
          type: "open",
          question: task.question,
          checklist: task.checklist,
          solution: task.modelAnswer,
          whyHtml: task.whyHtml,
        };
        partItems.push(item);
        items.push(item);
      } else if (task.kind === "drill") {
        const variant = task.variants[0];
        if (!variant) continue;
        const item: McpMockExamItem = {
          id: `sim-${task.id}`,
          no: task.originLabel ?? task.name,
          partId: topicMeta.id,
          topicId: topicMeta.id,
          taskId: task.id,
          points: topicMeta.expectedPoints ?? topicMeta.points ?? 5,
          type: "open",
          question: variant.text,
          solution: variant.solution,
          whyHtml: task.whyHtml,
        };
        partItems.push(item);
        items.push(item);
      } else if (task.kind === "mc") {
        const item: McpMockExamItem = {
          id: `sim-${task.id}`,
          no: task.name,
          partId: topicMeta.id,
          topicId: topicMeta.id,
          taskId: task.id,
          points: task.questions.length,
          type: "mc",
          question: task.name,
          questions: task.questions,
        };
        partItems.push(item);
        items.push(item);
      }
    }

    if (partItems.length > 0) {
      parts.push({
        id: `part-${topicMeta.id}`,
        title: topicMeta.title,
        topicId: topicMeta.id,
        caseHtml: content.caseHtml,
        items: partItems,
      });
    }
  }

  if (items.length === 0) return [];

  const totalPoints = items.reduce((s, it) => s + it.points, 0);
  return [
    {
      schema: "lernly.probeklausur/1",
      id: "auto-mock-1",
      name: "Gesamt-Probeklausur",
      subtitle: `${items.length} Aufgaben aus ${parts.length} Klausurthemen`,
      durationMin: bundle.course.exam?.durationMin ?? 60,
      totalPoints,
      items,
      parts,
    },
  ];
}
