"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { verifyMagicCode, type MagicLinkState } from "@/app/login/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.18)",
      }}
    >
      {pending && (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full"
          style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }}
          aria-hidden
        />
      )}
      {pending ? "Wird geprüft…" : "Einloggen"}
    </button>
  );
}

// Code-entry that logs the freshly-provisioned buyer straight in. Reuses the
// same verifyMagicCode server action as the login page (device-independent OTP).
export default function SuccessLogin({ email }: { email: string }) {
  const [state, action] = useActionState<MagicLinkState, FormData>(
    verifyMagicCode,
    { ok: false },
  );

  return (
    <>
      {state.error ? (
        <div
          className="mb-4 rounded-2xl p-4 text-[14px]"
          style={{
            background: "rgba(217, 119, 87, 0.12)",
            border: "1px solid rgba(217, 119, 87, 0.35)",
            color: "#E8A88D",
          }}
        >
          {state.error}
        </div>
      ) : null}

      <form action={action} noValidate className="flex flex-col gap-3">
        <input type="hidden" name="next" value="/dashboard" />
        <input type="hidden" name="email" value={email} />
        <label
          htmlFor="code"
          className="text-[12px] uppercase tracking-[0.18em]"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          Login-Code
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
        <SubmitButton />
      </form>
    </>
  );
}
