"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExam } from "@/app/dashboard/actions";
import { EXAM_COLORS, examRgba } from "@/lib/exams";

export default function NewExamForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [color, setColor] = useState<string>("cyan");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setTitle("");
    setExamDate("");
    setColor("cyan");
    setError(null);
  };

  const onCancel = () => {
    reset();
    setOpen(false);
  };

  const onSubmit = () => {
    if (!title.trim()) {
      setError("Titel darf nicht leer sein.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createExam({
          title: title.trim(),
          exam_date: examDate || null,
          color,
        });
        reset();
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Konnte nicht speichern.");
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[13px] font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
      >
        ✦ Neue Klausur
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl border p-4 sm:p-5"
      style={{
        background: "rgba(20,22,28,0.6)",
        borderColor: "rgba(255,255,255,0.14)",
      }}
    >
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
          className="rounded-full border border-white/15 px-4 py-2 text-[13px] font-semibold text-white/70 transition hover:text-white disabled:opacity-50"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={pending || !title.trim()}
          className="rounded-full bg-white px-5 py-2 text-[13px] font-bold text-[#0F1535] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Speichere…" : "Anlegen"}
        </button>
      </div>
    </div>
  );
}
