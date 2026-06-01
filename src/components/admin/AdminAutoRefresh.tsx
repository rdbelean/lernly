"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

// Re-runs the server component's queries every 60s via router.refresh(), plus a
// manual Reload button and a "last updated" clock. No data flows through here —
// it just triggers a server re-render, so no secrets are exposed client-side.
export default function AdminAutoRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [updated, setUpdated] = useState<string>("");

  const stamp = () => setUpdated(new Date().toLocaleTimeString("de-DE"));

  // Initial stamp on mount.
  useEffect(() => {
    stamp();
  }, []);

  // Auto-refresh every 60s.
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
      stamp();
    }, 60_000);
    return () => clearInterval(id);
  }, [router]);

  const reload = () => {
    startTransition(() => router.refresh());
    stamp();
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px]" style={{ color: "var(--color-text-faint)" }}>
        Aktualisiert: {updated || "…"}
      </span>
      <button
        type="button"
        onClick={reload}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition disabled:opacity-50"
        style={{ background: "var(--color-surface-2)", color: "var(--color-text)" }}
      >
        <RefreshCw size={13} strokeWidth={1.9} aria-hidden />
        {pending ? "Lädt…" : "Neu laden"}
      </button>
    </div>
  );
}
