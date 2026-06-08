// Prop contracts for the /admin charts. Pure TS (no React, no "use client") so
// it's safe to import from both the client chart impls and node unit tests.
// Charts receive ONLY pre-aggregated, serializable data — never secrets and
// never functions (a server→client boundary can't carry a formatter fn), so
// number formatting is expressed as a `format` token the client chart applies.

export type SeriesPoint = { x: string; y: number };

// "int" → integer count; "eur" → minor-units (cents) rendered as currency.
export type ValueFormat = "int" | "eur";

export type LineAreaChartProps = {
  data: SeriesPoint[];
  variant?: "line" | "area";
  color?: string; // defaults to var(--color-primary-bright)
  height?: number;
  format?: ValueFormat;
  currency?: string; // used when format === "eur"
  seriesName?: string; // shown in the tooltip, e.g. "Signups"
  ariaLabel: string;
};

export type DonutDatum = { label: string; value: number; color: string };
export type DonutChartProps = {
  data: DonutDatum[];
  height?: number;
  centerLabel?: string;
  centerSub?: string;
  ariaLabel: string;
};

export type BarDatum = { label: string; value: number; color?: string };
export type BarChartProps = {
  data: BarDatum[];
  height?: number;
  horizontal?: boolean;
  format?: ValueFormat;
  ariaLabel: string;
};

export type FunnelStage = { label: string; value: number; color?: string };
export type FunnelChartProps = {
  stages: FunnelStage[];
  height?: number;
  ariaLabel: string;
};

// True when there's nothing meaningful to plot (no points, or every value 0).
// Each chart checks this first and renders a neutral "noch keine Daten" state
// so a pre-revenue / ~0-data dashboard never renders a broken chart.
export function isEmptySeries(
  points: Array<{ y?: number; value?: number }>,
): boolean {
  return (
    points.length === 0 || points.every((p) => (p.y ?? p.value ?? 0) === 0)
  );
}
