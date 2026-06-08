import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import LoginForm from "./login-form";
import LernlyLogo from "@/components/LernlyLogo";

type SearchParams = Promise<{
  error?: string;
  next?: string;
}>;

function safeNext(raw: string | undefined): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);

  const user = await getUser();
  if (user) {
    redirect(next);
  }

  const errorMessage = params.error;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div
        className="w-full max-w-[420px] rounded-[28px] p-10 text-white"
        style={{
          background: "rgba(20, 22, 28, 0.78)",
          border: "1px solid rgba(255, 255, 255, 0.22)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6)",
        }}
      >
        <Link
          href="/"
          className="mb-8 flex items-center gap-3"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "22px",
            fontWeight: 700,
            letterSpacing: "-0.6px",
          }}
        >
          <LernlyLogo size={36} alt="" />
          <span>Lernly</span>
        </Link>

        <h1
          className="mb-2"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "32px",
            fontWeight: 700,
            letterSpacing: "-1px",
            lineHeight: 1.1,
          }}
        >
          Anmelden
        </h1>
        <p className="mb-8 text-[15px]" style={{ color: "rgba(255,255,255,0.6)" }}>
          Speichere deine Lernpakete und greife von überall darauf zu.
        </p>

        {errorMessage ? (
          <div
            className="mb-6 rounded-2xl p-4 text-[14px]"
            style={{
              background: "rgba(217, 119, 87, 0.12)",
              border: "1px solid rgba(217, 119, 87, 0.35)",
              color: "#E8A88D",
            }}
          >
            {decodeURIComponent(errorMessage)}
          </div>
        ) : null}

        <LoginForm next={next} />

        <p
          className="mt-8 text-center text-[13px]"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          Mit dem Login akzeptierst du unsere{" "}
          <a href="/datenschutz" className="underline hover:text-white">
            Datenschutzerklärung
          </a>
          .
        </p>
      </div>
    </main>
  );
}
