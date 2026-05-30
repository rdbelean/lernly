"use client";

import { useActionState, useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { PrimaryCTAButton } from "@/components/ui/PrimaryCTA";
import { changeEmail, type ActionResult } from "./actions";

// Account basics — email + provider readout + change-email form.
// Password change is intentionally absent: Lernly only supports Google
// OAuth and Magic Link (no password auth). See diagnosis in settings/page.tsx.

type Provider = "google" | "email" | string | null;

function providerLabel(provider: Provider): string {
  if (provider === "google") return "Google";
  if (provider === "email") return "E-Mail-Link";
  return provider ?? "—";
}

const initialState: ActionResult = { ok: true };

export default function AccountSection({
  email,
  provider,
}: {
  email: string;
  provider: Provider;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    changeEmail,
    initialState,
  );

  const submitted = state.ok === true && editing && !pending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className="text-[12px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--color-text-faint)" }}
        >
          Aktuelle E-Mail
        </span>
        <span
          className="text-[15px] font-medium"
          style={{ color: "var(--color-text)" }}
        >
          {email}
        </span>
      </div>

      <div
        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px]"
        style={{
          background: "rgba(110, 128, 242, 0.08)",
          borderColor: "rgba(110, 128, 242, 0.24)",
          color: "var(--color-primary-bright)",
        }}
      >
        <ShieldCheck size={13} strokeWidth={2} aria-hidden />
        Angemeldet via {providerLabel(provider)}
      </div>

      {!editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition hover:text-white"
          style={{
            borderColor: "rgba(255,255,255,0.10)",
            color: "var(--color-text-dim)",
          }}
        >
          <Mail size={13} strokeWidth={2} aria-hidden />
          E-Mail ändern
        </button>
      ) : (
        <form action={formAction} className="space-y-3">
          <label
            className="block text-[12px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--color-text-faint)" }}
          >
            Neue E-Mail-Adresse
          </label>
          <input
            type="email"
            name="email"
            required
            autoFocus
            placeholder="dein.name@uni.de"
            className="w-full rounded-xl border px-3 py-2 text-[14px] outline-none transition focus:border-white/40"
            style={{
              background: "var(--color-surface-2)",
              borderColor: "rgba(255,255,255,0.10)",
              color: "var(--color-text)",
            }}
          />
          <p
            className="text-[12px]"
            style={{ color: "var(--color-text-dim)" }}
          >
            Wir schicken einen Bestätigungs-Link an die neue Adresse. Erst nach
            dem Klick wird die Änderung übernommen.
          </p>
          <div className="flex flex-wrap gap-2">
            <PrimaryCTAButton
              size="sm"
              type="submit"
              disabled={pending}
            >
              {pending ? "Sende Link…" : "Bestätigungs-Link senden"}
            </PrimaryCTAButton>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={pending}
              className="rounded-full border px-4 py-2 text-[13px] font-semibold transition hover:text-white disabled:opacity-50"
              style={{
                borderColor: "rgba(255,255,255,0.10)",
                color: "var(--color-text-dim)",
              }}
            >
              Abbrechen
            </button>
          </div>
          {submitted && (
            <p
              className="text-[13px]"
              style={{ color: "var(--color-cat-teal)" }}
            >
              Link verschickt — schau in dein neues Postfach.
            </p>
          )}
          {state.ok === false && state.error && (
            <p
              className="text-[13px]"
              style={{ color: "var(--color-cat-coral)" }}
            >
              {state.error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
