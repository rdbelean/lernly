"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Inbox } from "lucide-react";
import TurnstileWidget from "@/components/TurnstileWidget";
import {
  loginWithGoogle,
  requestMagicLink,
  verifyMagicCode,
  type MagicLinkState,
} from "./actions";

function PendingButton({
  idle,
  pending,
}: {
  idle: string;
  pending: string;
}) {
  const { pending: isPending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={isPending}
      className="flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.18)",
      }}
    >
      {isPending && (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full"
          style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }}
          aria-hidden
        />
      )}
      {isPending ? pending : idle}
    </button>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-6 rounded-2xl p-4 text-[14px]"
      style={{
        background: "rgba(217, 119, 87, 0.12)",
        border: "1px solid rgba(217, 119, 87, 0.35)",
        color: "#E8A88D",
      }}
    >
      {children}
    </div>
  );
}

export default function LoginForm({ next }: { next: string }) {
  const [reqState, reqAction] = useActionState<MagicLinkState, FormData>(
    requestMagicLink,
    { ok: false },
  );
  const [verifyState, verifyAction] = useActionState<MagicLinkState, FormData>(
    verifyMagicCode,
    { ok: false },
  );
  const [turnstileToken, setTurnstileToken] = useState("");

  // Once the email is sent we move to the code-entry step. "Zurück" does a hard
  // reload of /login (cleanest reset — new Turnstile token, clean state).
  const onCodeStep = reqState.ok;
  const email = reqState.sentTo ?? "";
  const backHref =
    next && next !== "/dashboard"
      ? `/login?next=${encodeURIComponent(next)}`
      : "/login";

  // Resend state. A re-keyed Turnstile widget (interaction-only → usually
  // invisible) mints a fresh token for each resend; a 30s cooldown gates it.
  const turnstileConfigured = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [resendToken, setResendToken] = useState("");
  const [resendNonce, setResendNonce] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendNote, setResendNote] = useState<string | null>(null);

  // 30s resend cooldown — counts down once mounted, reset to 30 after each
  // resend. setState lives in the timeout callback (not synchronous in the
  // effect body), so it's lint-clean.
  const [cooldown, setCooldown] = useState(30);
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // Resend the magic-link mail to the same address. Calls the server action
  // imperatively (no extra form) with a fresh Turnstile token.
  const resend = async () => {
    if (cooldown > 0 || resending || (turnstileConfigured && !resendToken)) {
      return;
    }
    setResending(true);
    setResendNote(null);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("next", next);
    fd.set("turnstileToken", resendToken);
    try {
      const res = await requestMagicLink({ ok: false }, fd);
      if (res.ok) {
        setResendNote(
          "Neue Mail ist unterwegs — nimm den Code aus der neuesten Mail.",
        );
        setCooldown(30);
        setResendToken("");
        setResendNonce((n) => n + 1); // re-key Turnstile → fresh token next time
      } else {
        setResendNote(res.error ?? "Erneutes Senden hat nicht geklappt.");
      }
    } catch {
      setResendNote("Erneutes Senden hat nicht geklappt.");
    } finally {
      setResending(false);
    }
  };

  if (onCodeStep) {
    return (
      <>
        <div
          className="mb-4 rounded-2xl p-4 text-[14px]"
          style={{
            background: "rgba(111, 199, 227, 0.12)",
            border: "1px solid rgba(111, 199, 227, 0.35)",
            color: "#9BD8EB",
          }}
        >
          <div className="font-medium">Check deine E-Mails</div>
          <div className="mt-1 opacity-80">
            Wir haben dir eine Mail an {email || "dich"} geschickt — mit
            Login-Code und Link.
          </div>
        </div>

        {/* Calm spam-folder nudge — Outlook/Apple Mail sometimes junk new senders. */}
        <div
          className="mb-5 flex gap-2.5 rounded-2xl p-3.5 text-[13px] leading-snug"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <Inbox
            size={16}
            strokeWidth={1.9}
            aria-hidden
            style={{ marginTop: 2, flexShrink: 0, color: "rgba(255,255,255,0.5)" }}
          />
          <span>
            Nichts im Posteingang? Schau im{" "}
            <strong style={{ color: "#fff", fontWeight: 600 }}>
              Spam-/Junk-Ordner
            </strong>{" "}
            nach und markier die Mail als „Kein Spam“ — dann landet die nächste
            sicher im Posteingang.
          </span>
        </div>

        {verifyState.error ? <ErrorBox>{verifyState.error}</ErrorBox> : null}

        <form action={verifyAction} noValidate className="flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="email" value={email} />
          <label
            htmlFor="code"
            className="text-[12px] uppercase tracking-[0.18em]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Oder gib den Code aus der Mail ein
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={10}
            autoFocus
            className="rounded-2xl px-4 py-3 text-center text-[20px] font-semibold tracking-[0.3em] text-white outline-none transition focus:border-white/40"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.16)",
            }}
          />
          <PendingButton idle="Anmelden" pending="Wird geprüft…" />
        </form>

        {resendNote ? (
          <p
            className="mt-3 text-center text-[12.5px]"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {resendNote}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col items-center gap-2 text-[13px]">
          <button
            type="button"
            onClick={resend}
            disabled={
              cooldown > 0 || resending || (turnstileConfigured && !resendToken)
            }
            className="underline-offset-2 transition hover:text-white disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {cooldown > 0
              ? `Mail erneut senden (${cooldown}s)`
              : resending
                ? "Wird gesendet…"
                : "Mail erneut senden"}
          </button>
          <a
            href={backHref}
            className="underline-offset-2 hover:text-white"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Andere Adresse verwenden
          </a>
        </div>

        {/* Invisible (interaction-only) Turnstile that mints a fresh token for
            resend; re-keyed after each send so the next resend gets a new one. */}
        {turnstileConfigured ? (
          <div className="mt-2">
            <TurnstileWidget
              key={resendNonce}
              onVerify={setResendToken}
              onError={() => setResendToken("")}
            />
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      {reqState.error ? <ErrorBox>{reqState.error}</ErrorBox> : null}

      <form action={loginWithGoogle} className="mb-4">
        <input type="hidden" name="next" value={next} />
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
        <span
          className="text-[12px] uppercase tracking-[0.18em]"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          oder
        </span>
        <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.12)" }} />
      </div>

      <form action={reqAction} noValidate className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="turnstileToken" value={turnstileToken} />
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
          autoComplete="email"
          placeholder="du@uni.de"
          className="rounded-2xl px-4 py-3 text-[15px] text-white outline-none transition focus:border-white/40"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.16)",
          }}
        />
        <TurnstileWidget
          onVerify={setTurnstileToken}
          onError={() => setTurnstileToken("")}
        />
        <PendingButton idle="Code & Link per Mail" pending="Wird gesendet…" />
      </form>
    </>
  );
}
