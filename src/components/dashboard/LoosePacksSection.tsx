"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignPackToExam } from "@/app/dashboard/actions";

type Pack = {
  id: string;
  title: string;
  exam_type: string;
  created_at: string;
  card_count: number;
};

type Exam = { id: string; title: string };

export default function LoosePacksSection({
  packs,
  exams,
}: {
  packs: Pack[];
  exams: Exam[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onAssign = (packId: string, examId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await assignPackToExam({ packId, examId: examId || null });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Konnte nicht speichern.");
      }
    });
  };

  return (
    <section className="mt-10">
      <h2
        className="mb-3 text-[12px] uppercase tracking-[0.22em]"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        Nicht zugeordnet ({packs.length})
      </h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {packs.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2.5"
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
            {exams.length > 0 && (
              <select
                defaultValue=""
                disabled={pending}
                onChange={(e) => onAssign(p.id, e.target.value)}
                aria-label="Klausur zuweisen"
                className="appearance-none rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[12px] text-white outline-none transition focus:border-white/40"
              >
                <option value="" disabled>
                  → Klausur zuweisen
                </option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title}
                  </option>
                ))}
              </select>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p
          className="mt-2 text-[12px]"
          style={{ color: "rgba(255,170,170,0.95)" }}
        >
          {error}
        </p>
      )}
    </section>
  );
}
