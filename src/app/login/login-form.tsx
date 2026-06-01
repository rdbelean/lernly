"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import TurnstileWidget from "@/components/TurnstileWidget";
import { loginWithGoogle, requestMagicLink, type MagicLinkState } from "./actions";

function MagicSubmit() {
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
      {pending ? "Wird gesendet…" : "Magic-Link per Mail"}
    </button>
  );
}

export default function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<MagicLinkState, FormData>(
    requestMagicLink,
    { ok: false },
  );
  const [turnstileToken, setTurnstileToken] = useState("");

  return (
    <>
      {state.ok ? (
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
            Wir haben dir einen Login-Link an {state.sentTo ?? "dich"} geschickt.
          </div>
        </div>
      ) : null}

      {state.error ? (
        <div
          className="mb-6 rounded-2xl p-4 text-[14px]"
          style={{
            background: "rgba(217, 119, 87, 0.12)",
            border: "1px solid rgba(217, 119, 87, 0.35)",
            color: "#E8A88D",
          }}
        >
          {state.error}
        </div>
      ) : null}

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

      <form action={action} noValidate className="flex flex-col gap-3">
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
        <MagicSubmit />
      </form>
    </>
  );
}
