import { createClient } from "@/lib/supabase/server";
import CramJobsPanel from "@/components/dashboard/CramJobsPanel";
import NewExamForm from "@/components/dashboard/NewExamForm";
import ExamCard from "@/components/dashboard/ExamCard";
import LoosePacksSection from "@/components/dashboard/LoosePacksSection";
import StudentDashboard from "@/components/dashboard/studentProgress/StudentDashboard";
import ProgressEmptyState from "@/components/dashboard/studentProgress/ProgressEmptyState";
import { getStudentProgress } from "@/lib/dashboard/studentProgress";
import { LAYOUT } from "@/lib/layout";
import { PLAN_LABEL, PLAN_LIMITS, effectivePlan } from "@/lib/quota";
import { PrimaryCTALink } from "@/components/ui/PrimaryCTA";
import { dashboardGreeting } from "@/lib/greeting";

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
  const quotaPercent = planLimit > 0 ? Math.min(100, (used / planLimit) * 100) : 0;
  const dueCount = dueRes.count ?? 0;

  if (error) {
    return (
      <main>
        <div className={LAYOUT.pageContainerClass}>
          <p className="text-[15px]" style={{ color: "rgba(255,200,120,0.85)" }}>
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

  return (
    <main>
      <div className={LAYOUT.pageContainerClass}>
        {params.upgraded === "1" && (
          <div
            className="mb-6 rounded-2xl p-4 text-[14px]"
            style={{
              background: "rgba(124,196,160,0.12)",
              border: "1px solid rgba(124,196,160,0.35)",
              color: "#9FD4B8",
            }}
          >
            <span className="font-medium">Zugang freigeschaltet ✓</span>
            <span className="opacity-80"> — du kannst wieder Lernpakete erstellen.</span>
          </div>
        )}

        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p
              className="mb-1 text-[15px] font-medium"
              style={{ color: "var(--color-text)" }}
            >
              {greeting}
            </p>
            <p
              className="mb-2 text-[11px] uppercase tracking-[0.22em]"
              style={{ color: "var(--color-text-faint)" }}
            >
              Deine Klausuren
            </p>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "40px",
                fontWeight: 600,
                letterSpacing: "-1.2px",
                lineHeight: 1.05,
                color: "var(--color-text)",
              }}
            >
              Bibliothek
            </h1>
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

        {/* Slim quota strip — one row: plan · usage · inline mini-bar · CTA.
            Calm single-tone bar; coral only when fully consumed (signal). */}
        <div
          className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-2.5"
          style={{
            background: "#141930",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "14px",
          }}
        >
          <div
            className="flex items-center gap-2 text-[12.5px]"
            style={{ color: "var(--color-text-dim)" }}
          >
            <span style={{ color: "var(--color-text)", fontWeight: 600 }}>
              {planLabel}
            </span>
            <span className="opacity-40">·</span>
            <span className="tabular-nums">
              <span style={{ color: "var(--color-text)", fontWeight: 600 }}>
                {used}
              </span>
              /{planLimit} Pakete
            </span>
            {credits > 0 && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
                style={{
                  color: "var(--color-primary-bright)",
                  background: "rgba(110,128,242,0.12)",
                }}
              >
                +{credits} Extra
              </span>
            )}
          </div>

          {/* Inline mini-bar — fills the middle on desktop, wraps full-width on mobile */}
          <div className="order-last w-full sm:order-none sm:w-auto sm:min-w-[80px] sm:max-w-[240px] sm:flex-1">
            <div
              aria-hidden
              className="h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${quotaPercent}%`,
                  background: quotaReached
                    ? "var(--color-cat-coral)"
                    : "var(--color-primary-bright)",
                }}
              />
            </div>
          </div>

          <div className="ml-auto">
            {quotaReached && credits === 0 ? (
              <PrimaryCTALink
                size="sm"
                href="/dashboard/settings"
                trailingIconName="arrow-right"
              >
                Upgrade
              </PrimaryCTALink>
            ) : (
              plan === "free" && (
                <a
                  href="/dashboard/settings"
                  className="text-[12.5px] font-medium underline-offset-2 hover:underline"
                  style={{ color: "var(--color-primary-bright)" }}
                >
                  Upgrade
                </a>
              )
            )}
          </div>
        </div>

        {progress && <StudentDashboard progress={progress} />}

        <CramJobsPanel />

        {isEmpty ? (
          <ProgressEmptyState />
        ) : (
          <div className="space-y-10">
            <NewExamForm />
            {exams.length > 0 && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
