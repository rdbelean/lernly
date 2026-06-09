import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MASTERY_INTERVAL_DAYS } from "@/lib/srs";
import { berlinDay } from "@/lib/studyDay";
import {
  buildHeatmapGrid,
  computeStreaks,
  masteryPct,
  topicsDone,
  type ExamProgress,
  type HeatmapDay,
  type PerTopic,
  type StudentProgress,
} from "./studentProgressShared";

const HEATMAP_WEEKS = 17; // ~4 months, Anki-style (horizontally scrollable on mobile)

type ExamLite = {
  id: string;
  title: string;
  exam_date: string | null;
  color: string | null;
};
type PackLite = { id: string; exam_id: string | null; card_count: number };

// All student progress for the dashboard. Reuses the page's already-fetched
// exams/packs/dueCount; adds 4 parallel RLS-scoped reads tallied in JS (the
// admin-metrics pattern). Never refetches what the page already has.
export async function getStudentProgress(
  supabase: SupabaseClient,
  args: { exams: ExamLite[]; packs: PackLite[]; dueCount: number; now: Date },
): Promise<StudentProgress> {
  const { exams, packs, dueCount, now } = args;
  const today = berlinDay(now);

  const [masteredRes, quizRes, daysRes, topicsRes] = await Promise.all([
    supabase
      .from("card_reviews")
      .select("pack_id")
      .gte("interval_days", MASTERY_INTERVAL_DAYS),
    supabase
      .from("quiz_attempts")
      .select("pack_id, total_questions, per_topic, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("study_days")
      .select("day, count")
      .order("day", { ascending: true }),
    // json-path select ships only the topics sub-tree, not the heavy pack_data.
    supabase.from("study_packs").select("id, topics:pack_data->overview->topics"),
  ]);

  // Mastered cards per pack (one row per mastered card).
  const masteredByPack = new Map<string, number>();
  let totalMastered = 0;
  for (const r of (masteredRes.data ?? []) as { pack_id: string }[]) {
    masteredByPack.set(r.pack_id, (masteredByPack.get(r.pack_id) ?? 0) + 1);
    totalMastered++;
  }

  // Quiz: latest per_topic per pack (rows desc by created_at → first seen wins);
  // lifetime questions answered (Σ total_questions) + per-pack answered.
  const latestPerTopic = new Map<string, PerTopic>();
  const answeredByPack = new Map<string, number>();
  let totalQuestions = 0;
  for (const r of (quizRes.data ?? []) as {
    pack_id: string;
    total_questions: number | null;
    per_topic: PerTopic | null;
  }[]) {
    const q = r.total_questions ?? 0;
    totalQuestions += q;
    answeredByPack.set(r.pack_id, (answeredByPack.get(r.pack_id) ?? 0) + q);
    if (!latestPerTopic.has(r.pack_id)) latestPerTopic.set(r.pack_id, r.per_topic ?? {});
  }

  // Topic names per pack (defensive — overview/topics may be null/malformed).
  const topicsByPack = new Map<string, string[]>();
  for (const r of (topicsRes.data ?? []) as {
    id: string;
    topics: Array<{ name?: string }> | null;
  }[]) {
    const names = Array.isArray(r.topics)
      ? r.topics.map((t) => (t?.name ?? "").trim()).filter(Boolean)
      : [];
    topicsByPack.set(r.id, names);
  }

  // Study days → heatmap + current/longest streak.
  const studied: HeatmapDay[] = (
    (daysRes.data ?? []) as { day: string; count: number | null }[]
  ).map((d) => ({ day: d.day, count: d.count ?? 0 }));
  const streak = computeStreaks(
    studied.map((d) => d.day),
    today,
  );
  const heatmap = buildHeatmapGrid(studied, today, HEATMAP_WEEKS);

  // Per-exam progress — skip past exams (still shown in the library cards below).
  const examProgress: ExamProgress[] = [];
  for (const e of exams) {
    if (e.exam_date && e.exam_date < today) continue;
    const examPacks = packs.filter((p) => p.exam_id === e.id);
    let totalCards = 0;
    let mastered = 0;
    let answered = 0;
    let tDone = 0;
    let tTotal = 0;
    for (const p of examPacks) {
      totalCards += p.card_count;
      mastered += masteredByPack.get(p.id) ?? 0;
      answered += answeredByPack.get(p.id) ?? 0;
      const r = topicsDone(topicsByPack.get(p.id) ?? [], latestPerTopic.get(p.id) ?? {});
      tDone += r.done;
      tTotal += r.total;
    }
    examProgress.push({
      examId: e.id,
      title: e.title,
      color: e.color,
      examDate: e.exam_date,
      masteredCards: mastered,
      totalCards,
      masteryPct: masteryPct(mastered, totalCards),
      questionsAnswered: answered,
      topicsDone: tDone,
      topicsTotal: tTotal,
      hasTopicData: tTotal > 0,
    });
  }

  const totals = {
    masteredCards: totalMastered,
    questionsAnswered: totalQuestions,
    studyDays: studied.length,
    packs: packs.length,
  };
  const hasAnyData =
    totals.studyDays > 0 ||
    totals.questionsAnswered > 0 ||
    totals.masteredCards > 0 ||
    dueCount > 0;

  return { hasAnyData, streak, heatmap, totals, exams: examProgress, due: { count: dueCount } };
}
