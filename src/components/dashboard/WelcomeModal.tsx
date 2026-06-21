"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import LernlyLogo from "@/components/LernlyLogo";
import { useRouter } from "next/navigation";
import { saveWelcome } from "@/app/dashboard/actions";
import { PROVIDER } from "@/lib/legal/provider";
import { track } from "@/lib/analytics";
import NewExamForm from "@/components/dashboard/NewExamForm";

// =========================================================================
// WelcomeModal — guided first-run for brand-new accounts, shown the first
// time a user reaches the dashboard after signup. Visibility is driven by
// users.has_seen_welcome (passed in as `open`).
//
// Three steps, every one skippable (Gate-4 activation: value in the first 2
// minutes without forcing anyone through a wizard):
//   1. Greeting + name           → saveWelcome persists the name + the flag
//   2. "Erstelle deine erste Klausur" → embedded NewExamForm (name + date +
//      "Altklausur? Ja → upload / Nein → skip"); reuses the real exam form
//   3. Hand off to /dashboard/new?exam=<id> so the run ends in a real pack
//
// has_seen_welcome is persisted on the step-1 "Weiter" AND on any skip, so the
// modal never shows twice regardless of where the user drops out.
// =========================================================================

const FEEDBACK_HREF = `mailto:${PROVIDER.email}?subject=${encodeURIComponent(
  "Lernly Feedback",
)}`;

type Step = "name" | "exam";

export default function WelcomeModal({
  open,
  initialName,
}: {
  open: boolean;
  initialName: string | null;
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(open);
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState(initialName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Walkthrough started — fire once when the first-run modal opens.
  useEffect(() => {
    if (open) track("walkthrough_started", {});
  }, [open]);

  // Focus the name field whenever the name step is shown.
  useEffect(() => {
    if (visible && step === "name") inputRef.current?.focus();
  }, [visible, step]);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!visible) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [visible]);

  if (!visible) return null;

  // Persist has_seen_welcome (and optionally the name). Resolves true on success
  // so callers can advance only after the flag is safely stored.
  const persist = (submittedName: string | null): Promise<boolean> =>
    new Promise((resolve) => {
      if (pending) return resolve(false);
      setError(null);
      startTransition(async () => {
        const result = await saveWelcome(submittedName);
        if (result.ok === false) {
          setError(result.error);
          return resolve(false);
        }
        resolve(true);
      });
    });

  // Step 1 → 2: save the name + flag, then reveal the exam-creation step.
  const goToExam = async () => {
    const ok = await persist(name.trim() || null);
    if (!ok) return;
    track("walkthrough_step_completed", { step: "name" });
    setStep("exam");
  };

  // Skip from any step: persist the flag (so it never shows again) and close.
  const skip = (atStep: Step) => {
    track("walkthrough_skipped", { at_step: atStep });
    startTransition(async () => {
      await saveWelcome(null);
      setVisible(false);
      router.refresh();
    });
  };

  // Exam created → hand off to material upload, pre-linked to the new Klausur.
  // Close the modal FIRST: it lives in the dashboard layout, so it survives the
  // client navigation to /dashboard/new (its `visible` is local state, not synced
  // to the `open` prop). Without this the walkthrough stays on screen and every
  // "Anlegen" click silently creates another exam — looks like nothing happens.
  const onExamCreated = (exam: { id: string; hasPastExam?: boolean }) => {
    track("walkthrough_step_completed", { step: "exam" });
    if (exam.hasPastExam) {
      track("walkthrough_step_completed", { step: "altklausur" });
    }
    track("walkthrough_completed", {});
    setVisible(false);
    router.push(`/dashboard/new?exam=${exam.id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") skip(step);
  };

  const isExam = step === "exam";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6"
    >
      <button
        aria-label="Schließen"
        onClick={() => skip(step)}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      />
      <div
        className={`relative max-h-[90vh] w-full overflow-y-auto rounded-3xl border p-7 text-white ${
          isExam ? "max-w-[600px]" : "max-w-[420px]"
        }`}
        style={{
          background: "#141930",
          borderColor: "rgba(255,255,255,0.10)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
        }}
      >
        <div className="relative">
          <LernlyLogo size={40} alt="Lernly" className="mb-5" />

          {!isExam ? (
            <>
              <h2
                id="welcome-title"
                className="mb-3 text-[24px] font-semibold leading-tight"
                style={{
                  fontFamily: "var(--font-display)",
                  letterSpacing: "-0.5px",
                  color: "var(--color-text)",
                }}
              >
                Schön, dass du da bist.
              </h2>

              <p
                className="mb-6 text-[14px] leading-relaxed"
                style={{ color: "var(--color-text-dim)" }}
              >
                Lass uns in 2 Minuten dein erstes Lernpaket bauen. Zuerst: wie
                sollen wir dich nennen?
              </p>

              <label
                htmlFor="welcome-name"
                className="mb-2 block text-[12px] font-medium"
                style={{ color: "var(--color-text)" }}
              >
                Dein Vorname
              </label>
              <input
                id="welcome-name"
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void goToExam();
                  }
                }}
                type="text"
                maxLength={80}
                placeholder="Dein Vorname"
                autoComplete="given-name"
                className="mb-5 w-full rounded-xl px-4 py-3 text-[15px] text-white outline-none transition focus:border-white/40"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              />

              <p
                className="mb-6 text-[12.5px] leading-relaxed"
                style={{ color: "var(--color-text-faint)" }}
              >
                Stört dich was oder hast du eine Idee?{" "}
                <a
                  href={FEEDBACK_HREF}
                  className="underline-offset-2 hover:underline"
                  style={{ color: "var(--color-primary-bright)" }}
                >
                  Schreib mir direkt
                </a>{" "}
                — ich antworte innerhalb von 24 Stunden.
              </p>

              {error && (
                <p
                  className="mb-4 text-[12.5px]"
                  style={{ color: "var(--color-cat-coral)" }}
                >
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={() => void goToExam()}
                disabled={pending}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--color-primary)" }}
              >
                {pending ? "Speichern…" : "Weiter →"}
              </button>
              <button
                type="button"
                onClick={() => skip("name")}
                disabled={pending}
                className="mt-3 w-full text-center text-[13px] transition hover:text-white disabled:opacity-50"
                style={{ color: "var(--color-text-faint)" }}
              >
                Später einrichten
              </button>
            </>
          ) : (
            <>
              <h2
                id="welcome-title"
                className="mb-2 text-[22px] font-semibold leading-tight"
                style={{
                  fontFamily: "var(--font-display)",
                  letterSpacing: "-0.5px",
                  color: "var(--color-text)",
                }}
              >
                Erstelle deine erste Klausur
              </h2>
              <p
                className="mb-5 text-[14px] leading-relaxed"
                style={{ color: "var(--color-text-dim)" }}
              >
                Gib der Klausur einen Namen und das Datum. Hast du eine
                Altklausur? Lade sie hoch — dann gewichtet Lernly genau das, was
                wahrscheinlich drankommt. Danach wirfst du dein Material rein.
              </p>

              <NewExamForm
                embedded
                onCreated={onExamCreated}
                onCancel={() => skip("exam")}
              />

              <button
                type="button"
                onClick={() => skip("exam")}
                disabled={pending}
                className="mt-4 w-full text-center text-[13px] transition hover:text-white disabled:opacity-50"
                style={{ color: "var(--color-text-faint)" }}
              >
                Überspringen — direkt zum Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
