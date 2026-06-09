import { Flame } from "lucide-react";

// Single source of the study streak (replaces the old header badge). current =
// consecutive study days ending today/yesterday; longest = best run ever.
export default function StreakCard({
  current,
  longest,
}: {
  current: number;
  longest: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "rgba(242,163,60,0.14)" }}
      >
        <Flame size={20} strokeWidth={2} color="var(--color-amber)" />
      </span>
      <div>
        <div
          className="text-[28px] font-semibold leading-none"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}
        >
          {current}{" "}
          <span
            className="text-[15px] font-medium"
            style={{ color: "var(--color-text-dim)" }}
          >
            {current === 1 ? "Tag" : "Tage"} Streak
          </span>
        </div>
        <div className="mt-1 text-[12px]" style={{ color: "var(--color-text-faint)" }}>
          {longest > 0
            ? `Längste Streak: ${longest} ${longest === 1 ? "Tag" : "Tage"}`
            : "Leg los — heute zählt schon"}
        </div>
      </div>
    </div>
  );
}
