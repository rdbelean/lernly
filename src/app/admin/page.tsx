import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  Users,
  UserCheck,
  FileStack,
  MessageSquare,
  CreditCard,
  Percent,
  Repeat,
  Coins,
  Banknote,
  Wallet,
  CircleDollarSign,
  ServerCog,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getUser } from "@/lib/dal";
import { createServiceClient } from "@/lib/supabase/server";
import { isFounder } from "@/lib/admin/auth";
import { getAdminMetrics } from "@/lib/admin/metrics";
import { getStripeMoney } from "@/lib/admin/stripeMetrics";
import { momTrend } from "@/lib/admin/stripeMetricsShared";
import MetricCard from "@/components/admin/MetricCard";
import MoneyCard, { formatEur } from "@/components/admin/MoneyCard";
import ChartCard from "@/components/admin/ChartCard";
import {
  LineAreaChart,
  DonutChart,
  BarChart,
  FunnelChart,
} from "@/components/admin/charts/Charts";
import AdminAutoRefresh from "@/components/admin/AdminAutoRefresh";
import type { SeriesPoint } from "@/components/admin/charts/ChartTypes";
import type { DayPoint } from "@/lib/admin/metricsShared";

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

const POSTHOG = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.posthog.com";

const LINKS: { label: string; href: string }[] = [
  { label: "PostHog", href: POSTHOG },
  { label: "Vercel", href: "https://vercel.com/rdbeleans-projects/lernly" },
  { label: "Sentry", href: "https://sentry.io/" },
  { label: "Anthropic", href: "https://console.anthropic.com/usage" },
  { label: "Supabase", href: "https://supabase.com/dashboard/project/ickucmnxschbbfpvsrze" },
];

const toSeries = (pts: DayPoint[]): SeriesPoint[] =>
  pts.map((p) => ({ x: p.day, y: p.value }));

function SectionLabel({ children, first }: { children: ReactNode; first?: boolean }) {
  return (
    <h2
      className={`${first ? "mt-1" : "mt-10"} mb-3 text-[12px] font-semibold uppercase tracking-[0.18em]`}
      style={{ color: "var(--color-text-faint)", fontFamily: "var(--font-display)" }}
    >
      {children}
    </h2>
  );
}

export default async function AdminPage() {
  const user = await getUser();
  if (!user || !isFounder(user.email)) {
    notFound();
  }

  const now = new Date();
  const [metrics, money] = await Promise.all([
    getAdminMetrics(createServiceClient()),
    getStripeMoney(now),
  ]);

  const cur = money.currency;
  const off = !money.available;
  const monthTrend = momTrend(
    money.revenueThisMonthCents,
    money.revenueLastMonthCents,
  );
  const conversionPct = (metrics.paying.conversionRate * 100).toFixed(1);

  const cramHealthy = metrics.cram.failed === 0 && metrics.cram.stuck === 0;

  const examBars = Object.entries(metrics.packs.byExamType)
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => ({ label: EXAM_LABEL[type] ?? type, value: n }));

  const planDonut = [
    { label: "Free", value: metrics.planSplit.free, color: "var(--color-text-faint)" },
    { label: "Einzelklausur", value: metrics.planSplit.einzelklausur, color: "var(--color-cat-coral)" },
    { label: "Semester", value: metrics.planSplit.semester, color: "var(--color-cat-teal)" },
    { label: "Monatlich", value: metrics.planSplit.monthly, color: "var(--color-cat-blue)" },
  ];

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1
          className="text-[26px] font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}
        >
          Lernly — Ops
        </h1>
        <AdminAutoRefresh />
      </div>

      {/* ============================== GELD ============================== */}
      <SectionLabel first>Geld</SectionLabel>
      {off && (
        <p className="mb-3 text-[12.5px]" style={{ color: "var(--color-amber)" }}>
          Stripe nicht verbunden — Geld-Zahlen erscheinen, sobald STRIPE_SECRET_KEY gesetzt ist.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MoneyCard
          label="MRR"
          valueCents={money.mrrCents}
          currency={cur}
          unavailable={off}
          accent
          icon={Repeat}
          sub={
            money.netNewMrrThisMonthCents > 0
              ? `+${formatEur(money.netNewMrrThisMonthCents, cur)} /Mo neu diesen Monat`
              : "monatlich wiederkehrend"
          }
        />
        <MoneyCard
          label="Umsatz heute"
          valueCents={money.revenueTodayCents}
          currency={cur}
          unavailable={off}
          icon={Coins}
        />
        <MoneyCard
          label="Umsatz Monat"
          valueCents={money.revenueThisMonthCents}
          currency={cur}
          unavailable={off}
          icon={Banknote}
          trend={monthTrend}
          trendLabel="vs. Vormonat"
        />
        <MoneyCard
          label="Umsatz gesamt"
          valueCents={money.revenueTotalCents}
          currency={cur}
          unavailable={off}
          icon={Wallet}
        />
        <MoneyCard
          label="ARR-äquiv."
          valueCents={money.arrCents}
          currency={cur}
          unavailable={off}
          icon={CircleDollarSign}
          sub="MRR × 12"
        />
        <MetricCard
          label="Zahlende Nutzer"
          value={metrics.paying.count}
          sub={`von ${metrics.users.total} registriert`}
          icon={CreditCard}
        />
        <MetricCard
          label="Conversion"
          value={`${conversionPct}%`}
          sub="zahlend / registriert"
          icon={Percent}
          tone={metrics.paying.count > 0 ? "good" : "neutral"}
        />
      </div>

      {/* ============================ NUTZUNG ============================ */}
      <SectionLabel>Nutzung</SectionLabel>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard
          label="Nutzer gesamt"
          value={metrics.users.total}
          sub={`+${metrics.users.today} heute · +${metrics.users.last7d} (7T) · +${metrics.users.last30d} (30T)`}
          icon={Users}
        />
        <MetricCard
          label="Aktiv (DAU)"
          value={metrics.active.last24h}
          sub={`WAU ${metrics.active.last7d} · MAU ${metrics.active.last30d}`}
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
      </div>

      {/* ============================= TRENDS ============================= */}
      <SectionLabel>Trends</SectionLabel>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Signups / Tag (30 T)">
          <LineAreaChart
            data={toSeries(metrics.signupsByDay)}
            variant="area"
            seriesName="Signups"
            ariaLabel="Neue Registrierungen pro Tag, letzte 30 Tage"
          />
        </ChartCard>

        <ChartCard title="Umsatz / Tag (90 T)" subtitle="aus Stripe-Zahlungen">
          <LineAreaChart
            data={toSeries(money.revenueByDay)}
            variant="line"
            color="var(--color-cat-teal)"
            format="eur"
            currency={cur}
            seriesName="Umsatz"
            ariaLabel="Umsatz pro Tag, letzte 90 Tage"
          />
        </ChartCard>

        <ChartCard title="Pakete / Tag (30 T)">
          <LineAreaChart
            data={toSeries(metrics.packsByDay)}
            variant="area"
            color="var(--color-cat-blue)"
            seriesName="Pakete"
            ariaLabel="Generierte Pakete pro Tag, letzte 30 Tage"
          />
        </ChartCard>

        <ChartCard title="Plan-Verteilung">
          <DonutChart
            data={planDonut}
            centerLabel={String(metrics.users.total)}
            centerSub="Nutzer"
            ariaLabel="Verteilung der Nutzer nach Plan"
          />
        </ChartCard>

        <ChartCard title="Pakete nach Format">
          <BarChart
            data={examBars}
            horizontal
            ariaLabel="Generierte Pakete nach Prüfungsformat"
          />
        </ChartCard>

        <ChartCard
          title="Conversion-Funnel"
          subtitle="Aktivierung (Landing → Upload → 1. Karte) live in PostHog"
          action={
            <a
              href={POSTHOG}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11.5px] transition hover:text-white"
              style={{ background: "var(--color-surface-2)", color: "var(--color-text-dim)" }}
            >
              Aktivierung
              <ExternalLink size={11} strokeWidth={1.9} aria-hidden />
            </a>
          }
        >
          <FunnelChart
            stages={[
              { label: "Registriert", value: metrics.users.total },
              { label: "Zahlend", value: metrics.paying.count },
            ]}
            ariaLabel="Conversion-Funnel von registriert zu zahlend"
          />
        </ChartCard>
      </div>

      {/* ============================ SYSTEM ============================= */}
      <SectionLabel>System &amp; Health</SectionLabel>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MetricCard
          label="Cram-Jobs"
          value={metrics.cram.total}
          sub={
            cramHealthy
              ? "keine Fehler"
              : `${metrics.cram.failed} fehlgeschlagen · ${metrics.cram.stuck} hängen`
          }
          tone={cramHealthy ? "good" : "warn"}
          icon={ServerCog}
        />

        <div
          className="rounded-2xl border p-5"
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
                ? "Cram-Pipeline: keine Fehler"
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
            Echtzeit &bdquo;wer ist online&ldquo; &rarr; PostHog. Diese Seite zeigt Geld
            (Stripe), Wachstum &amp; Health aus der eigenen DB.
          </p>
        </div>
      </div>
    </main>
  );
}
