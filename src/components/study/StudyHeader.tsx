import Link from "next/link";

type StudyHeaderProps = {
  dateLabel: string;
  courseName: string;
  examCountdownLabel: string;
};

export function StudyHeader({
  dateLabel,
  courseName,
  examCountdownLabel,
}: StudyHeaderProps) {
  return (
    <header className="grid grid-cols-[auto_1fr_auto] items-center gap-4 pb-10 sm:pb-14">
      <Link
        href="/heute"
        className="font-display text-[17px] font-bold tracking-[-0.03em] text-text no-underline transition-opacity hover:opacity-75"
      >
        lernly
      </Link>
      <p className="truncate text-center text-[11px] font-medium uppercase tracking-[0.08em] text-text-dim">
        {dateLabel} · {courseName}
      </p>
      <p className="text-right text-[11px] font-bold uppercase tracking-[0.08em] text-text">
        {examCountdownLabel}
      </p>
    </header>
  );
}
