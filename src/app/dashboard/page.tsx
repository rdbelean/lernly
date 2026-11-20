import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TrainerView } from "@/components/trainer/TrainerView";
import { LAYOUT } from "@/lib/layout";
import { SavedTrainerPackSchema, type TrainerBundle } from "@/lib/trainer/types";

type PackSummary = {
  id: string;
  title: string;
  exam_type: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    upgraded?: string;
    cram?: string;
    course?: string;
    upload?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const courseQuery =
    params.course && UUID_RE.test(params.course)
      ? supabase
          .from("study_packs")
          .select("id, pack_data")
          .eq("id", params.course)
          .maybeSingle()
      : Promise.resolve({ data: null });

  const [packsRes, loadedCourseRes] = await Promise.all([
    supabase.rpc("list_pack_summaries"),
    courseQuery,
  ]);

  let loadedId: string | null = null;
  let loadedBundle: TrainerBundle | undefined;
  if (loadedCourseRes.data) {
    const parsedCourse = SavedTrainerPackSchema.safeParse(
      loadedCourseRes.data.pack_data,
    );
    if (parsedCourse.success) {
      loadedId = loadedCourseRes.data.id as string;
      loadedBundle = parsedCourse.data.bundle;
      void supabase
        .from("study_packs")
        .update({ last_opened_at: new Date().toISOString() })
        .eq("id", loadedId)
        .then(() => {});
    }
  }

  const { data: packs, error } = packsRes as {
    data: PackSummary[] | null;
    error: { message: string } | null;
  };

  if (error) {
    return (
      <main>
        <div className={LAYOUT.pageContainerClass}>
          <p className="text-[15px]" style={{ color: "var(--color-err-ink)" }}>
            Kurse konnten nicht geladen werden: {error.message}
          </p>
        </div>
      </main>
    );
  }

  const hasSavedCourses = (packs ?? []).length > 0;

  return (
    <main>
      {params.upgraded === "1" && (
        <div className={LAYOUT.pageContainerClass}>
          <div
            className="mb-4 flex items-center gap-2 rounded-[14px] p-4 text-[14px]"
            style={{ background: "var(--color-ok-bg)", color: "var(--color-ok-ink)" }}
          >
            <Check size={16} strokeWidth={2.2} aria-hidden />
            <span>Zugang freigeschaltet.</span>
          </div>
        </div>
      )}

      <TrainerView
        key={loadedId ?? (params.upload === "1" ? "upload" : "demo")}
        initialBundle={loadedBundle}
        initialCourseId={loadedId}
        focusUpload={params.upload === "1"}
        hasSavedCourses={hasSavedCourses}
      />
    </main>
  );
}
