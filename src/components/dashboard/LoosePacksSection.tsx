"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignPackToExam } from "@/app/dashboard/actions";
import { ChevronDown } from "lucide-react";

type Pack = {
  id: string;
  title: string;
  exam_type: string;
  created_at: string;
  card_count: number;
};

type Exam = { id: string; title: string };

const COLLAPSED_LIMIT = 4;

// =========================================================================
// LoosePacksSection — packs the user hasn't assigned to a Klausur yet.
// Secondary surface: lower contrast, quieter rows, collapsed by default
// so they don't visually compete with the primary exam cards above.
// =========================================================================

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
  const [expanded, setExpanded] = useState(false);

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

  const visible = expanded ? packs : packs.slice(0, COLLAPSED_LIMIT);
  const hidden = packs.length - visible.length;

  return (
    <section>
      <h2
        className="mb-3 text-[11px] uppercase tracking-[0.22em]"
        style={{ color: "var(--color-text-faint)" }}
      >
        Nicht zugeordnet ({packs.length})
      </h2>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {visible.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-3 px-3 py-2"
            style={{
              background: "rgba(20, 25, 48, 0.5)",
              border: "1px solid rgba(255,255,255,0.04)",
              borderRadius: "10px",
            }}
          >
            <a href={`/dashboard/pack/${p.id}`} className="min-w-0 flex-1">
              <div
                className="truncate text-[13px] font-medium"
                style={{ color: "var(--color-text-dim)" }}
              >
                {p.title}
              </div>
              <div
                className="text-[11px]"
                style={{ color: "var(--color-text-faint)" }}
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
                className="appearance-none rounded-md border px-2 py-1 text-[11px] outline-none transition"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(255,255,255,0.08)",
                  color: "var(--color-text-dim)",
                }}
              >
                <option value="" disabled>
                  → zuweisen
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
      {hidden > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-[12px] underline-offset-2 hover:underline"
          style={{ color: "var(--color-text-dim)" }}
        >
          Alle {packs.length} anzeigen
          <ChevronDown size={12} strokeWidth={2} aria-hidden />
        </button>
      )}
      {error && (
        <p
          className="mt-2 text-[12px]"
          style={{ color: "var(--color-cat-coral)" }}
        >
          {error}
        </p>
      )}
    </section>
  );
}
