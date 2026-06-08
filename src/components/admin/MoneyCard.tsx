import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Trend } from "@/lib/admin/stripeMetricsShared";

export function formatEur(cents: number, currency: string): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: (currency || "eur").toUpperCase(),
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

// Money tile for the GELD row. Bigger Sora value, currency-formatted; optional
// honest MoM trend pill; `accent` makes the MRR hero stand out; `unavailable`
// degrades to "—" when Stripe isn't configured.
export default function MoneyCard({
  label,
  valueCents,
  currency,
  sub,
  trend,
  trendLabel,
  unavailable = false,
  accent = false,
  icon: Icon,
}: {
  label: string;
  valueCents: number;
  currency: string;
  sub?: string;
  trend?: Trend;
  trendLabel?: string;
  unavailable?: boolean;
  accent?: boolean;
  icon?: LucideIcon;
}) {
  const dir = trend?.direction ?? "flat";
  const TrendIcon =
    dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
  const trendColor =
    dir === "up"
      ? "var(--color-cat-teal)"
      : dir === "down"
        ? "var(--color-cat-coral)"
        : "var(--color-text-faint)";

  let trendText = "";
  if (trend) {
    if (trend.deltaCents === 0) trendText = "±0";
    else if (trend.pct == null) trendText = "neu";
    else trendText = `${trend.pct > 0 ? "+" : ""}${Math.round(trend.pct)}%`;
  }
  const showLabel = trendLabel && trend?.pct != null && trend?.deltaCents !== 0;

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: accent ? "rgba(43,52,153,0.18)" : "#141930",
        borderColor: accent
          ? "rgba(110,128,242,0.45)"
          : "rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon
            size={15}
            strokeWidth={1.75}
            color={accent ? "var(--color-primary-bright)" : "var(--color-text-faint)"}
            aria-hidden
          />
        )}
        <span
          className="text-[11px] uppercase tracking-[0.16em]"
          style={{ color: "var(--color-text-faint)" }}
        >
          {label}
        </span>
      </div>

      <div
        className={
          accent
            ? "mt-2 text-[34px] font-semibold leading-none"
            : "mt-2 text-[28px] font-semibold leading-none"
        }
        style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}
      >
        {unavailable ? "—" : formatEur(valueCents, currency)}
      </div>

      {unavailable ? (
        <div
          className="mt-2 text-[12.5px]"
          style={{ color: "var(--color-text-faint)" }}
        >
          Stripe nicht konfiguriert
        </div>
      ) : (
        <>
          {trend && (
            <div
              className="mt-2 inline-flex items-center gap-1 text-[12.5px]"
              style={{ color: trendColor }}
            >
              <TrendIcon size={13} strokeWidth={2} aria-hidden />
              {trendText}
              {showLabel ? ` · ${trendLabel}` : ""}
            </div>
          )}
          {sub && (
            <div
              className="mt-1.5 text-[12px]"
              style={{ color: "var(--color-text-faint)" }}
            >
              {sub}
            </div>
          )}
        </>
      )}
    </div>
  );
}
