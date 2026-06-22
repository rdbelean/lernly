import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import LernlyLogo from "@/components/LernlyLogo";
import { getStripe } from "@/lib/stripe";
import { getUser } from "@/lib/dal";
import SuccessLogin from "./success-login";

// Guests land here after a successful Stripe checkout. The webhook provisions
// the account + emails a login code; this page confirms payment and lets them
// type that code to log straight in. Never cached — we read live Stripe state.
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ session_id?: string }>;

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { session_id } = await searchParams;

  // Already logged in (e.g. a logged-in purchase somehow routed here)? Just go in.
  const user = await getUser();
  if (user) redirect("/dashboard?upgraded=1");

  // Confirm payment + read the email Stripe collected (best-effort).
  let email: string | null = null;
  let paid = false;
  const stripe = getStripe();
  if (stripe && session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      paid =
        session.payment_status === "paid" || session.status === "complete";
      email =
        session.customer_details?.email ?? session.customer_email ?? null;
    } catch (e) {
      console.error("[checkout/success] session retrieve failed", e);
    }
  }

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

        {paid ? (
          <>
            <span
              aria-hidden
              className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: "rgba(79,209,165,0.16)" }}
            >
              <CheckCircle2 size={26} strokeWidth={2} color="#4FD1A5" />
            </span>
            <h1
              className="mb-2"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "28px",
                fontWeight: 700,
                letterSpacing: "-0.8px",
                lineHeight: 1.1,
              }}
            >
              Zahlung erfolgreich
            </h1>
            <p
              className="mb-6 text-[15px]"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              Dein Konto ist eingerichtet. Logg dich direkt ein — kein Code
              nötig:
            </p>

            {session_id ? (
              <a
                href={`/auth/checkout?session_id=${encodeURIComponent(session_id)}`}
                className="mb-6 flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold text-white transition hover:brightness-110"
                style={{ background: "var(--color-primary)" }}
              >
                Direkt einloggen →
              </a>
            ) : null}

            <div className="mb-5 flex items-center gap-3">
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.12)" }} />
              <span
                className="text-[11px] uppercase tracking-[0.16em]"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                oder mit Code aus der Mail
              </span>
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.12)" }} />
            </div>

            <SuccessLogin email={email ?? ""} />

            <p
              className="mt-6 text-center text-[13px]"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Oder klick einfach den Login-Link in der E-Mail
              {email ? ` an ${email}` : ""}.
            </p>
          </>
        ) : (
          <>
            <h1
              className="mb-2"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "28px",
                fontWeight: 700,
                letterSpacing: "-0.8px",
                lineHeight: 1.1,
              }}
            >
              Fast geschafft
            </h1>
            <p
              className="mb-7 text-[15px]"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              Wir konnten den Zahlungsstatus gerade nicht sofort bestätigen.
              Wenn deine Zahlung durchging, kommt in Kürze eine E-Mail mit
              deinem Login-Code. Kommt nichts an, schreib uns:{" "}
              <a
                href="mailto:info@lernly-app.de"
                className="underline hover:text-white"
              >
                info@lernly-app.de
              </a>
              .
            </p>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-medium text-white transition hover:bg-white/15"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              Zum Login
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
