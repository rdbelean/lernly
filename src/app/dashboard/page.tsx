import { createClient } from "@/lib/supabase/server";

const EXAM_LABEL: Record<string, string> = {
  essay: "Essay",
  multiple_choice: "Multiple Choice",
  oral: "Mündlich",
  open_book: "Open Book",
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
  const { data: packs, error } = await supabase
    .from("study_packs")
    .select("id, title, exam_type, created_at")
    .order("created_at", { ascending: false });

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
          className="mb-10 text-white"
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
