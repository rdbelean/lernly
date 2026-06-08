"use client";

import { useId, type CSSProperties } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  isEmptySeries,
  type ValueFormat,
  type LineAreaChartProps,
  type DonutChartProps,
  type BarChartProps,
  type FunnelChartProps,
} from "./ChartTypes";

// Shared chart chrome colors (token values; recharts needs concrete strings for
// some props but CSS var() works for fill/stroke).
const AXIS = "#6F7799"; // --color-text-faint
const GRID = "rgba(255,255,255,0.06)";
const DEFAULT_COLOR = "var(--color-primary-bright)";
const BAR_PALETTE = [
  "var(--color-cat-blue)",
  "var(--color-cat-teal)",
  "var(--color-cat-coral)",
  "var(--color-primary-bright)",
  "var(--color-amber)",
];

const TOOLTIP: {
  contentStyle: CSSProperties;
  labelStyle: CSSProperties;
  itemStyle: CSSProperties;
} = {
  contentStyle: {
    background: "var(--color-surface-2)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--color-text)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
  },
  labelStyle: { color: "var(--color-text-faint)", marginBottom: 2 },
  itemStyle: { color: "var(--color-text)" },
};

// Build a value formatter on the client (functions can't cross the
// server→client prop boundary, so the page passes a `format` token instead).
// "eur" values arrive in minor units (cents).
function makeFmt(format: ValueFormat = "int", currency = "eur") {
  if (format === "eur") {
    const nf = new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: (currency || "eur").toUpperCase(),
      maximumFractionDigits: 2,
    });
    return (n: number) => nf.format(n / 100);
  }
  const nf = new Intl.NumberFormat("de-DE");
  return (n: number) => nf.format(n);
}

// "YYYY-MM-DD" → "DD.MM."
function fmtDay(s: unknown): string {
  const str = String(s ?? "");
  return str.length >= 10 ? `${str.slice(8, 10)}.${str.slice(5, 7)}.` : str;
}

function Empty({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center text-[12.5px]"
      style={{ height, color: "var(--color-text-faint)" }}
    >
      noch keine Daten
    </div>
  );
}

export function LineAreaChart({
  data,
  variant = "area",
  color = DEFAULT_COLOR,
  height = 160,
  format = "int",
  currency = "eur",
  seriesName = "",
  ariaLabel,
}: LineAreaChartProps) {
  const gradId = `g${useId().replace(/:/g, "")}`;
  if (isEmptySeries(data)) return <Empty height={height} />;
  const fmt = makeFmt(format, currency);

  const axis = (
    <>
      <CartesianGrid vertical={false} stroke={GRID} />
      <XAxis
        dataKey="x"
        tickFormatter={fmtDay}
        interval="preserveStartEnd"
        minTickGap={40}
        tick={{ fill: AXIS, fontSize: 11 }}
        tickLine={false}
        axisLine={false}
      />
      <YAxis hide width={0} />
      <Tooltip
        {...TOOLTIP}
        cursor={{ stroke: GRID }}
        labelFormatter={(l) => fmtDay(l)}
        formatter={(v) => fmt(Number(v))}
      />
    </>
  );

  return (
    <div role="img" aria-label={ariaLabel} style={{ width: "100%" }}>
      <ResponsiveContainer width="100%" height={height}>
        {variant === "area" ? (
          <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            {axis}
            <Area
              name={seriesName}
              type="monotone"
              dataKey="y"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 3, fill: color }}
            />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            {axis}
            <Line
              name={seriesName}
              type="monotone"
              dataKey="y"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: color }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({
  data,
  height = 180,
  centerLabel,
  centerSub,
  ariaLabel,
}: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <Empty height={height} />;

  return (
    <div role="img" aria-label={ariaLabel}>
      <div style={{ position: "relative", width: "100%", height }}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((d) => (
                <Cell key={d.label} fill={d.color} />
              ))}
            </Pie>
            <Tooltip {...TOOLTIP} />
          </PieChart>
        </ResponsiveContainer>
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          aria-hidden
        >
          <span
            className="text-[24px] font-semibold leading-none"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}
          >
            {centerLabel ?? total}
          </span>
          {centerSub && (
            <span
              className="mt-1 text-[11px] uppercase tracking-[0.14em]"
              style={{ color: "var(--color-text-faint)" }}
            >
              {centerSub}
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {data.map((d) => (
          <span
            key={d.label}
            className="inline-flex items-center gap-1.5 text-[12px]"
            style={{ color: "var(--color-text-dim)" }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: d.color,
                display: "inline-block",
              }}
            />
            {d.label}{" "}
            <span style={{ color: "var(--color-text)", fontWeight: 600 }}>
              {d.value}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// Horizontal bars as lightweight HTML (not recharts) so each value is ALWAYS
// visible — important on mobile, where there's no hover tooltip. Width is
// proportional to the largest value.
export function BarChart({ data, format = "int", ariaLabel }: BarChartProps) {
  if (isEmptySeries(data)) return <Empty height={140} />;
  const fmt = makeFmt(format);
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div role="img" aria-label={ariaLabel} className="flex flex-col gap-3 py-1">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        const color = d.color ?? BAR_PALETTE[i % BAR_PALETTE.length];
        return (
          <div key={d.label}>
            <div className="mb-1 flex items-center justify-between text-[12.5px]">
              <span style={{ color: "var(--color-text-dim)" }}>{d.label}</span>
              <span style={{ color: "var(--color-text)", fontWeight: 600 }}>
                {fmt(d.value)}
              </span>
            </div>
            <div
              style={{
                height: 12,
                borderRadius: 6,
                background: "var(--color-surface-2)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${d.value > 0 ? Math.max(pct, 4) : 0}%`,
                  height: "100%",
                  borderRadius: 6,
                  background: color,
                  transition: "width 400ms ease",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Hand-drawn 2+ stage funnel — clearer + more token-controlled than recharts'
// Funnel for the simple Registriert → Zahlend case. Each stage is a bar whose
// width is proportional to the first stage, with the step conversion % inline.
export function FunnelChart({ stages, ariaLabel }: FunnelChartProps) {
  const max = Math.max(...stages.map((s) => s.value), 1);
  const palette = ["var(--color-primary-bright)", "var(--color-cat-teal)"];

  return (
    <div role="img" aria-label={ariaLabel} className="flex flex-col gap-3 py-1">
      {stages.map((s, i) => {
        const pct = (s.value / max) * 100;
        const conv =
          i > 0 && stages[0].value > 0
            ? ` · ${Math.round((s.value / stages[0].value) * 100)}%`
            : "";
        return (
          <div key={s.label}>
            <div className="mb-1 flex items-center justify-between text-[12.5px]">
              <span style={{ color: "var(--color-text-dim)" }}>
                {s.label}
                {conv && (
                  <span style={{ color: "var(--color-text-faint)" }}>{conv}</span>
                )}
              </span>
              <span style={{ color: "var(--color-text)", fontWeight: 600 }}>
                {s.value}
              </span>
            </div>
            <div
              style={{
                height: 12,
                borderRadius: 6,
                background: "var(--color-surface-2)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${s.value > 0 ? Math.max(pct, 4) : 0}%`,
                  height: "100%",
                  borderRadius: 6,
                  background: s.color ?? palette[i % palette.length],
                  transition: "width 400ms ease",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
