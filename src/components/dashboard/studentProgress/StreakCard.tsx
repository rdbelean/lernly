import { Flame } from "lucide-react";

// Single source of the study streak. current = consecutive study days ending
// today/yesterday; longest = best run ever.
export default function StreakCard({
  current,
  longest,
}: {
  current: number;
  longest: number;
}) {
  return (
    <div>
      <p
        className="m-0 flex items-center gap-2 text-[20px] font-medium leading-tight"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}
      >
        <Flame size={18} strokeWidth={2} aria-hidden style={{ color: "var(--color-urgent-ink)" }} />
        <span className="tabular-nums">{current}</span>
        {current === 1 ? "Tag" : "Tage"} Streak
      </p>
      <p className="mt-1 text-[13px]" style={{ color: "var(--color-text-dim)" }}>
        {longest > 0
          ? `Längste Streak: ${longest} ${longest === 1 ? "Tag" : "Tage"}`
          : "Leg los — heute zählt schon"}
      </p>
    </div>
  );
}
