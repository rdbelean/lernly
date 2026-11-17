import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StudyHeader } from "@/components/study/StudyHeader";
import { CORPORATE_FINANCE_SEED } from "@/lib/study/seed";

export default function HeutePage() {
  return (
    <main className="mx-auto w-full max-w-[1160px] px-8 py-8 sm:px-12 sm:py-10 lg:px-16">
      <StudyHeader
        dateLabel={CORPORATE_FINANCE_SEED.dateLabel}
        courseName={CORPORATE_FINANCE_SEED.courseName}
        examCountdownLabel={CORPORATE_FINANCE_SEED.examCountdownLabel}
      />
      <section className="space-y-6">
        <h1 className="font-display text-5xl font-bold leading-[1.04] tracking-[-0.03em] text-text sm:text-6xl">
          Heute: Discounted
          <br />
          Cashflow
          <span
            aria-hidden="true"
            className="ml-1 inline-block h-[0.16em] w-[0.16em] bg-primary align-baseline"
          />
        </h1>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/karten"
            className="inline-flex items-center gap-2 rounded-btn bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-press"
          >
            Heute starten
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/rechnen"
            className="inline-flex items-center gap-2 rounded-btn bg-text px-5 py-3 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
          >
            Rechenaufgabe
          </Link>
        </div>
      </section>
    </main>
  );
}
