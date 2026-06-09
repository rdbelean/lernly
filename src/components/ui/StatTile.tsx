import type { LucideIcon } from "lucide-react";

// Small stat card: tinted icon chip + uppercase label + big value + optional
// sub. Mirrors the "SituationStat" pattern from PackHub, packaged as its own
// card for grids. Server-renderable, serializable props.
export default function StatTile({
  icon: Icon,
  chipBg,
  chipFg,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  chipBg: string;
  chipFg: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl border p-4"
      style={{ background: "#141930", borderColor: "rgba(255,255,255,0.06)" }}
    >
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: chipBg }}
      >
        <Icon size={16} strokeWidth={1.9} color={chipFg} />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className="text-[10.5px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--color-text-faint)" }}
        >
          {label}
        </div>
        <div
          className="mt-0.5 text-[20px] font-semibold leading-tight"
          style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
        >
          {value}
        </div>
        {sub && (
          <div
            className="mt-0.5 truncate text-[12px]"
            style={{ color: "var(--color-text-dim)" }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
