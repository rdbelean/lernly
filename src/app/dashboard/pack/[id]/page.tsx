import { notFound } from "next/navigation";
import PackView from "@/components/pack/PackView";
import { createClient } from "@/lib/supabase/server";
import { StudyPackSchema } from "@/lib/schema";
import { DEMO_VISUAL_MAP_V2 } from "@/lib/fixtures/visualMapDemo";
import DeletePackButton from "./delete-button";

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
    .select("id, title, exam_type, pack_data, created_at")
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

  const parsed = StudyPackSchema.safeParse(data.pack_data);
  if (!parsed.success) {
    return (
      <main className="px-6 py-16">
        <div className="mx-auto max-w-[920px] text-white">
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

  const isDemo = demo === "visualmap-v2";
  if (isDemo) {
    pack.visualMap = DEMO_VISUAL_MAP_V2;
  }

  return (
    <main className="px-4 py-10 sm:px-6 sm:py-12 lg:px-10">
      <div className="mx-auto max-w-[1200px]">
        {isDemo && (
          <div
            className="mx-auto mb-6 max-w-[920px] rounded-xl border px-4 py-3 text-[12.5px]"
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
        <div className="mx-auto max-w-[920px]">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-[12px]"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          <a
            href="/dashboard"
            className="transition hover:text-white"
          >
            Bibliothek
          </a>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="truncate" style={{ color: "rgba(255,255,255,0.75)" }}>
            {pack.courseTitle}
          </span>
        </nav>

        <div className="mt-6 flex items-start justify-between gap-4">
          <div>
            <span
              className="ln-section-label"
              style={{ color: "var(--color-ln-sage)" }}
            >
              ✓ Dein Lernpaket
            </span>
            <h1
              className="mt-3 font-bold leading-[1.05] tracking-[-1.5px] text-white"
              style={{ fontSize: "clamp(28px, 4.5vw, 44px)" }}
            >
              {pack.courseTitle}
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="ln-mono-tag">{pack.flashcards.length} Karten</span>
              <span className="ln-mono-tag">
                {pack.overview.topics.reduce(
                  (n, t) => n + t.concepts.length,
                  0,
                )}{" "}
                Konzepte
              </span>
              {pack.simulator && (
                <span className="ln-mono-tag">
                  {pack.simulator.questions.length} Quiz
                </span>
              )}
              {pack.essayBlueprint && (
                <span className="ln-mono-tag">
                  {pack.essayBlueprint.parts.length}-teiliger Blueprint
                </span>
              )}
              {pack.quiz && pack.quiz.questions.length > 0 ? (
                <span className="ln-mono-tag">
                  {pack.quiz.questions.length} MC-Fragen
                </span>
              ) : (
                pack.openQuestions && (
                  <span className="ln-mono-tag">
                    {pack.openQuestions.questions.length} offene Fragen
                  </span>
                )
              )}
            </div>
          </div>
          <DeletePackButton id={data.id} />
        </div>
        </div>

        <div className="mt-10">
          <PackView pack={pack} packId={data.id} />
        </div>
      </div>
    </main>
  );
}
