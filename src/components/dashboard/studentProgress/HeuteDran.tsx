import Link from "next/link";
import { PrimaryCTALink } from "@/components/ui/PrimaryCTA";

// Cards due today (spaced repetition queue) + one action.
export default function HeuteDran({ dueCount }: { dueCount: number }) {
  const has = dueCount > 0;
  return (
    <div>
      <p
        className="m-0 text-[20px] font-medium leading-tight"
        style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
      >
        {has
          ? `${dueCount} ${dueCount === 1 ? "Karte" : "Karten"} fällig`
          : "Alles wiederholt"}
      </p>
      <p className="mb-3 mt-1 text-[13px]" style={{ color: "var(--color-text-dim)" }}>
        {has ? "Kurz wiederholen, bevor du Neues lernst." : "Heute ist nichts mehr fällig."}
      </p>
      {has ? (
        <PrimaryCTALink size="sm" href="/dashboard/review" trailingIconName="arrow-right">
          Weiterlernen
        </PrimaryCTALink>
      ) : (
        <Link
          href="/dashboard/review"
          className="text-[13px] underline underline-offset-2"
          style={{ color: "var(--color-text-dim)" }}
        >
          Trotzdem üben
        </Link>
      )}
    </div>
  );
}
