import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildExamMap, type MapPack, type MapTopic } from "./examMap";
import type { PerTopic } from "./studentProgressShared";

export type ExamMapData = {
  examId: string;
  examTitle: string;
  examDate: string | null;
  topics: MapTopic[];
};

type RawTopic = {
  name?: string;
  concepts?: { importance?: string; relevanceTag?: string }[];
};

const isImportance = (v: unknown): v is "high" | "medium" | "low" =>
  v === "high" || v === "medium" || v === "low";

// RLS-scoped reads for one exam: its packs' topics (json-path select, never the
// heavy pack_data), the latest quiz per_topic per pack, and the exam profile.
export async function getExamMap(
  supabase: SupabaseClient,
  exam: { id: string; title: string; exam_date: string | null },
): Promise<ExamMapData> {
  const { data: packRows } = await supabase
    .from("study_packs")
    .select("id, topics:pack_data->overview->topics")
    .eq("exam_id", exam.id);
  const rows = (packRows ?? []) as { id: string; topics: RawTopic[] | null }[];
  const packIds = rows.map((r) => r.id);

  const [quizRes, examRes] = await Promise.all([
    packIds.length
      ? supabase
          .from("quiz_attempts")
          .select("pack_id, per_topic, created_at")
          .in("pack_id", packIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { pack_id: string; per_topic: PerTopic | null }[] }),
    supabase.from("exams").select("exam_profile").eq("id", exam.id).maybeSingle(),
  ]);

  const perTopicByPack = new Map<string, PerTopic>();
  for (const q of (quizRes.data ?? []) as { pack_id: string; per_topic: PerTopic | null }[]) {
    if (!perTopicByPack.has(q.pack_id)) perTopicByPack.set(q.pack_id, q.per_topic ?? {});
  }

  const packs: MapPack[] = rows.map((r) => ({
    id: r.id,
    topics: (Array.isArray(r.topics) ? r.topics : []).map((t) => ({
      name: t?.name ?? "",
      concepts: (t?.concepts ?? []).flatMap((c) =>
        isImportance(c?.importance)
          ? [{ importance: c.importance, relevanceTag: c.relevanceTag }]
          : [],
      ),
    })),
  }));

  const profile = (examRes.data as { exam_profile?: { topics?: { name?: string; weight?: number }[] } | null } | null)
    ?.exam_profile;
  const profileTopics = Array.isArray(profile?.topics)
    ? profile.topics.flatMap((t) =>
        t?.name && typeof t.weight === "number" ? [{ name: t.name, weight: t.weight }] : [],
      )
    : null;

  return {
    examId: exam.id,
    examTitle: exam.title,
    examDate: exam.exam_date,
    topics: buildExamMap({ packs, perTopicByPack, profileTopics: profileTopics?.length ? profileTopics : null }),
  };
}
