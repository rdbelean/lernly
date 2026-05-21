import { createClient } from "@/lib/supabase/server";

const EXAM_LABEL: Record<string, string> = {
  essay: "Essay",
  multiple_choice: "Multiple Choice",
  oral: "Mündlich",
  open_book: "Open Book",
};

const PLAN_LIMITS: Record<string, number> = {
  free: 3,
  pro: 20,
  team: 50,
};

const PLAN_LABEL: Record<string, string> = {
  free: "Gratis",
  pro: "Pro",
  team: "Team",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [packsRes, userRowRes] = await Promise.all([
    supabase
      .from("study_packs")
      .select("id, title, exam_type, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("users")
      .select("plan, packs_used_this_month")
      .single(),
  ]);

  const { data: packs, error } = packsRes;
  const profile = userRowRes.data;
  const plan = profile?.plan ?? "free";
  const used = profile?.packs_used_this_month ?? 0;
  const planLimit = PLAN_LIMITS[plan] ?? 0;
  const planLabel = PLAN_LABEL[plan] ?? plan;
  const quotaReached = used >= planLimit;

  if (error) {
    return (
      <main className="px-6 py-16">
        <div className="mx-auto max-w-[920px]">
          <p className="text-[15px]" style={{ color: "rgba(255,200,120,0.85)" }}>
            Pakete konnten nicht geladen werden: {error.message}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-[920px]">
        <p
          className="mb-3 text-[12px] uppercase tracking-[0.22em]"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          Deine Lernpakete
        </p>
        <h1
          className="mb-6 text-white"
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

        <div
          className="mb-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4"
          style={{
            background: "rgba(20, 22, 28, 0.4)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>
            <span className="font-medium text-white">{planLabel}-Plan</span>
            <span className="mx-2 opacity-40">·</span>
            <span>
              {used} / {planLimit} Pakete diesen Monat
            </span>
          </div>
          {quotaReached ? (
            <a
              href="/dashboard/settings"
              className="rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
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

        {packs && packs.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {packs.map((p) => (
              <li key={p.id}>
                <a
                  href={`/dashboard/pack/${p.id}`}
                  className="block rounded-2xl p-6 transition hover:border-white/30"
                  style={{
                    background: "rgba(20, 22, 28, 0.6)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-[17px] font-semibold leading-snug text-white">
                      {p.title}
                    </h2>
                    <span className="ln-mono-tag shrink-0">
                      {EXAM_LABEL[p.exam_type] ?? p.exam_type}
                    </span>
                  </div>
                  <p
                    className="mt-4 text-[12px]"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    {formatDate(p.created_at)}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div
            className="rounded-2xl p-10 text-center"
            style={{
              background: "rgba(20, 22, 28, 0.6)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="text-[44px]">📚</div>
            <h2 className="mt-4 text-[22px] font-semibold text-white">
              Noch keine Pakete
            </h2>
            <p
              className="mt-2 text-[14px]"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Lade dein erstes Kursmaterial hoch — in 2 Minuten hast du dein
              komplettes Lernpaket.
            </p>
            <a
              href="/dashboard/new"
              className="mt-6 inline-block rounded-full bg-white px-5 py-2.5 text-[14px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
            >
              Paket erstellen →
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
