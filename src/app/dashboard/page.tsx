import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CramJobsPanel from "@/components/dashboard/CramJobsPanel";
import NewExamForm from "@/components/dashboard/NewExamForm";
import ExamCard from "@/components/dashboard/ExamCard";
import LoosePacksSection from "@/components/dashboard/LoosePacksSection";
import StudentDashboard from "@/components/dashboard/studentProgress/StudentDashboard";
import ProgressEmptyState from "@/components/dashboard/studentProgress/ProgressEmptyState";
import { getStudentProgress } from "@/lib/dashboard/studentProgress";
import { LAYOUT } from "@/lib/layout";
import { CRAM_ENABLED } from "@/lib/features";
import { PLAN_LABEL, PLAN_LIMITS, effectivePlan } from "@/lib/quota";
import { PrimaryCTALink } from "@/components/ui/PrimaryCTA";
import { dashboardGreeting } from "@/lib/greeting";
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; cram?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [packsRes, examsRes, userRowRes, creditsRes, dueRes] =
    await Promise.all([
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
    ]);

  const credits = typeof creditsRes.data === "number" ? creditsRes.data : 0;

  const { data: packs, error } = packsRes as {
    data: PackSummary[] | null;
    error: { message: string } | null;
  };
  const exams = (examsRes.data as Exam[] | null) ?? [];
  const profile = userRowRes.data;
  const plan = effectivePlan(profile?.plan, profile?.plan_expires_at);
  const used = profile?.packs_used_this_month ?? 0;
  const planLimit = PLAN_LIMITS[plan] ?? 0;
  const planLabel = PLAN_LABEL[plan] ?? plan;
  const greeting = dashboardGreeting(profile?.name as string | null | undefined);
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
      <div className={LAYOUT.pageContainerClass}>
        {params.upgraded === "1" && (
          <div
            className="mb-6 flex items-center gap-2 rounded-[14px] p-4 text-[14px]"
            style={{ background: "var(--color-ok-bg)", color: "var(--color-ok-ink)" }}
          >
            <Check size={16} strokeWidth={2.2} aria-hidden />
            <span>Zugang freigeschaltet. Du kannst wieder Lernpakete erstellen.</span>
          </div>
        )}

        <div className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]"
            style={{ color: "var(--color-text-dim)" }}
          >
            <span>{greeting}</span>
            <span aria-hidden>·</span>
            <span>
              {planLabel}, <span className="tabular-nums">{used}/{planLimit}</span> Pakete
              {credits > 0 && ` + ${credits} Extra`}
              {quotaReached && credits === 0 && (
                <span style={{ color: "var(--color-err-ink)" }}> (Limit erreicht)</span>
              )}
            </span>
            {plan === "free" && (
              <Link
                href="/dashboard/settings"
                className="font-medium underline underline-offset-2"
                style={{ color: "var(--color-primary)" }}
              >
                Upgrade
              </Link>
            )}
          </div>
          <PrimaryCTALink
            size="sm"
            href="/dashboard/new"
            leadingIconName="plus"
            className="hidden sm:inline-flex"
          >
            Neues Paket
          </PrimaryCTALink>
        </div>

        {progress && <StudentDashboard progress={progress} focus={focus} today={today} />}

        {CRAM_ENABLED && <CramJobsPanel />}

        {isEmpty ? (
          <ProgressEmptyState />
        ) : (
          <div className="space-y-10">
            <h2
              className="m-0 text-[22px] font-medium"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}
            >
              Bibliothek
            </h2>
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
        )}
      </div>
    </main>
  );
}
