import { notFound } from "next/navigation";
import PackView from "@/components/pack/PackView";
import { createClient } from "@/lib/supabase/server";
import { StudyPackSchema } from "@/lib/schema";
import DeletePackButton from "./delete-button";

export default async function PackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_packs")
    .select("id, title, exam_type, pack_data, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const parsed = StudyPackSchema.safeParse(data.pack_data);
  if (!parsed.success) {
    return (
      <main className="px-6 py-16">
        <div className="mx-auto max-w-[920px] text-white">
          <a
            href="/dashboard"
            className="text-[13px]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            ← Dashboard
          </a>
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

  return (
    <main className="px-6 py-12">
      <div className="mx-auto max-w-[920px]">
        <a
          href="/dashboard"
          className="text-[13px] transition hover:text-white"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          ← Dashboard
        </a>

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
              <span className="ln-mono-tag">
                {pack.simulator.questions.length} Quiz
              </span>
              <span className="ln-mono-tag">
                {pack.essayBlueprint.parts.length}-teiliger Blueprint
              </span>
            </div>
          </div>
          <DeletePackButton id={data.id} />
        </div>

        <div className="mt-10">
          <PackView pack={pack} />
        </div>
      </div>
    </main>
  );
}
