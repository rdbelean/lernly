"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { setExamReminderPreference } from "./actions";

// Exam-reminder toggle. Actual sending lives in
// /api/cron/exam-reminders (daily). This component just persists the
// per-user opt-in flag (`users.exam_reminders_enabled`).

export default function NotificationsSection({
  initialEnabled,
  emailProviderConfigured,
}: {
  initialEnabled: boolean;
  emailProviderConfigured: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next); // optimistic
    setError(null);
    startTransition(async () => {
      const result = await setExamReminderPreference(next);
      if (result.ok === false) {
        setEnabled(!next); // revert
        setError(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div
            className="inline-flex items-center gap-2 text-[14px] font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            <Bell
              size={15}
              strokeWidth={1.75}
              color="var(--color-text-dim)"
              aria-hidden
            />
            Klausur-Erinnerungen
          </div>
          <p
            className="mt-1 text-[12.5px] leading-snug"
            style={{ color: "var(--color-text-dim)" }}
          >
            Wir schreiben dir 7, 3 und 1 Tag(e) vor deiner Klausur. Du
            kannst jederzeit hier wieder ausschalten.
          </p>
        </div>
        <span
          role="switch"
          aria-checked={enabled}
          tabIndex={0}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              toggle();
            }
          }}
          className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50"
          style={{
            background: enabled
              ? "var(--color-primary)"
              : "rgba(255,255,255,0.10)",
            cursor: pending ? "wait" : "pointer",
          }}
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
            style={{
              transform: enabled ? "translateX(22px)" : "translateX(2px)",
            }}
          />
        </span>
      </label>

      {!emailProviderConfigured && (
        <div
          className="rounded-xl px-4 py-3 text-[12.5px]"
          style={{
            background: "rgba(242, 163, 60, 0.08)",
            border: "1px solid rgba(242, 163, 60, 0.25)",
            color: "rgba(255,220,170,0.95)",
          }}
        >
          E-Mail-Versand ist gerade nicht konfiguriert (RESEND_API_KEY
          fehlt) — die Einstellung wird gespeichert, aber es geht aktuell
          keine Mail raus.
        </div>
      )}

      {error && (
        <p
          className="text-[12.5px]"
          style={{ color: "var(--color-cat-coral)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
