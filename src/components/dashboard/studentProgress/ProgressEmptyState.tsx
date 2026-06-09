import { Plus } from "lucide-react";
import LernlyLogo from "@/components/LernlyLogo";
import NewExamForm from "@/components/dashboard/NewExamForm";

// New-user state — motivating, emoji-free (real Lernly logo + lucide icon),
// instead of empty graphs. Used both atop the dashboard and as the library's
// empty state.
export default function ProgressEmptyState() {
  return (
    <div
      className="relative overflow-hidden px-6 py-12 text-center sm:px-8 sm:py-14"
      style={{
        background: "#141930",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "16px",
      }}
    >
      <div
        aria-hidden
        className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto flex max-w-[480px] flex-col items-center gap-5">
        <LernlyLogo variant="icon" size={60} alt="" />
        <div>
          <h2
            className="text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "26px",
              fontWeight: 700,
              letterSpacing: "-0.4px",
            }}
          >
            Bereit für die nächste Klausur?
          </h2>
          <p className="mt-2 text-[14px]" style={{ color: "rgba(255,255,255,0.62)" }}>
            Leg deine Klausur an und lad rein, was du können musst. Jedes Paket
            landet unter der Klausur — du verlierst nichts mehr.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <NewExamForm />
          <a
            href="/dashboard/new"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-5 py-2.5 text-[14px] font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
          >
            <Plus size={15} strokeWidth={2} aria-hidden />
            Paket erstellen
          </a>
        </div>
      </div>
    </div>
  );
}
