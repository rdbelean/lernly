"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignPackToExam,
  deleteExam,
  updateExam,
} from "@/app/dashboard/actions";
import {
  EXAM_COLORS,
  countdownInfo,
  examRgba,
  formatExamDate,
} from "@/lib/exams";
import { ArrowRight, Clock, Plus, Sparkles } from "lucide-react";
import { PrimaryCTALink } from "@/components/ui/PrimaryCTA";

type Pack = {
  id: string;
  title: string;
  exam_type: string;
  created_at: string;
  card_count: number;
  exam_id: string | null;
  last_opened_at: string | null;
};

type Exam = {
  id: string;
  title: string;
  exam_date: string | null;
  color: string | null;
};

function lastTouchedAt(p: Pack): number {
  const a = p.last_opened_at ? new Date(p.last_opened_at).getTime() : 0;
  const b = p.created_at ? new Date(p.created_at).getTime() : 0;
  return Math.max(a, b);
}

// Most-recently-studied pack within this exam. Sort by last_opened_at desc,
// falling back to created_at — the "dumb and simple" pick the user asked for.
function pickContinue(packs: Pack[]): Pack | null {
  if (packs.length === 0) return null;
  return [...packs].sort((a, b) => lastTouchedAt(b) - lastTouchedAt(a))[0];
}

export default function ExamCard({
  exam,
  packs,
}: {
  exam: Exam;
  packs: Pack[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [colorMenu, setColorMenu] = useState(false);
  const [titleDraft, setTitleDraft] = useState(exam.title);
  const [dateDraft, setDateDraft] = useState(exam.exam_date ?? "");
  const [error, setError] = useState<string | null>(null);

  const countdown = countdownInfo(exam.exam_date);
  const cont = pickContinue(packs);

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Konnte nicht speichern.");
      }
    });

  const saveTitle = () => {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setTitleDraft(exam.title);
      setEditingTitle(false);
      return;
    }
    if (trimmed === exam.title) {
      setEditingTitle(false);
      return;
    }
    run(async () => {
      await updateExam({ id: exam.id, title: trimmed });
      setEditingTitle(false);
    });
  };

  const saveDate = () => {
    const next = dateDraft || null;
    if (next === (exam.exam_date ?? null)) {
      setEditingDate(false);
      return;
    }
    run(async () => {
      await updateExam({ id: exam.id, exam_date: next });
      setEditingDate(false);
    });
  };

  const saveColor = (c: string) => {
    setColorMenu(false);
    if (c === exam.color) return;
    run(async () => {
      await updateExam({ id: exam.id, color: c });
    });
  };

  const onDelete = () => {
    if (
      !confirm(
        `Klausur "${exam.title}" wirklich löschen?\n\nDie zugeordneten Pakete bleiben erhalten und landen unter „Nicht zugeordnet".`,
      )
    ) {
      return;
    }
    run(() => deleteExam(exam.id));
  };

  const onUnassign = (packId: string) => {
    run(() => assignPackToExam({ packId, examId: null }));
  };

  return (
    <article
      className="relative overflow-hidden border"
      style={{
        background: "#141930",
        borderColor: "rgba(255,255,255,0.06)",
        borderRadius: "16px",
      }}
    >
      <div className="p-5 sm:p-6">
        {/* Header row: color dot · title · ⋯ */}
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setColorMenu((v) => !v)}
            aria-label="Farbe ändern"
            className="relative mt-1 h-3 w-3 shrink-0 rounded-full border border-white/20"
            style={{ background: examRgba(exam.color, 0.9) }}
          />
          <div className="min-w-0 flex-1">
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") {
                    setTitleDraft(exam.title);
                    setEditingTitle(false);
                  }
                }}
                disabled={pending}
                className="w-full rounded-md border bg-transparent px-1.5 py-0.5 text-[17px] font-bold leading-tight text-white outline-none"
                style={{ borderColor: examRgba(exam.color, 0.5) }}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTitleDraft(exam.title);
                  setEditingTitle(true);
                }}
                className="w-full rounded-md px-0 py-0 text-left text-[17px] font-bold leading-tight text-white transition hover:text-white"
                title="Umbenennen"
              >
                {exam.title}
              </button>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
              {editingDate ? (
                <input
                  autoFocus
                  type="date"
                  value={dateDraft}
                  onChange={(e) => setDateDraft(e.target.value)}
                  onBlur={saveDate}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveDate();
                    if (e.key === "Escape") {
                      setDateDraft(exam.exam_date ?? "");
                      setEditingDate(false);
                    }
                  }}
                  disabled={pending}
                  className="rounded-md border bg-transparent px-1.5 py-0.5 text-[12px] text-white outline-none"
                  style={{
                    borderColor: examRgba(exam.color, 0.5),
                    colorScheme: "dark",
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDateDraft(exam.exam_date ?? "");
                    setEditingDate(true);
                  }}
                  className="rounded-md text-white/55 transition hover:text-white/85"
                  title="Datum ändern"
                >
                  {formatExamDate(exam.exam_date)}
                </button>
              )}
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]"
                style={{
                  background:
                    countdown.tone === "past" || countdown.tone === "undated"
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(242, 163, 60, 0.14)",
                  color:
                    countdown.tone === "past" || countdown.tone === "undated"
                      ? "var(--color-text-faint)"
                      : "var(--color-amber)",
                }}
              >
                <Clock size={10} strokeWidth={2.2} aria-hidden />
                {countdown.label}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            aria-label="Klausur löschen"
            title="Löschen"
            className="rounded-full p-1.5 text-white/40 transition hover:bg-white/5 hover:text-rose-300"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>

        {/* Color swatch picker (toggle from the dot) */}
        {colorMenu && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXAM_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => saveColor(c)}
                aria-label={c}
                className="h-6 w-6 rounded-full border-2 transition"
                style={{
                  background: examRgba(c, 0.85),
                  borderColor: exam.color === c ? "white" : "rgba(255,255,255,0.15)",
                }}
              />
            ))}
          </div>
        )}

        {/* Packs */}
        <div className="mt-4">
          {packs.length === 0 ? (
            <p
              className="rounded-lg border border-dashed px-3 py-3 text-[12.5px]"
              style={{
                borderColor: "rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.55)",
              }}
            >
              Noch keine Pakete zugeordnet.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {packs.map((p) => (
                <li
                  key={p.id}
                  className="group flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-black/15 px-3 py-2 transition hover:border-white/20"
                >
                  <a
                    href={`/dashboard/pack/${p.id}`}
                    className="min-w-0 flex-1"
                  >
                    <div className="truncate text-[13.5px] font-semibold text-white">
                      {p.title}
                    </div>
                    <div
                      className="text-[11px]"
                      style={{ color: "rgba(255,255,255,0.45)" }}
                    >
                      {p.card_count} Karten
                    </div>
                  </a>
                  <button
                    type="button"
                    onClick={() => onUnassign(p.id)}
                    disabled={pending}
                    aria-label="Aus dieser Klausur entfernen"
                    title="Aus Klausur entfernen"
                    className="opacity-0 transition group-hover:opacity-100 text-white/40 hover:text-white"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* CTAs */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {cont ? (
            <PrimaryCTALink
              size="sm"
              href={`/dashboard/pack/${cont.id}`}
              leadingIcon={Sparkles}
              trailingIcon={ArrowRight}
            >
              Weiterlernen
            </PrimaryCTALink>
          ) : (
            <PrimaryCTALink
              size="sm"
              href={`/dashboard/new?exam=${exam.id}`}
              leadingIcon={Plus}
            >
              Erstes Paket hochladen
            </PrimaryCTALink>
          )}
          {cont && (
            <a
              href={`/dashboard/new?exam=${exam.id}`}
              className="inline-flex items-center gap-1 text-[12.5px] transition"
              style={{ color: "var(--color-text-dim)" }}
            >
              <Plus size={12} strokeWidth={2} aria-hidden />
              Paket hinzufügen
            </a>
          )}
        </div>

        {error && (
          <p
            className="mt-3 text-[12px]"
            style={{ color: "rgba(255,170,170,0.95)" }}
          >
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
