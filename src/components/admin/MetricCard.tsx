import type { LucideIcon } from "lucide-react";

// Presentational metric tile. Big number + label + optional sub-line, on the
// app's card surface. `tone` colors the sub-line for health signals.
export default function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "good" | "warn";
}) {
  const subColor =
    tone === "warn"
      ? "var(--color-cat-coral)"
      : tone === "good"
        ? "var(--color-cat-teal)"
        : "var(--color-text-faint)";
  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: "#141930",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon
            size={15}
            strokeWidth={1.75}
            color="var(--color-text-faint)"
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
        className="mt-2 text-[28px] font-semibold leading-none"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-2 text-[12.5px]" style={{ color: subColor }}>
          {sub}
        </div>
      )}
    </div>
  );
}
