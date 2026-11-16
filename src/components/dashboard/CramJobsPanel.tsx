"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { parseJsonResponse } from "@/lib/safeJson";

type Chunk = { id: string; label: string | null; status: string };
type Job = {
  id: string;
  status: string;
  total: number;
  done: number;
  failed: number;
  createdAt: string;
  chunks: Chunk[];
};

const POLL_MS = 4000;

function jobActive(j: Job): boolean {
  return j.status === "queued" || j.status === "processing";
}

export default function CramJobsPanel() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/cram/status", { cache: "no-store" });
      const json = await parseJsonResponse<{ jobs?: Job[] }>(res);
      setJobs(json.jobs ?? []);
    } catch {
      /* transient — keep last state, try again next tick */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  // Poll only while at least one job is active; stop otherwise.
  useEffect(() => {
    const anyActive = jobs.some(jobActive);
    if (anyActive && !timer.current) {
      timer.current = setInterval(() => void load(), POLL_MS);
    } else if (!anyActive && timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [jobs, load]);

  const retry = async (packId: string) => {
    try {
      await fetch("/api/cram/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      void load();
    } catch {
      /* ignore; next poll reflects state */
    }
  };

  if (!loaded || jobs.length === 0) return null;

  return (
    <div className="mb-10 flex flex-col gap-4">
      {jobs.map((job) => {
        const active = jobActive(job);
        return (
          <div
            key={job.id}
            className="overflow-hidden"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-ink-a06)",
              borderRadius: "16px",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-[color:var(--color-text)]">
                {active && (
                  <span
                    className="inline-block h-3 w-3 animate-spin rounded-full"
                    style={{ border: "2px solid var(--color-ink-a14)", borderTopColor: "var(--color-primary)" }}
                    aria-hidden
                  />
                )}
                <span>Cram-Paket</span>
              </div>
              <div className="text-[13px]" style={{ color: "var(--color-text-dim)" }}>
                {job.done} von {job.total} fertig
                {job.failed > 0 && (
                  <span style={{ color: "var(--color-urgent-ink)" }}> · {job.failed} fehlgeschlagen</span>
                )}
              </div>
            </div>
            <ul className="divide-y divide-[color:var(--color-line)] border-t border-[color:var(--color-line)]">
              {job.chunks.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13.5px]">
                  <span className="min-w-0 truncate text-[color:var(--color-text-dim)]">{c.label ?? "Paket"}</span>
                  {c.status === "ready" ? (
                    <Link href={`/dashboard/pack/${c.id}`} className="shrink-0 font-semibold text-[color:var(--color-text)] underline-offset-2 hover:underline">
                      Öffnen →
                    </Link>
                  ) : c.status === "failed" ? (
                    <button
                      type="button"
                      onClick={() => retry(c.id)}
                      className="shrink-0 rounded-full border border-[color:var(--color-ink-a14)] px-3 py-1 text-[12px] font-medium text-[color:var(--color-text)] hover:bg-[color:var(--color-ink-a10)]"
                    >
                      Erneut versuchen
                    </button>
                  ) : (
                    <span className="shrink-0" style={{ color: "var(--color-text-faint)" }}>
                      wird erstellt …
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
