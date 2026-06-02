"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  attachPastExamToExam,
  createExam,
} from "@/app/dashboard/actions";
import { EXAM_COLORS, examRgba } from "@/lib/exams";
import { STUDY_UPLOADS_BUCKET, buildUploadPath } from "@/lib/uploads";
import { Plus, Target } from "lucide-react";
import { PrimaryCTAButton } from "@/components/ui/PrimaryCTA";

type StudyPath = "A" | "B" | "C";
type Fidelity = "strict" | "likely" | "broad";

const FIDELITY_OPTIONS: { value: Fidelity; label: string; sub: string }[] = [
  {
    value: "strict",
    label: "Nah an meiner Altklausur",
    sub: "Eng am Profil & den Hinweisen — wenn du der Altklausur traust.",
  },
  {
    value: "likely",
    label: "Was wahrscheinlich drankommt",
    sub: "Profil + angrenzende Themen. Sicherer Mittelweg.",
  },
  {
    value: "broad",
    label: "Sicher ist sicher — breiter",
    sub: "Breite Abdeckung, Profil nur als leichte Priorisierung.",
  },
];

type Props = {
  // When embedded inside another flow (e.g. /dashboard/new's Klausur picker),
  // skip the toggle button — the parent owns visibility — and report back the
  // newly created exam via `onCreated` so the parent can wire up its own
  // follow-up (set examId, close the inline reveal, refresh choices).
  embedded?: boolean;
  onCreated?: (exam: { id: string; title: string; hasPastExam?: boolean }) => void;
  onCancel?: () => void;
};

export default function NewExamForm({ embedded, onCreated, onCancel: onParentCancel }: Props = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [color, setColor] = useState<string>("cyan");
  const [path, setPath] = useState<StudyPath>("B");
  const [pastExamFile, setPastExamFile] = useState<File | null>(null);
  const [hints, setHints] = useState("");
  const [fidelity, setFidelity] = useState<Fidelity>("likely");
  const [topicsList, setTopicsList] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setTitle("");
    setExamDate("");
    setColor("cyan");
    setPath("B");
    setPastExamFile(null);
    setHints("");
    setFidelity("likely");
    setTopicsList("");
    setError(null);
    setBusyLabel(null);
  };

  const onCancel = () => {
    reset();
    if (embedded) {
      onParentCancel?.();
    } else {
      setOpen(false);
    }
  };

  const onSubmit = () => {
    if (!title.trim()) {
      setError("Titel darf nicht leer sein.");
      return;
    }
    if (path === "C" && !topicsList.trim()) {
      setError("Schreib kurz, welche Themen du drillen willst.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        // 1) Create the exam with whatever metadata fits this path.
        setBusyLabel("Speichere Klausur…");
        const finalHints =
          path === "A"
            ? hints.trim() || null
            : path === "C"
              ? `Fokus-Themen für diese Klausur:\n${topicsList.trim()}`
              : null;
        const { id } = await createExam({
          title: title.trim(),
          exam_date: examDate || null,
          color,
          instructor_hints: finalHints,
          fidelity: path === "A" ? fidelity : "likely",
        });

        // 2) Path A with a file: upload Altklausur to Storage, then run the
        //    server action that extracts + analyses + persists the profile.
        if (path === "A" && pastExamFile) {
          setBusyLabel("Lade Altklausur hoch…");
          const { createClient } = await import("@/lib/supabase/browser");
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("Nicht angemeldet.");
          const storagePath = buildUploadPath(user.id, pastExamFile.name);
          const { error: upErr } = await supabase.storage
            .from(STUDY_UPLOADS_BUCKET)
            .upload(storagePath, pastExamFile, {
              contentType: pastExamFile.type || "application/octet-stream",
              upsert: false,
            });
          if (upErr) {
            throw new Error(`Upload fehlgeschlagen: ${upErr.message}`);
          }

          setBusyLabel("Analysiere Altklausur (~30s)…");
          const result = await attachPastExamToExam({
            examId: id,
            storagePath,
            filename: pastExamFile.name,
          });
          if (!result.ok) {
            // Analysis failed but exam + reference saved. Surface a soft
            // warning via toast that names the reason and points at a
            // realistic retry path — re-upload a clearer/text-rich Altklausur
            // by recreating the Klausur. (A retry button on the exam card
            // would be nicer; tracked for V2.)
            const { toast } = await import("sonner");
            const reason = result.reason ?? "unbekannt";
            toast.warning(
              `Analyse der Altklausur fehlgeschlagen (${reason}) — Klausur gespeichert, aber Pakete laufen ohne Lens-Brief. Tipp: Klausur in der Bibliothek löschen und mit einer text-reichen, gut lesbaren PDF erneut anlegen.`,
              { duration: 10000 },
            );
          } else {
            const { toast } = await import("sonner");
            toast.success("Altklausur analysiert ✓", { duration: 4000 });
          }
        }

        const createdTitle = title.trim();
        const attachedPastExam = path === "A" && Boolean(pastExamFile);
        reset();
        if (embedded) {
          onCreated?.({ id, title: createdTitle, hasPastExam: attachedPastExam });
        } else {
          setOpen(false);
          router.refresh();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Konnte nicht speichern.");
        setBusyLabel(null);
      }
    });
  };

  // When embedded inside another flow, the parent controls visibility — skip
  // the standalone toggle button and always render the form.
  if (!embedded && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition hover:text-white"
        style={{
          borderColor: "rgba(255,255,255,0.10)",
          color: "var(--color-text-dim)",
        }}
      >
        <Plus size={14} strokeWidth={2} aria-hidden />
        Neue Klausur
      </button>
    );
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setPastExamFile(f);
  };

  return (
    <div
      className="border"
      style={{
        background: "#141930",
        borderColor: "rgba(255,255,255,0.06)",
        borderRadius: "16px",
        padding: "20px",
      }}
    >
      {/* Title + date row */}
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <div>
          <label
            className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Titel
          </label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z. B. Global Strategic Management"
            className="w-full rounded-xl border px-3 py-2 text-[14px] text-white outline-none transition focus:border-white/40"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.14)",
            }}
          />
        </div>
        <div>
          <label
            className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Datum (optional)
          </label>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 text-[14px] text-white outline-none transition focus:border-white/40"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.14)",
              colorScheme: "dark",
            }}
          />
        </div>
      </div>

      {/* Color */}
      <div className="mt-3">
        <div
          className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Farbe
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EXAM_COLORS.map((c) => {
            const selected = color === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                aria-pressed={selected}
                className="h-7 w-7 rounded-full border-2 transition"
                style={{
                  background: examRgba(c, 0.85),
                  borderColor: selected ? "white" : "rgba(255,255,255,0.15)",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* 3-path branch */}
      <div className="mt-5">
        <div
          className="mb-2 text-[13px] font-semibold text-white"
        >
          Wie lernst du für diese Klausur?
        </div>
        <div className="space-y-2">
          <PathRow
            value="A"
            current={path}
            onSelect={setPath}
            title="Ich hab eine Altklausur oder weiß, was drankommt"
            sub="Lade die Altklausur hoch, gib Prof-Hinweise — der Lens macht den Rest."
            badge="Beste Ergebnisse"
          />
          <PathRow
            value="B"
            current={path}
            onSelect={setPath}
            title="Ich will einfach den Stoff verstehen"
            sub="Balancierte Abdeckung — ein Klick, los geht's."
          />
          <PathRow
            value="C"
            current={path}
            onSelect={setPath}
            title="Ich lern nur einzelne Themen"
            sub="Drill nur die Themen, die du angibst."
          />
        </div>
      </div>

      {/* Path A — past exam upload + hints + fidelity */}
      {path === "A" && (
        <div className="mt-4 space-y-3">
          <div>
            <label
              className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Altklausur (PDF / TXT / MD)
            </label>
            <input
              type="file"
              accept=".pdf,.txt,.md,.markdown"
              onChange={onFile}
              className="block w-full rounded-xl border px-3 py-2 text-[12.5px] text-white/80 outline-none file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-[12px] file:font-semibold file:text-white hover:file:bg-white/15"
              style={{
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.14)",
              }}
            />
            {pastExamFile && (
              <p
                className="mt-1 text-[11.5px]"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                {pastExamFile.name} · {(pastExamFile.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>
          <div>
            <label
              className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Hinweise vom Prof (optional)
            </label>
            <textarea
              value={hints}
              onChange={(e) => setHints(e.target.value)}
              rows={3}
              placeholder='z. B. "Kapitel 5 ist Schwerpunkt. Mündlich keine Berechnungen — dafür viele Definitionen."'
              className="w-full rounded-xl border px-3 py-2 text-[13px] text-white outline-none transition focus:border-white/40"
              style={{
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.14)",
              }}
            />
          </div>
          <div>
            <div
              className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Wie eng am Altklausur-Stoff?
            </div>
            <div className="space-y-1.5">
              {FIDELITY_OPTIONS.map((opt) => {
                const sel = fidelity === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFidelity(opt.value)}
                    className="block w-full rounded-lg border px-3 py-2 text-left transition"
                    style={{
                      background: sel
                        ? "rgba(110, 128, 242, 0.10)"
                        : "#171C30",
                      borderColor: sel
                        ? "var(--color-primary-bright)"
                        : "rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="text-[13px] font-semibold text-white">
                      {opt.label}
                    </div>
                    <div
                      className="text-[11.5px] leading-snug"
                      style={{ color: "rgba(255,255,255,0.55)" }}
                    >
                      {opt.sub}
                    </div>
                  </button>
                );
              })}
            </div>
            <p
              className="mt-2 text-[11px] italic"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Schwerpunkt, keine Garantie — wir können nicht wissen, was genau drankommt.
            </p>
          </div>
        </div>
      )}

      {/* Path C — free-text topics */}
      {path === "C" && (
        <div className="mt-4">
          <label
            className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Welche Themen?
          </label>
          <textarea
            value={topicsList}
            onChange={(e) => setTopicsList(e.target.value)}
            rows={3}
            placeholder="z. B. Vertikale Integration, Porter's Five Forces, BCG-Matrix"
            className="w-full rounded-xl border px-3 py-2 text-[13px] text-white outline-none transition focus:border-white/40"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.14)",
            }}
          />
        </div>
      )}

      {error && (
        <p
          className="mt-3 text-[12.5px]"
          style={{ color: "rgba(255,170,170,0.95)" }}
        >
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-full border px-4 py-2 text-[13px] font-semibold transition hover:text-white disabled:opacity-50"
          style={{
            borderColor: "rgba(255,255,255,0.10)",
            color: "var(--color-text-dim)",
          }}
        >
          Abbrechen
        </button>
        <PrimaryCTAButton
          size="sm"
          onClick={onSubmit}
          disabled={pending || !title.trim()}
        >
          {pending ? (busyLabel ?? "Speichere…") : "Anlegen"}
        </PrimaryCTAButton>
      </div>
    </div>
  );
}

function PathRow({
  value,
  current,
  onSelect,
  title,
  sub,
  badge,
}: {
  value: StudyPath;
  current: StudyPath;
  onSelect: (p: StudyPath) => void;
  title: string;
  sub: string;
  badge?: string;
}) {
  const selected = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={selected}
      className="block w-full rounded-xl border px-3 py-2.5 text-left transition"
      style={{
        background: selected
          ? "rgba(110, 128, 242, 0.10)"
          : "#171C30",
        borderColor: selected
          ? "var(--color-primary-bright)"
          : "rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-white">{title}</div>
          <div
            className="mt-0.5 text-[11.5px] leading-snug"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {sub}
          </div>
        </div>
        {badge && (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
            style={{
              background: "rgba(79, 209, 165, 0.14)",
              color: "var(--color-cat-teal)",
              border: "1px solid rgba(79, 209, 165, 0.35)",
            }}
          >
            <Target size={10} strokeWidth={2.2} aria-hidden />
            {badge}
          </span>
        )}
      </div>
    </button>
  );
}
