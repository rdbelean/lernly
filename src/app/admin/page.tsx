import { notFound } from "next/navigation";
import {
  Users,
  UserCheck,
  FileStack,
  MessageSquare,
  CreditCard,
  Zap,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getUser } from "@/lib/dal";
import { createServiceClient } from "@/lib/supabase/server";
import { isFounder } from "@/lib/admin/auth";
import { getAdminMetrics } from "@/lib/admin/metrics";
import MetricCard from "@/components/admin/MetricCard";
import AdminAutoRefresh from "@/components/admin/AdminAutoRefresh";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXAM_LABEL: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  essay: "Essay",
  open_questions: "Offene Fragen",
  oral: "Mündlich",
  open_book: "Open Book",
  unknown: "Unbekannt",
};

const LINKS: { label: string; href: string }[] = [
  { label: "PostHog", href: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.posthog.com" },
  { label: "Vercel", href: "https://vercel.com/rdbeleans-projects/lernly" },
  { label: "Sentry", href: "https://sentry.io/" },
  { label: "Anthropic", href: "https://console.anthropic.com/" },
  { label: "Supabase", href: "https://supabase.com/dashboard/project/ickucmnxschbbfpvsrze" },
];

export default async function AdminPage() {
  const user = await getUser();
  if (!user || !isFounder(user.email)) {
    notFound();
  }

  const metrics = await getAdminMetrics(createServiceClient());
  const cramHealthy = metrics.cram.failed === 0 && metrics.cram.stuck === 0;
  const examEntries = Object.entries(metrics.packs.byExamType).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1
          className="text-[26px] font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}
        >
          Lernly — Ops
        </h1>
        <AdminAutoRefresh />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard
          label="Nutzer gesamt"
          value={metrics.users.total}
          sub={`+${metrics.users.today} heute · +${metrics.users.last7d} (7T) · +${metrics.users.last30d} (30T)`}
          icon={Users}
        />
        <MetricCard
          label="Aktiv (24h)"
          value={metrics.active.last24h}
          sub={`${metrics.active.last7d} in 7 Tagen`}
          icon={UserCheck}
        />
        <MetricCard
          label="Pakete heute"
          value={metrics.packs.today}
          sub={`${metrics.packs.total} gesamt`}
          icon={FileStack}
        />
        <MetricCard
          label="Tutor-Nachrichten"
          value={metrics.tutorMessagesThisMonth}
          sub="diesen Monat"
          icon={MessageSquare}
        />
        <MetricCard label="Plan: Free" value={metrics.planSplit.free} icon={Users} />
        <MetricCard label="Plan: Pro" value={metrics.planSplit.pro} icon={CreditCard} />
        <MetricCard label="Plan: Team" value={metrics.planSplit.team} icon={CreditCard} />
        <MetricCard
          label="Cram-Jobs"
          value={metrics.cram.total}
          sub={
            cramHealthy
              ? "keine Fehler"
              : `${metrics.cram.failed} fehlgeschlagen · ${metrics.cram.stuck} hängen`
          }
          tone={cramHealthy ? "good" : "warn"}
          icon={Zap}
        />
      </div>

      {examEntries.length > 0 && (
        <div
          className="mt-6 rounded-2xl border p-5"
          style={{ background: "#141930", borderColor: "rgba(255,255,255,0.06)" }}
        >
          <p
            className="mb-3 text-[11px] uppercase tracking-[0.16em]"
            style={{ color: "var(--color-text-faint)" }}
          >
            Pakete nach Prüfungsformat
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {examEntries.map(([type, n]) => (
              <span key={type} className="text-[14px]" style={{ color: "var(--color-text-dim)" }}>
                <span style={{ color: "var(--color-text)", fontWeight: 600 }}>{n}</span>{" "}
                {EXAM_LABEL[type] ?? type}
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        className="mt-6 rounded-2xl border p-5"
        style={{ background: "#141930", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          {cramHealthy ? (
            <CheckCircle2 size={16} strokeWidth={1.9} color="var(--color-cat-teal)" aria-hidden />
          ) : (
            <AlertTriangle size={16} strokeWidth={1.9} color="var(--color-cat-coral)" aria-hidden />
          )}
          <span className="text-[14px]" style={{ color: "var(--color-text)" }}>
            {cramHealthy
              ? "Cram: keine Fehler"
              : `Cram: ${metrics.cram.failed} fehlgeschlagen, ${metrics.cram.stuck} hängen`}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition hover:text-white"
              style={{ background: "var(--color-surface-2)", color: "var(--color-text-dim)" }}
            >
              {l.label}
              <ExternalLink size={12} strokeWidth={1.9} aria-hidden />
            </a>
          ))}
        </div>

        <p className="mt-3 text-[12px]" style={{ color: "var(--color-text-faint)" }}>
          Echtzeit &bdquo;wer ist online&ldquo; &rarr; PostHog. Diese Seite zeigt
          Zahlen, Wachstum und Health aus der eigenen DB.
        </p>
      </div>
    </main>
  );
}
