"use client";

import { useEffect, useState } from "react";
import type { z } from "zod";
import type { VisualMapSchema } from "@/lib/schema";
import {
  NEUTRAL_BORDER,
  TEXT_DIM,
  accentFor,
  sectionId,
  stripEmoji,
} from "./palette";

type VisualBlock = z.infer<typeof VisualMapSchema>["blocks"][number];

// Sticky section-pill navigation (the reference HTML's topnav): one pill per
// topic, horizontal scroll, anchor jump, active pill tinted with the topic's
// accent. Active state via IntersectionObserver on the section elements.
export default function GuideNav({ blocks }: { blocks: VisualBlock[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the top-most visible section as active.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const first = visible[0];
        if (first) {
          const idx = Number(first.target.id.replace("guide-topic-", "")) - 1;
          if (!Number.isNaN(idx)) setActive(idx);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );
    for (let i = 0; i < blocks.length; i++) {
      const el = document.getElementById(sectionId(i));
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [blocks.length]);

  if (blocks.length < 3) return null;

  return (
    <nav
      aria-label="Themen"
      className="scrollbar-none sticky top-0 z-20 -mx-1 mb-6 flex gap-1.5 overflow-x-auto px-1 py-2"
      style={{
        background: "rgba(15,19,34,0.92)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: `1px solid ${NEUTRAL_BORDER}`,
        scrollbarWidth: "none",
      }}
    >
      {blocks.map((block, i) => {
        const accent = accentFor(i);
        const isActive = i === active;
        return (
          <a
            key={i}
            href={`#${sectionId(i)}`}
            className="shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-semibold transition"
            style={{
              background: isActive ? accent.tint : "transparent",
              borderColor: isActive ? accent.border : "transparent",
              color: isActive ? accent.fg : TEXT_DIM,
            }}
          >
            {stripEmoji(block.title)}
          </a>
        );
      })}
    </nav>
  );
}
