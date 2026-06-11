import { notFound } from "next/navigation";
import PackView from "@/components/pack/PackView";
import PackHeader, {
  type PackExamSummary,
  type PackMeta,
} from "@/components/pack/PackHeader";
import type { LatestAttempt } from "@/components/pack/PackHub";
import { createClient } from "@/lib/supabase/server";
import { StudyPackSchema } from "@/lib/schema";
import { MASTERY_INTERVAL_DAYS } from "@/lib/srs";
import { LAYOUT } from "@/lib/layout";
import { DEMO_VISUAL_MAP_V2 } from "@/lib/fixtures/visualMapDemo";

export default async function PackDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const { id } = await params;
  const { demo } = await searchParams;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_packs")
    .select("id, title, exam_type, pack_data, created_at, exam_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  // Stamp last_opened_at so the dashboard's "Weiterlernen" CTA can pick up
  // the most recently studied pack. Fire-and-forget — don't await; a failure
  // here must not break the pack view. RLS scopes this to the user's own pack.
  void supabase
    .from("study_packs")
    .update({ last_opened_at: new Date().toISOString() })
    .eq("id", id)
    .then(() => {});

  // Load the exam (if assigned) so PackHeader can show the exam pill +
  // countdown. RLS-scoped, second query so a missing/deleted exam row
  // (FK is ON DELETE SET NULL) degrades silently to "no exam pill".
  let exam: PackExamSummary | null = null;
  if (data.exam_id) {
    const { data: examRow } = await supabase
      .from("exams")
      .select("title, exam_date, color")
      .eq("id", data.exam_id)
      .maybeSingle();
    if (examRow) {
      exam = {
        title: examRow.title as string,
        exam_date: (examRow.exam_date as string | null) ?? null,
        color: (examRow.color as string | null) ?? null,
      };
    }
  }

  // Latest quiz attempt feeds the Hub's "Situation" panel + the smart
  // Weiterlernen CTA (weak topics → "Schwächen üben"). RLS-scoped. null
  // when no attempts yet — hub gracefully degrades.
  let latestAttempt: LatestAttempt | null = null;
  const { data: attemptRow } = await supabase
    .from("quiz_attempts")
    .select(
      "total_questions, correct_count, wrong_count, per_topic, created_at",
    )
    .eq("pack_id", data.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (attemptRow) {
    latestAttempt = {
      total_questions: attemptRow.total_questions as number,
      correct_count: attemptRow.correct_count as number,
      wrong_count: attemptRow.wrong_count as number,
      per_topic:
        (attemptRow.per_topic as LatestAttempt["per_topic"]) ?? {},
      created_at: attemptRow.created_at as string,
    };
  }

  const parsed = StudyPackSchema.safeParse(data.pack_data);
  if (!parsed.success) {
    return (
      <main>
        <div className={LAYOUT.pageContainerClass}>
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-[12px]"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            <a href="/dashboard" className="transition hover:text-white">
              Bibliothek
            </a>
            <span aria-hidden>›</span>
            <span style={{ color: "rgba(255,255,255,0.7)" }}>{data.title}</span>
          </nav>
          <h1 className="mt-4 text-[28px] font-bold text-white">{data.title}</h1>
          <p
            className="mt-3 text-[14px]"
            style={{ color: "rgba(255,200,120,0.85)" }}
          >
            Dieses Paket konnte nicht geöffnet werden — das gespeicherte Format
            ist veraltet oder defekt.
          </p>
        </div>
      </main>
    );
  }

  const pack = parsed.data;

  // Mastery — how many of this pack's cards have crossed the spacing threshold
  // (interval_days >= MASTERY_INTERVAL_DAYS). RLS scopes the count to the owner;
  // count-only (head:true) keeps it cheap. total comes from the pack itself.
  const { count: masteredCount } = await supabase
    .from("card_reviews")
    .select("*", { count: "exact", head: true })
    .eq("pack_id", data.id)
    .gte("interval_days", MASTERY_INTERVAL_DAYS);
  const mastery = {
    mastered: masteredCount ?? 0,
    total: pack.flashcards.length,
  };

  const isDemo = demo === "visualmap-v2";
  if (isDemo) {
    pack.visualMap = DEMO_VISUAL_MAP_V2;
  }

  // Compose the meta-chip row from whatever the pack carries.
  const meta: PackMeta[] = [
    { label: `${pack.flashcards.length} Karten` },
    {
      label: `${pack.overview.topics.reduce(
        (n, t) => n + t.concepts.length,
        0,
      )} Konzepte`,
    },
  ];
  if (pack.simulator) {
    meta.push({ label: `${pack.simulator.questions.length} Quiz` });
  }
  if (pack.essayBlueprint) {
    meta.push({
      label: `${pack.essayBlueprint.parts.length}-teiliger Blueprint`,
    });
  }
  if (pack.quiz && pack.quiz.questions.length > 0) {
    meta.push({ label: `${pack.quiz.questions.length} MC-Fragen` });
  } else if (pack.openQuestions) {
    meta.push({
      label: `${pack.openQuestions.questions.length} offene Fragen`,
    });
  }

  return (
    <main>
      <div className={LAYOUT.pageContainerClass}>
        {isDemo && (
          <div
            className="mb-6 rounded-xl border px-4 py-3 text-[12.5px]"
            style={{
              background: "rgba(251,191,36,0.08)",
              borderColor: "rgba(251,191,36,0.3)",
              color: "rgba(255,224,160,0.95)",
            }}
          >
            <strong>Demo-Modus aktiv:</strong> Visual Map wird aus einem
            Fixture-Datensatz gerendert (visualmap-v2 Vorschau). Andere Tabs
            zeigen weiterhin die echten Pack-Daten.
          </div>
        )}

        <PackHeader
          courseTitle={data.title}
          packId={data.id}
          meta={meta}
          exam={exam}
        />

        <div className="mt-8 sm:mt-10">
          <PackView
            pack={pack}
            packId={data.id}
            exam={exam}
            latestAttempt={latestAttempt}
            mastery={mastery}
          />
        </div>
      </div>
    </main>
  );
}
