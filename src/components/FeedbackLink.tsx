"use client";

import { useState } from "react";
import { LifeBuoy } from "lucide-react";
import FeedbackModal from "@/components/FeedbackModal";

// Always-available feedback channel. Opens the in-app feedback modal
// (→ POST /api/feedback → Notion). Was a mailto link before.

export default function FeedbackLink({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Feedback oder Problem melden"
        className={
          "inline-flex items-center gap-1.5 text-[12px] transition hover:text-white " +
          (className ?? "")
        }
        style={{ color: "var(--color-text-faint)" }}
      >
        <LifeBuoy size={13} strokeWidth={1.75} aria-hidden />
        {!compact && <span>Feedback / Problem melden</span>}
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
