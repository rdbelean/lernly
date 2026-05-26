import { createClient } from "@/lib/supabase/server";
import CramJobsPanel from "@/components/dashboard/CramJobsPanel";

type PackSummary = {
  id: string;
  title: string;
  exam_type: string;
  created_at: string;
  card_count: number;
};

const EXAM_LABEL: Record<string, string> = {
  essay: "Essay",
  multiple_choice: "Multiple Choice",
  oral: "Mündlich",
  open_book: "Open Book",
};

// Each exam type gets its own gradient header so the pack list reads as a
// colorful collection instead of a row of identical dark tiles.
const EXAM_GRADIENT: Record<string, string> = {
  essay:
    "linear-gradient(135deg, rgba(99,102,241,0.95) 0%, rgba(168,85,247,0.7) 100%)",
  multiple_choice:
    "linear-gradient(135deg, rgba(34,211,238,0.9) 0%, rgba(56,189,248,0.65) 100%)",
  oral:
    "linear-gradient(135deg, rgba(251,191,36,0.92) 0%, rgba(244,114,98,0.7) 100%)",
  open_book:
    "linear-gradient(135deg, rgba(74,222,128,0.88) 0%, rgba(20,184,166,0.7) 100%)",
};

const EXAM_EMOJI: Record<string, string> = {
  essay: "📝",
  multiple_choice: "✅",
  oral: "🎤",
  open_book: "📖",
};

const PLAN_LIMITS: Record<string, number> = {
  free: 2,
  pro: 25,
  team: 60,
};

const PLAN_LABEL: Record<string, string> = {
  free: "Gratis",
  pro: "Pro",
  team: "Team",
};

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.floor((now - then) / 1000);
  if (sec < 60) return "gerade eben";
  const min = Math.floor(sec / 60);
  if (min < 60) return `vor ${min} Min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `vor ${hr} ${hr === 1 ? "Stunde" : "Stunden"}`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "gestern";
  if (day < 7) return `vor ${day} Tagen`;
  if (day < 30)
    return `vor ${Math.floor(day / 7)} ${Math.floor(day / 7) === 1 ? "Woche" : "Wochen"}`;
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ContinueLearningHero({ pack }: { pack: PackSummary }) {
  const gradient = EXAM_GRADIENT[pack.exam_type] ?? EXAM_GRADIENT.essay;
  const emoji = EXAM_EMOJI[pack.exam_type] ?? "📚";
  const examLabel = EXAM_LABEL[pack.exam_type] ?? pack.exam_type;

  return (
    <a
      href={`/dashboard/pack/${pack.id}`}
      className="group relative mb-10 block overflow-hidden rounded-3xl border border-white/14 transition hover:border-white/30"
      style={{
        background: "rgba(20, 22, 28, 0.7)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-90"
        style={{ background: gradient }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(15,21,53,0.55) 70%, rgba(15,21,53,0.92) 100%)",
        }}
      />
      <div className="relative flex flex-col gap-6 px-7 py-9 md:flex-row md:items-end md:justify-between md:px-10 md:py-12">
        <div className="flex-1">
          <p
            className="mb-3 text-[12px] font-medium uppercase tracking-[0.22em]"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            Weiterlernen
          </p>
          <h2
            className="mb-2 text-balance text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "32px",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.6px",
            }}
          >
            {pack.title}
          </h2>
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]"
            style={{ color: "rgba(255,255,255,0.78)" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <span>{emoji}</span>
              {examLabel}
            </span>
            <span className="opacity-50">·</span>
            <span>{pack.card_count} Karten</span>
            <span className="opacity-50">·</span>
            <span>erstellt {formatRelative(pack.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-[#0F1535] transition group-hover:bg-white/95"
          >
            Weiterlernen
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition group-hover:translate-x-0.5"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        </div>
      </div>
    </a>
  );
}

function PackCard({ pack }: { pack: PackSummary }) {
  const gradient = EXAM_GRADIENT[pack.exam_type] ?? EXAM_GRADIENT.essay;
  const emoji = EXAM_EMOJI[pack.exam_type] ?? "📚";
  const examLabel = EXAM_LABEL[pack.exam_type] ?? pack.exam_type;

  return (
    <a
      href={`/dashboard/pack/${pack.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/12 transition hover:border-white/30 hover:-translate-y-0.5"
      style={{
        background: "rgba(20, 22, 28, 0.6)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        className="relative h-[88px] w-full"
        style={{ background: gradient }}
      >
        <div className="absolute inset-0 flex items-end justify-between px-5 pb-3">
          <span
            className="text-[12px] font-medium uppercase tracking-[0.18em]"
            style={{ color: "rgba(255,255,255,0.92)" }}
          >
            <span className="mr-1.5">{emoji}</span>
            {examLabel}
          </span>
          <span
            className="rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-medium tabular-nums"
            style={{ color: "rgba(255,255,255,0.95)" }}
          >
            {pack.card_count} Karten
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-5 py-5">
        <h3 className="text-[16px] font-semibold leading-snug text-white">
          {pack.title}
        </h3>
        <div className="mt-auto flex items-center justify-between text-[12px]">
          <span style={{ color: "rgba(255,255,255,0.5)" }}>
            {formatRelative(pack.created_at)}
          </span>
          <span
            className="opacity-0 transition group-hover:opacity-100"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            Öffnen →
          </span>
        </div>
      </div>
    </a>
  );
}

function EmptyState() {
  return (
    <div
      className="relative overflow-hidden rounded-3xl px-8 py-14 text-center"
      style={{
        background: "rgba(20, 22, 28, 0.6)",
        border: "1px solid rgba(255,255,255,0.14)",
        backdropFilter: "blur(20px)",
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
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.2))",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="9" rx="1.4" />
            <rect x="14" y="3" width="7" height="5" rx="1.4" />
            <rect x="14" y="12" width="7" height="9" rx="1.4" />
            <rect x="3" y="16" width="7" height="5" rx="1.4" />
          </svg>
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
            Dein erstes Lernpaket
          </h2>
          <p
            className="mt-2 text-[14px]"
            style={{ color: "rgba(255,255,255,0.62)" }}
          >
            Lad deine Folien hoch — Karteikarten, Quiz und Blueprint in ca. 2
            Minuten.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="/dashboard/new"
            className="rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-[#0F1535] transition hover:bg-white/90"
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
  searchParams: Promise<{ credit_purchased?: string; cram?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [packsRes, userRowRes, creditsRes] = await Promise.all([
    supabase.rpc("list_pack_summaries"),
    supabase
      .from("users")
      .select("plan, packs_used_this_month")
      .single(),
    supabase.rpc("available_pack_credits"),
  ]);
  const credits = typeof creditsRes.data === "number" ? creditsRes.data : 0;

  const { data: packs, error } = packsRes as {
    data: PackSummary[] | null;
    error: { message: string } | null;
  };
  const profile = userRowRes.data;
  const plan = profile?.plan ?? "free";
  const used = profile?.packs_used_this_month ?? 0;
  const planLimit = PLAN_LIMITS[plan] ?? 0;
  const planLabel = PLAN_LABEL[plan] ?? plan;
  const quotaReached = used >= planLimit;
  const quotaPercent = planLimit > 0 ? Math.min(100, (used / planLimit) * 100) : 0;

  if (error) {
    return (
      <main className="px-6 py-16">
        <div className="mx-auto max-w-[1080px]">
          <p className="text-[15px]" style={{ color: "rgba(255,200,120,0.85)" }}>
            Pakete konnten nicht geladen werden: {error.message}
          </p>
        </div>
      </main>
    );
  }

  const allPacks = packs ?? [];
  const [hero, ...rest] = allPacks;

  return (
    <main className="px-6 py-12 md:py-16">
      <div className="mx-auto max-w-[1080px]">
        {params.credit_purchased === "1" && (
          <div
            className="mb-6 rounded-2xl p-4 text-[14px]"
            style={{
              background: "rgba(124,196,160,0.12)",
              border: "1px solid rgba(124,196,160,0.35)",
              color: "#9FD4B8",
            }}
          >
            <span className="font-medium">Extra-Paket gutgeschrieben ✓</span>
            <span className="opacity-80"> — du kannst wieder Lernpakete erstellen.</span>
          </div>
        )}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p
              className="mb-2 text-[12px] uppercase tracking-[0.22em]"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Deine Lernpakete
            </p>
            <h1
              className="text-white"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "44px",
                fontWeight: 700,
                letterSpacing: "-1.4px",
                lineHeight: 1.05,
              }}
            >
              Dashboard
            </h1>
          </div>
          <a
            href="/dashboard/new"
            className="hidden shrink-0 rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-[#0F1535] transition hover:bg-white/90 sm:inline-flex"
          >
            ✦ Neues Paket
          </a>
        </div>

        <div
          className="mb-10 overflow-hidden rounded-2xl"
          style={{
            background: "rgba(20, 22, 28, 0.4)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>
              <span className="font-medium text-white">{planLabel}-Plan</span>
              <span className="mx-2 opacity-40">·</span>
              <span>
                {used} / {planLimit} Pakete diesen Monat
              </span>
              {credits > 0 && (
                <span className="ml-2" style={{ color: "#9BD8EB" }}>
                  · +{credits} Extra-Paket{credits === 1 ? "" : "e"} verfügbar
                </span>
              )}
            </div>
            {quotaReached && credits === 0 ? (
              <a
                href="/dashboard/settings"
                className="rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-[#0F1535] transition hover:bg-white/90"
              >
                Upgrade →
              </a>
            ) : (
              plan === "free" && (
                <a
                  href="/dashboard/settings"
                  className="text-[13px] underline-offset-2 hover:underline"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  Upgrade auf Pro
                </a>
              )
            )}
          </div>
          <div
            aria-hidden
            className="h-1 w-full"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${quotaPercent}%`,
                background: quotaReached
                  ? "linear-gradient(90deg, #f87171, #fb923c)"
                  : "linear-gradient(90deg, rgba(99,102,241,0.95), rgba(168,85,247,0.9))",
              }}
            />
          </div>
        </div>

        <CramJobsPanel />

        {allPacks.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {hero && <ContinueLearningHero pack={hero} />}
            {rest.length > 0 && (
              <>
                <p
                  className="mb-4 text-[12px] uppercase tracking-[0.22em]"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  Alle Pakete
                </p>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((p) => (
                    <li key={p.id}>
                      <PackCard pack={p} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
