import Link from "next/link";
import type { Flashcard } from "@/lib/schema";
import FlashcardDeck from "@/components/pack/FlashcardDeck";
import { PrimaryCTALink } from "@/components/ui/PrimaryCTA";
import { ArrowLeft, Sparkles } from "lucide-react";

// =========================================================================
// ReviewSession — presentational shell for the global due-cards review. Runs
// the due cards (each carrying its own packId) through the existing
// FlashcardDeck; persistence + the in-session "Nur falsche wiederholen" loop
// are handled by the deck itself. Shows an all-done state when nothing is due.
// =========================================================================

type DueCard = Flashcard & { packId: string };

export default function ReviewSession({ cards }: { cards: DueCard[] }) {
  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-[480px] py-6 text-center">
        <div
          className="flex flex-col items-center gap-5 px-6 py-12"
          style={{
            background: "var(--color-surface)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "16px",
          }}
        >
          <span
            aria-hidden
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "rgba(79, 209, 165, 0.14)" }}
          >
            <Sparkles
              size={26}
              strokeWidth={1.75}
              color="var(--color-cat-teal)"
            />
          </span>
          <div>
            <h1
              className="text-[24px] font-semibold"
              style={{
                color: "var(--color-text)",
                fontFamily: "var(--font-display)",
              }}
            >
              Nichts fällig
            </h1>
            <p
              className="mt-2 text-[14px]"
              style={{ color: "var(--color-text-dim)" }}
            >
              Du hast alle fälligen Karten wiederholt. Komm morgen wieder — dann
              werden die nächsten Karten fällig.
            </p>
          </div>
          <PrimaryCTALink
            size="sm"
            href="/dashboard"
            trailingIconName="arrow-right"
          >
            Zur Bibliothek
          </PrimaryCTALink>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[640px]">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium transition hover:text-white"
        style={{ color: "var(--color-text-faint)" }}
      >
        <ArrowLeft size={14} strokeWidth={2} aria-hidden />
        Bibliothek
      </Link>
      <h1
        className="mt-3 text-[26px] font-semibold sm:text-[30px]"
        style={{
          color: "var(--color-text)",
          fontFamily: "var(--font-display)",
          letterSpacing: "-0.5px",
        }}
      >
        Wiederholung
      </h1>
      <p
        className="mb-6 mt-1 text-[14px]"
        style={{ color: "var(--color-text-dim)" }}
      >
        {cards.length} {cards.length === 1 ? "Karte" : "Karten"} fällig — über
        alle Pakete
      </p>
      <FlashcardDeck cards={cards} language="de" />
    </div>
  );
}
