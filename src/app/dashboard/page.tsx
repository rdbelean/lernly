import { createClient } from "@/lib/supabase/server";
import CramJobsPanel from "@/components/dashboard/CramJobsPanel";
import NewExamForm from "@/components/dashboard/NewExamForm";
import ExamCard from "@/components/dashboard/ExamCard";
import LoosePacksSection from "@/components/dashboard/LoosePacksSection";
import { LAYOUT } from "@/lib/layout";
import { PLAN_LABEL, PLAN_LIMITS, effectivePlan } from "@/lib/quota";
import { PrimaryCTALink } from "@/components/ui/PrimaryCTA";
import { dashboardGreeting } from "@/lib/greeting";
import { Layers, Flame } from "lucide-react";

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


function EmptyState() {
  return (
    <div
      className="relative overflow-hidden px-6 py-12 text-center sm:px-8 sm:py-14"
      style={{
        background: "#141930",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "16px",
      }}
    >
      <div
        aria-hidden
        className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto flex max-w-[480px] flex-col items-center gap-5">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-[28px]"
          style={{
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.2))",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          🎯
        </div>
        <div>
          <h2
            className="text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "26px",
              fontWeight: 700,
              letterSpacing: "-0.4px",
            }}
          >
            Bereit für die nächste Klausur?
          </h2>
          <p
            className="mt-2 text-[14px]"
            style={{ color: "rgba(255,255,255,0.62)" }}
          >
            Leg deine Klausur an und lad rein, was du können musst. Jedes Paket
            landet unter der Klausur — du verlierst nichts mehr.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <NewExamForm />
          <a
            href="/dashboard/new"
            className="rounded-full border border-white/15 px-5 py-2.5 text-[14px] font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
          >
            ✦ Paket erstellen
          </a>
        </div>
      </div>
    </div>
  );
}

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
        .select(
          "plan, plan_expires_at, packs_used_this_month, name, srs_streak, srs_last_review_date",
        )
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
  // Streak is "alive" only when the last rating was today or yesterday (Berlin);
  // otherwise it's effectively broken and shows as nothing.
  const nowMs = new Date().getTime();
  const berlinDay = (ms: number) =>
    new Date(ms).toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
  const lastReview = profile?.srs_last_review_date as string | null | undefined;
  const streakAlive =
    lastReview === berlinDay(nowMs) ||
    lastReview === berlinDay(nowMs - 86_400_000);
  const streak = streakAlive
    ? ((profile?.srs_streak as number | null) ?? 0)
    : 0;

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
            <div className="mb-1 flex flex-wrap items-center gap-2.5">
              <p
                className="text-[15px] font-medium"
                style={{ color: "var(--color-text)" }}
              >
                {greeting}
              </p>
              {streak >= 2 && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold"
                  style={{
                    background: "rgba(242, 163, 60, 0.14)",
                    color: "var(--color-amber)",
                  }}
                >
                  <Flame size={12} strokeWidth={2.2} aria-hidden />
                  {streak} Tage Streak
                </span>
              )}
            </div>
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

        <div
          className="mb-10 overflow-hidden"
          style={{
            background: "#141930",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "16px",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div
              className="text-[13px]"
              style={{ color: "var(--color-text-dim)" }}
            >
              <span style={{ color: "var(--color-text)", fontWeight: 500 }}>
                {planLabel}-Plan
              </span>
              <span className="mx-2 opacity-50">·</span>
              <span>
                {used} / {planLimit} Pakete diesen Monat
              </span>
              {credits > 0 && (
                <span
                  className="ml-2"
                  style={{ color: "var(--color-primary-bright)" }}
                >
                  · +{credits} Extra-Paket{credits === 1 ? "" : "e"} verfügbar
                </span>
              )}
            </div>
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
                  className="text-[13px] underline-offset-2 hover:underline"
                  style={{ color: "var(--color-text-dim)" }}
                >
                  Upgrade auf Pro
                </a>
              )
            )}
          </div>
          {/* Calm single-tone progress bar — no rainbow gradient. Red only
              when quota is fully consumed (signal, not decoration). */}
          <div
            aria-hidden
            className="h-[3px] w-full"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${quotaPercent}%`,
                background: quotaReached
                  ? "var(--color-cat-coral)"
                  : "var(--color-primary-bright)",
              }}
            />
          </div>
        </div>

        {dueCount > 0 && (
          <div
            className="mb-10 flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            style={{
              background: "#141930",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "16px",
            }}
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "rgba(79, 209, 165, 0.14)" }}
              >
                <Layers
                  size={16}
                  strokeWidth={1.9}
                  color="var(--color-cat-teal)"
                />
              </span>
              <div>
                <div
                  className="text-[10.5px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  Wiederholung
                </div>
                <div
                  className="mt-0.5 text-[17px] font-semibold leading-tight sm:text-[19px]"
                  style={{
                    color: "var(--color-text)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {dueCount} {dueCount === 1 ? "Karte" : "Karten"} fällig
                </div>
              </div>
            </div>
            <PrimaryCTALink
              size="sm"
              href="/dashboard/review"
              trailingIconName="arrow-right"
            >
              Jetzt wiederholen
            </PrimaryCTALink>
          </div>
        )}

        <CramJobsPanel />

        {isEmpty ? (
          <EmptyState />
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
              <LoosePacksSection
                packs={loosePacks}
                exams={examMenuOptions}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
