import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import LoginForm from "./login-form";
import LernlyLogo from "@/components/LernlyLogo";

type SearchParams = Promise<{
  error?: string;
  next?: string;
  mode?: string;
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
  // Register = same passwordless flow, just framed as sign-up. Reached from the
  // landing "Registrieren" CTAs (?mode=register), lands on the uploadless dashboard.
  const isRegister = params.mode === "register";

  const user = await getUser();
  if (user) {
    redirect(next);
  }

  const errorMessage = params.error;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div
        className="w-full max-w-[420px] rounded-[28px] p-10 text-[color:var(--color-text)]"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-ink-a14)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 24px 60px var(--color-surface)",
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
          {isRegister ? "Kostenlos registrieren" : "Anmelden"}
        </h1>
        <p className="mb-8 text-[15px]" style={{ color: "var(--color-text-faint)" }}>
          {isRegister
            ? "Gib deine E-Mail ein — wir legen dein kostenloses Konto an. Kein Upload nötig."
            : "Speichere deine Lernpakete und greife von überall darauf zu."}
        </p>

        {errorMessage ? (
          <div
            className="mb-6 rounded-2xl p-4 text-[14px]"
            style={{
              background: "var(--color-err-bg)",
              border: "1px solid var(--color-err-bg)",
              color: "var(--color-err-ink)",
            }}
          >
            {decodeURIComponent(errorMessage)}
          </div>
        ) : null}

        <LoginForm next={next} register={isRegister} />

        <p
          className="mt-8 text-center text-[13px]"
          style={{ color: "var(--color-text-faint)" }}
        >
          Mit dem Login akzeptierst du unsere{" "}
          <a href="/datenschutz" className="underline hover:text-[color:var(--color-text)]">
            Datenschutzerklärung
          </a>
          .
        </p>
      </div>
    </main>
  );
}
