import { PrimaryCTALink } from "@/components/ui/PrimaryCTA";
import type { MapTopic } from "@/lib/dashboard/examMap";

type Props = {
  examTitle: string;
  daysLeft: number | null;
  topic: MapTopic | null;
  href: string;
  inert?: boolean;
  /** Heading element; use "p" where the page already has an h1 (landing). */
  as?: "h1" | "p";
};

function countdown(days: number | null): string | null {
  if (days === null) return null;
  if (days === 0) return "Klausur heute";
  return days === 1 ? "Klausur morgen" : `Klausur in ${days} Tagen`;
}

// One sentence, one action: what to do now. Only states real data.
export default function NextStep({ examTitle, daysLeft, topic, href, inert, as: Heading = "h1" }: Props) {
  const cd = countdown(daysLeft);
  return (
    <div {...(inert ? { inert: true } : {})}>
      <p className="m-0 text-[13px]" style={{ margin: 0, color: "var(--color-text-dim)" }}>
        {examTitle}
        {cd && (
          <span
            className="ml-2 rounded-full px-2.5 py-0.5"
            style={{ background: "var(--color-urgent-bg)", color: "var(--color-urgent-ink)" }}
          >
            {cd}
          </span>
        )}
      </p>
      <Heading
        className="mb-5 mt-3 text-[28px] font-medium leading-[1.12] sm:text-[38px]"
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--color-text)",
          letterSpacing: "-0.02em",
          textWrap: "balance",
          margin: "12px 0 20px",
        }}
      >
        {topic ? `Heute: ${topic.name}.` : "Alles sicher. Wiederhole jetzt die fälligen Karten."}
      </Heading>
      {topic && (
        <PrimaryCTALink href={href} size="md" trailingIconName="arrow-right">
          Jetzt starten
        </PrimaryCTALink>
      )}
    </div>
  );
}
