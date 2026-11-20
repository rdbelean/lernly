import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CramJobsPanel from "@/components/dashboard/CramJobsPanel";
import NewExamForm from "@/components/dashboard/NewExamForm";
import ExamCard from "@/components/dashboard/ExamCard";
import LoosePacksSection from "@/components/dashboard/LoosePacksSection";
import StudentDashboard from "@/components/dashboard/studentProgress/StudentDashboard";
import { TrainerView } from "@/components/trainer/TrainerView";
import { SavedTrainerPackSchema, type TrainerBundle } from "@/lib/trainer/types";
import { getStudentProgress } from "@/lib/dashboard/studentProgress";
import { LAYOUT } from "@/lib/layout";
import { CRAM_ENABLED } from "@/lib/features";
import { PLAN_LABEL, PLAN_LIMITS, effectivePlan } from "@/lib/quota";
import { getExamMap } from "@/lib/dashboard/examMap.server";
import { berlinDay } from "@/lib/studyDay";
import { Check } from "lucide-react";

type PackSummary = {
  id: string;
  title: string;
  exam_type: string;
  created_at: string;
  card_count: number;
  exam_id: string | null;
  last_opened_at: string | null;
};

type Exam = {
  id: string;
  title: string;
  exam_date: string | null;
  color: string | null;
  created_at: string;
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

  const [
    packsRes,
    examsRes,
    userRowRes,
    creditsRes,
    dueRes,
    authRes,
    loadedCourseRes,
  ] = await Promise.all([
    supabase.rpc("list_pack_summaries"),
    supabase
      .from("exams")
      .select("id, title, exam_date, color, created_at")
      .order("exam_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("users")
      .select("plan, plan_expires_at, packs_used_this_month, name")
      .single(),
    supabase.rpc("available_pack_credits"),
    // Global "Fällig"-Queue count — cards whose next review is due now. RLS
    // scopes to the current user; head:true makes it a count-only query.
    supabase
      .from("card_reviews")
      .select("*", { count: "exact", head: true })
      .lte("due_at", new Date().toISOString()),
    supabase.auth.getUser(),
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

  const credits = typeof creditsRes.data === "number" ? creditsRes.data : 0;

  const { data: packs, error } = packsRes as {
    data: PackSummary[] | null;
    error: { message: string } | null;
  };
  const exams = (examsRes.data as Exam[] | null) ?? [];
  const profile = userRowRes.data;
  const plan = effectivePlan(
    profile?.plan,
    profile?.plan_expires_at,
    authRes.data.user?.email,
  );
  const used = profile?.packs_used_this_month ?? 0;
  const planLimit = PLAN_LIMITS[plan] ?? 0;
  const planLabel = PLAN_LABEL[plan] ?? plan;
  const quotaReached = used >= planLimit;

  const dueCount = dueRes.count ?? 0;

  if (error) {
    return (
      <main>
        <div className={LAYOUT.pageContainerClass}>
          <p className="text-[15px]" style={{ color: "var(--color-err-ink)" }}>
            Pakete konnten nicht geladen werden: {error.message}
          </p>
        </div>
      </main>
    );
  }

  const allPacks = packs ?? [];
  const packsByExam = new Map<string, PackSummary[]>();
  const loosePacks: PackSummary[] = [];
  for (const p of allPacks) {
    if (p.exam_id) {
      const arr = packsByExam.get(p.exam_id) ?? [];
      arr.push(p);
      packsByExam.set(p.exam_id, arr);
    } else {
      loosePacks.push(p);
    }
  }

  const examMenuOptions = exams.map((e) => ({ id: e.id, title: e.title }));
  const isEmpty = exams.length === 0 && loosePacks.length === 0;

  // Student progress hub data — skip the reads entirely for brand-new users.
  const progress = isEmpty
    ? null
    : await getStudentProgress(supabase, {
        exams,
        packs: allPacks.map((p) => ({
          id: p.id,
          exam_id: p.exam_id,
          card_count: p.card_count,
        })),
        dueCount,
        now: new Date(),
      });

  // Focus exam = soonest upcoming exam that has at least one pack.
  const today = berlinDay(new Date());
  const focusExam = progress?.exams
    .map((pe) => exams.find((e) => e.id === pe.examId))
    .find((e) => e && (packsByExam.get(e.id)?.length ?? 0) > 0);
  const focus = focusExam ? await getExamMap(supabase, focusExam) : null;

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

      {/* Primary view: interactive lernly.kurs/1 trainer + _lernly/ importer */}
      <TrainerView
        key={loadedId ?? "demo"}
        initialBundle={loadedBundle}
        initialCourseId={loadedId}
        focusUpload={params.upload === "1"}
      />

      {/* Legacy packs & exams (shown collapsed below only when existing data is present) */}
      {!isEmpty ? (
        <div className={LAYOUT.pageContainerClass}>
          <details className="rounded-2xl border border-line bg-surface p-5">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-[14px] font-semibold text-text-dim hover:text-text">
              <span>Bisherige KI-Pakete &amp; Bibliothek ({allPacks.length})</span>
              <span className="text-[12px] font-normal">
                {planLabel} · {used}/{planLimit}
                {credits > 0 ? ` + ${credits} Extra` : ""}
                {quotaReached && credits === 0 ? " (Limit erreicht)" : ""}
                {plan === "free" ? (
                  <>
                    {" · "}
                    <Link
                      href="/dashboard/settings"
                      className="font-medium underline"
                      style={{ color: "var(--color-primary)" }}
                    >
                      Einstellungen
                    </Link>
                  </>
                ) : null}
              </span>
            </summary>

            <div className="mt-6 space-y-10 border-t border-line pt-6">
              {progress && <StudentDashboard progress={progress} focus={focus} today={today} />}
              {CRAM_ENABLED && <CramJobsPanel />}
              <NewExamForm />
              {exams.length > 0 && (
                <div className="grid grid-cols-1 gap-5">
                  {exams.map((e) => (
                    <ExamCard
                      key={e.id}
                      exam={e}
                      packs={packsByExam.get(e.id) ?? []}
                    />
                  ))}
                </div>
              )}
              {loosePacks.length > 0 && (
                <LoosePacksSection packs={loosePacks} exams={examMenuOptions} />
              )}
            </div>
          </details>
        </div>
      ) : null}
    </main>
  );
}
