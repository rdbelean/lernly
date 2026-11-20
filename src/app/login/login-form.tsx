"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import GoogleLogo from "@/components/GoogleLogo";
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
      className="flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-medium text-[color:var(--color-text)] transition hover:bg-[color:var(--color-ink-a14)] disabled:opacity-50"
      style={{
        background: "var(--color-ink-a10)",
        border: "1px solid var(--color-ink-a14)",
      }}
    >
      {isPending && (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full"
          style={{ border: "2px solid var(--color-ink-a14)", borderTopColor: "var(--color-primary)" }}
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
        background: "var(--color-err-bg)",
        border: "1px solid var(--color-err-bg)",
        color: "var(--color-err-ink)",
      }}
    >
      {children}
    </div>
  );
}

export default function LoginForm({
  next,
  register = false,
}: {
  next: string;
  register?: boolean;
}) {
  const [reqState, reqAction] = useActionState<MagicLinkState, FormData>(
    requestMagicLink,
    { ok: false },
  );
  const [verifyState, verifyAction] = useActionState<MagicLinkState, FormData>(
    verifyMagicCode,
    { ok: false },
  );
  const [turnstileToken, setTurnstileToken] = useState("");
  // Email magic-link is collapsed by default so Google is the obvious action.
  // Turnstile lives inside the email form, so it only mounts once expanded.
  const [showEmail, setShowEmail] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

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
            background: "var(--color-work-bg)",
            border: "1px solid var(--color-work-bg)",
            color: "var(--color-work-ink)",
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
            background: "var(--color-ink-a04)",
            border: "1px solid var(--color-ink-a10)",
            color: "var(--color-text-dim)",
          }}
        >
          <Inbox
            size={16}
            strokeWidth={1.9}
            aria-hidden
            style={{ marginTop: 2, flexShrink: 0, color: "var(--color-text-faint)" }}
          />
          <span>
            Nichts im Posteingang? Schau im{" "}
            <strong style={{ color: "var(--color-text)", fontWeight: 600 }}>
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
            className="text-[12px]"
            style={{ color: "var(--color-text-faint)" }}
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
            className="rounded-2xl px-4 py-3 text-center text-[20px] font-semibold text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-ink-a14)]"
            style={{
              background: "var(--color-ink-a06)",
              border: "1px solid var(--color-ink-a14)",
            }}
          />
          <PendingButton idle="Anmelden" pending="Wird geprüft…" />
        </form>

        {resendNote ? (
          <p
            className="mt-3 text-center text-[12.5px]"
            style={{ color: "var(--color-text-faint)" }}
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
            className="underline-offset-2 transition hover:text-[color:var(--color-text)] disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
            style={{ color: "var(--color-text-faint)" }}
          >
            {cooldown > 0
              ? `Mail erneut senden (${cooldown}s)`
              : resending
                ? "Wird gesendet…"
                : "Mail erneut senden"}
          </button>
          <a
            href={backHref}
            className="underline-offset-2 hover:text-[color:var(--color-text)]"
            style={{ color: "var(--color-text-faint)" }}
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
          className="flex w-full items-center justify-center gap-3 rounded-full border border-[color:var(--color-ink-a14)] bg-[color:var(--color-surface)] px-5 py-3 text-[15px] font-medium text-[color:var(--color-text)] transition-colors hover:bg-[color:var(--color-surface-2)]"
        >
          <GoogleLogo />
          Mit Google fortfahren
        </button>
      </form>

      {!showEmail ? (
        <button
          type="button"
          aria-expanded={false}
          onClick={() => {
            setShowEmail(true);
            // Focus the field after it mounts.
            setTimeout(() => emailInputRef.current?.focus(), 0);
          }}
          className="mt-6 w-full text-center text-[13px] transition hover:text-[color:var(--color-text)]"
          style={{ color: "var(--color-text-faint)" }}
        >
          {register ? "oder mit E-Mail registrieren" : "oder mit E-Mail anmelden"}
        </button>
      ) : (
        <form
          id="email-login-form"
          action={reqAction}
          noValidate
          className="mt-6 flex flex-col gap-3"
        >
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="turnstileToken" value={turnstileToken} />
          <label
            htmlFor="email"
            className="text-[12px]"
            style={{ color: "var(--color-text-faint)" }}
          >
            E-Mail
          </label>
          <input
            ref={emailInputRef}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="du@uni.de"
            className="rounded-2xl px-4 py-3 text-[15px] text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-ink-a14)]"
            style={{
              background: "var(--color-ink-a06)",
              border: "1px solid var(--color-ink-a14)",
            }}
          />
          <TurnstileWidget
            onVerify={setTurnstileToken}
            onError={() => setTurnstileToken("")}
          />
          <PendingButton
            idle={register ? "Kostenlos registrieren" : "Code & Link per Mail"}
            pending="Wird gesendet…"
          />
        </form>
      )}

      <p
        className="mt-6 text-center text-[13px]"
        style={{ color: "var(--color-text-faint)" }}
      >
        Geschlossene Beta · Zugang nur für freigeschaltete Accounts.
      </p>
    </>
  );
}
