import { LifeBuoy } from "lucide-react";
import { PROVIDER } from "@/lib/legal/provider";

// Always-available feedback channel. Opens the user's mail client with a
// prefilled subject to the founder inbox (info@lernly-app.de via PROVIDER).
const FEEDBACK_HREF = `mailto:${PROVIDER.email}?subject=${encodeURIComponent(
  "Lernly Feedback",
)}`;

export default function FeedbackLink({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <a
      href={FEEDBACK_HREF}
      aria-label="Feedback oder Problem melden"
      className={
        "inline-flex items-center gap-1.5 text-[12px] transition hover:text-white " +
        (className ?? "")
      }
      style={{ color: "var(--color-text-faint)" }}
    >
      <LifeBuoy size={13} strokeWidth={1.75} aria-hidden />
      {!compact && <span>Feedback / Problem melden</span>}
    </a>
  );
}
