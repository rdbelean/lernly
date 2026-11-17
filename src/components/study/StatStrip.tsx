import Link from "next/link";
import { ArrowRight } from "lucide-react";

type StatStripProps = {
  securedPoints: number;
  totalPoints: number;
  dueCardsCount: number;
  streakDays: number;
  ctaHref?: string;
  ctaLabel?: string;
};

export function StatStrip({
  securedPoints,
  totalPoints,
  dueCardsCount,
  streakDays,
  ctaHref = "/karten",
  ctaLabel = "Heute starten",
}: StatStripProps) {
  return (
    <section aria-label="Tagesübersicht" className="mt-8 sm:mt-10">
      <div className="border-t border-text border-b border-b-line">
        <div className="grid grid-cols-3 lg:grid-cols-4">
          <div className="py-5 pr-4 lg:py-5 lg:pr-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
              Gesichert
            </p>
            <p className="mt-1.5 font-display text-[36px] font-bold leading-none tracking-[-0.03em] text-text sm:text-[40px]">
              {securedPoints}
              <span className="ml-1 font-sans text-[16px] font-medium tracking-normal text-text-dim sm:text-[18px]">
                /{totalPoints} P
              </span>
            </p>
          </div>

          <div className="border-l border-line py-5 pl-5 pr-4 lg:py-5 lg:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
              Karten fällig
            </p>
            <p className="mt-1.5 font-display text-[36px] font-bold leading-none tracking-[-0.03em] text-text sm:text-[40px]">
              {dueCardsCount}
            </p>
          </div>

          <div className="border-l border-line py-5 pl-5 pr-2 lg:py-5 lg:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
              Serie
            </p>
            <p className="mt-1.5 font-display text-[36px] font-bold leading-none tracking-[-0.03em] text-text sm:text-[40px]">
              {streakDays}
              <span className="ml-1.5 font-sans text-[16px] font-medium tracking-normal text-text-dim sm:text-[18px]">
                Tage
              </span>
            </p>
          </div>

          <div className="hidden items-center justify-end border-l border-line py-5 pl-6 lg:flex">
            <Link
              href={ctaHref}
              className="inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-btn bg-primary px-6 text-[14px] font-semibold text-on-primary transition-colors hover:bg-primary-press active:bg-primary-press"
            >
              <span>{ctaLabel}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {/* iPad portrait full-width primary action */}
      <div className="mt-5 lg:hidden">
        <Link
          href={ctaHref}
          className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-btn bg-primary px-6 text-[15px] font-semibold text-on-primary transition-colors hover:bg-primary-press active:bg-primary-press"
        >
          <span>{ctaLabel}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
