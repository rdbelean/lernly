import Link from "next/link";
import { Plus } from "lucide-react";
import NewExamForm from "@/components/dashboard/NewExamForm";

// New-user state: one sentence and the first action, no empty graphs.
export default function ProgressEmptyState() {
  return (
    <div className="max-w-[560px] py-6">
      <h2
        className="m-0 text-[28px] font-medium leading-[1.12] sm:text-[36px]"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-text)", letterSpacing: "-0.02em" }}
      >
        Bereit für die nächste Klausur?
      </h2>
      <p className="mb-6 mt-3 text-[15px]" style={{ color: "var(--color-text-dim)" }}>
        Leg deine Klausur an und lad rein, was du können musst. Jedes Paket
        landet unter der Klausur — du verlierst nichts mehr.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <NewExamForm />
        <Link
          href="/dashboard/new"
          className="inline-flex items-center gap-1.5 rounded-[10px] border px-4 py-2.5 text-[14px] font-medium"
          style={{ borderColor: "var(--color-line)", color: "var(--color-text)", background: "var(--color-surface)" }}
        >
          <Plus size={15} strokeWidth={2} aria-hidden />
          Paket erstellen
        </Link>
      </div>
    </div>
  );
}
