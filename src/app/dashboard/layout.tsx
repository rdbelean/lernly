import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <nav
        className="sticky top-0 z-40 w-full"
        style={{
          background: "var(--color-ln-nav-bg)",
          backdropFilter: "saturate(1.8) blur(20px)",
          WebkitBackdropFilter: "saturate(1.8) blur(20px)",
        }}
      >
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-[18px]">
          <a
            href="/dashboard"
            className="flex items-center gap-3 text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "22px",
              fontWeight: 700,
              letterSpacing: "-0.7px",
              lineHeight: 1,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/lernly-symbol-transparent.svg"
              alt="Lernly"
              width={36}
              height={36}
            />
            <span>Lernly</span>
          </a>

          <div className="flex items-center gap-4">
            <a
              href="/dashboard/new"
              className="rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
            >
              Neues Paket
            </a>
            <a
              href="/dashboard/settings"
              className="hidden text-[13px] text-white/55 transition hover:text-white sm:inline"
            >
              Einstellungen
            </a>
            <span
              className="hidden text-[13px] md:inline"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-[13px] text-white/55 transition hover:text-white"
              >
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </nav>

      {children}
    </>
  );
}
