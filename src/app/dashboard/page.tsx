import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex flex-1 items-start justify-center px-6 py-16">
      <div
        className="w-full max-w-[640px] rounded-[28px] p-10 text-white"
        style={{
          background: "rgba(20, 22, 28, 0.78)",
          border: "1px solid rgba(255, 255, 255, 0.22)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6)",
        }}
      >
        <p
          className="mb-3 text-[12px] uppercase tracking-[0.22em]"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          Dashboard
        </p>
        <h1
          className="mb-3"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "40px",
            fontWeight: 700,
            letterSpacing: "-1.2px",
            lineHeight: 1.05,
          }}
        >
          Willkommen{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}.
        </h1>
        <p
          className="mb-8 text-[15px]"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Eingeloggt als <span className="text-white">{user.email}</span>.
          Deine gespeicherten Lernpakete erscheinen hier, sobald wir den Save-Flow live haben (Phase 2).
        </p>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-full px-5 py-3 text-[15px] font-medium text-white transition hover:bg-white/15"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            Abmelden
          </button>
        </form>
      </div>
    </main>
  );
}
