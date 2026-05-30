"use client";

import { Layers, MessageSquare } from "lucide-react";

// Read-only usage summary — pack count + tutor messages this month.
// Values are computed server-side and passed in as props.

function Row({
  icon: Icon,
  label,
  used,
  limit,
}: {
  icon: typeof Layers;
  label: string;
  used: number;
  limit: number;
}) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const overQuota = used >= limit;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <div
          className="inline-flex items-center gap-2 text-[13.5px] font-medium"
          style={{ color: "var(--color-text)" }}
        >
          <Icon
            size={15}
            strokeWidth={1.75}
            color="var(--color-text-dim)"
            aria-hidden
          />
          {label}
        </div>
        <div
          className="text-[13px] tabular-nums"
          style={{ color: "var(--color-text-dim)" }}
        >
          <span
            style={{
              color: overQuota
                ? "var(--color-cat-coral)"
                : "var(--color-text)",
              fontWeight: 600,
            }}
          >
            {used}
          </span>
          <span> / {limit}</span>
        </div>
      </div>
      <div
        className="h-[3px] w-full overflow-hidden rounded-full"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        <div
          className="h-full transition-all"
          style={{
            width: `${pct}%`,
            background: overQuota
              ? "var(--color-cat-coral)"
              : "var(--color-primary-bright)",
          }}
        />
      </div>
    </div>
  );
}

export default function UsageSection({
  packsUsed,
  packsLimit,
  tutorUsed,
  tutorLimit,
  planLabel,
}: {
  packsUsed: number;
  packsLimit: number;
  tutorUsed: number;
  tutorLimit: number;
  planLabel: string;
}) {
  return (
    <div className="space-y-4">
      <p
        className="text-[13px]"
        style={{ color: "var(--color-text-dim)" }}
      >
        Diesen Monat auf deinem <strong style={{ color: "var(--color-text)" }}>{planLabel}</strong>-Plan.
      </p>
      <Row
        icon={Layers}
        label="Lernpakete"
        used={packsUsed}
        limit={packsLimit}
      />
      <Row
        icon={MessageSquare}
        label="KI-Hilfe-Nachrichten"
        used={tutorUsed}
        limit={tutorLimit}
      />
    </div>
  );
}
