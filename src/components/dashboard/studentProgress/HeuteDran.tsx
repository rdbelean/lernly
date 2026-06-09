import { Layers, CheckCircle2 } from "lucide-react";
import { PrimaryCTALink } from "@/components/ui/PrimaryCTA";

// "Heute dran" — due cards + Weiterlernen CTA. Consolidates the page's old
// standalone "X Karten fällig" block.
export default function HeuteDran({ dueCount }: { dueCount: number }) {
  const has = dueCount > 0;
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4"
      style={{ background: "#141930", borderColor: "rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: has ? "rgba(79,209,165,0.14)" : "rgba(255,255,255,0.04)" }}
        >
          {has ? (
            <Layers size={16} strokeWidth={1.9} color="var(--color-cat-teal)" />
          ) : (
            <CheckCircle2 size={16} strokeWidth={1.9} color="var(--color-text-faint)" />
          )}
        </span>
        <div>
          <div
            className="text-[10.5px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--color-text-faint)" }}
          >
            Heute dran
          </div>
          <div
            className="mt-0.5 text-[17px] font-semibold leading-tight sm:text-[19px]"
            style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
          >
            {has
              ? `${dueCount} ${dueCount === 1 ? "Karte" : "Karten"} fällig`
              : "Alles wiederholt"}
          </div>
        </div>
      </div>
      {has ? (
        <PrimaryCTALink size="sm" href="/dashboard/review" trailingIconName="arrow-right">
          Weiterlernen
        </PrimaryCTALink>
      ) : (
        <a
          href="/dashboard/review"
          className="text-[13px] underline-offset-2 hover:underline"
          style={{ color: "var(--color-text-dim)" }}
        >
          Trotzdem üben
        </a>
      )}
    </div>
  );
}
