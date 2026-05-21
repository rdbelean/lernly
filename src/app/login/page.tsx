import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import { loginWithGoogle, loginWithMagicLink } from "./actions";

type SearchParams = Promise<{
  error?: string;
  sent?: string;
  email?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getUser();
  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const errorMessage = params.error;
  const magicLinkSent = params.sent === "1";
  const sentTo = params.email;

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
        <a
          href="/"
          className="mb-8 flex items-center gap-3"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "22px",
            fontWeight: 700,
            letterSpacing: "-0.6px",
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

        {magicLinkSent ? (
          <div
            className="mb-6 rounded-2xl p-4 text-[14px]"
            style={{
              background: "rgba(111, 199, 227, 0.12)",
              border: "1px solid rgba(111, 199, 227, 0.35)",
              color: "#9BD8EB",
            }}
          >
            <div className="font-medium">Check deine E-Mails</div>
            <div className="mt-1 opacity-80">
              Wir haben dir einen Login-Link an {sentTo ?? "dich"} geschickt.
            </div>
          </div>
        ) : null}

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

        <form action={loginWithGoogle} className="mb-4">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3 text-[15px] font-medium text-[#14161C] transition hover:bg-white/90"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
              />
            </svg>
            Mit Google fortfahren
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.12)" }} />
          <span className="text-[12px] uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.45)" }}>
            oder
          </span>
          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.12)" }} />
        </div>

        <form action={loginWithMagicLink} className="flex flex-col gap-3">
          <label
            htmlFor="email"
            className="text-[12px] uppercase tracking-[0.18em]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            E-Mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="du@uni.de"
            className="rounded-2xl px-4 py-3 text-[15px] text-white outline-none transition focus:border-white/40"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.16)",
            }}
          />
          <button
            type="submit"
            className="rounded-full px-5 py-3 text-[15px] font-medium text-white transition hover:bg-white/15"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            Magic-Link per Mail
          </button>
        </form>

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
