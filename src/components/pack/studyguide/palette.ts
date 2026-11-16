// =========================================================================
// Study-guide palette — the one place that encodes the design rules.
// =========================================================================
// Two color systems, deliberately separate:
//
// 1. SEMANTIC colors (meaning — identical everywhere, per CLAUDE.md):
//    highlight/key thing → indigo; callout tones → definition=indigo,
//    insight=violet, warning=coral, neutral=amber; pro/kam-dran=teal,
//    con=coral; priority badges highest=coral / high=indigo /
//    quick_win=amber / moderate=neutral.
//
// 2. TOPIC IDENTITY accents (the reference-HTML "each session owns a color"):
//    every guide section gets a stable accent from a 6-color cycle by block
//    index. Applied ONLY to identity elements — section icon tile, roadmap
//    number tile, nav pill, framework accent edges — as tints/borders, never
//    large fills (design rule). Derived client-side: zero schema risk, works
//    for existing packs without regeneration.
//
// Emojis in stored content are stripped (stripEmoji) — lucide only.
// =========================================================================

import {
  BookOpen,
  Brain,
  Lightbulb,
  Map as MapIcon,
  Sparkles,
  Target,
  Link2,
  type LucideIcon,
} from "lucide-react";

export const NEUTRAL_BG = "var(--color-surface)";
export const NEUTRAL_BG_2 = "var(--color-surface-2)";
export const NEUTRAL_BORDER = "var(--color-ink-a06)";
export const NEUTRAL_BORDER_2 = "var(--color-ink-a10)";
export const TEXT = "var(--color-text)";
export const TEXT_DIM = "var(--color-text-dim)";
export const TEXT_FAINT = "var(--color-text-faint)";
export const HIGHLIGHT_FG = "var(--color-primary)";
export const HIGHLIGHT_TINT = "var(--color-work-bg)";
export const AMBER = "var(--color-urgent-ink)";
export const AMBER_TINT = "var(--color-urgent-bg)";
export const CORAL = "var(--color-err-ink)";
export const CORAL_TINT = "var(--color-err-bg)";
export const TEAL = "var(--color-ok-ink)";
export const TEAL_TINT = "var(--color-ok-bg)";
export const VIOLET = "var(--color-work-ink)";
export const VIOLET_TINT = "var(--color-work-bg)";
export const CYAN = "var(--color-work-ink)";
export const CYAN_TINT = "var(--color-work-bg)";
export const DISPLAY_FONT = "var(--font-display)";
export const MONO_FONT = "var(--font-mono, ui-monospace, monospace)";

// ------------------------------------------------------------------
// Topic identity accents (index-cycled, stable per section position)
// ------------------------------------------------------------------
export type Accent = {
  fg: string;
  tint: string;
  border: string;
  // subtle two-stop gradient for the section icon tile (small area only)
  grad: string;
};

const accent = (fg: string): Accent => ({
  fg,
  tint: `color-mix(in srgb, ${fg} 10%, transparent)`,
  border: `color-mix(in srgb, ${fg} 28%, transparent)`,
  grad: `color-mix(in srgb, ${fg} 14%, transparent)`,
});

export const ACCENTS: Accent[] = [
  accent(HIGHLIGHT_FG),
  accent(TEAL),
  accent(AMBER),
  accent(CORAL),
  accent(VIOLET),
  accent(CYAN),
];

export function accentFor(index: number): Accent {
  return ACCENTS[((index % ACCENTS.length) + ACCENTS.length) % ACCENTS.length];
}

// ------------------------------------------------------------------
// Priority (semantic — unchanged meaning from the previous design)
// ------------------------------------------------------------------
import type { z } from "zod";
import type { VisualBlockPrioritySchema } from "@/lib/schema";

export type Priority = z.infer<typeof VisualBlockPrioritySchema>;

export const PRIORITY_RANK: Record<Priority | "_default", number> = {
  highest: 4,
  high: 3,
  moderate: 2,
  quick_win: 1,
  _default: 2,
};

export function priorityRank(p: Priority | undefined): number {
  return PRIORITY_RANK[p ?? "_default"];
}

export const PRIORITY_TONE: Record<
  Priority,
  { fg: string; bg: string; de: string; en: string }
> = {
  highest: { fg: CORAL, bg: CORAL_TINT, de: "HÖCHSTE PRIORITÄT", en: "HIGHEST PRIORITY" },
  high: { fg: HIGHLIGHT_FG, bg: HIGHLIGHT_TINT, de: "WICHTIG", en: "HIGH PRIORITY" },
  moderate: { fg: TEXT_FAINT, bg: "var(--color-ink-a04)", de: "BASIS", en: "FOUNDATION" },
  quick_win: { fg: AMBER, bg: AMBER_TINT, de: "QUICK WIN", en: "QUICK WIN" },
};

// ------------------------------------------------------------------
// Emoji strip + stable icon pick (unchanged behaviour from VisualMapView)
// ------------------------------------------------------------------
const EMOJI_RE =
  /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]+/gu;

export function stripEmoji(s: string | undefined | null): string {
  if (!s) return "";
  return s.replace(EMOJI_RE, "").replace(/\s+/g, " ").trim();
}

const BLOCK_ICON_POOL: LucideIcon[] = [
  BookOpen,
  Brain,
  Lightbulb,
  MapIcon,
  Target,
  Sparkles,
  Link2,
];

export function pickBlockIcon(title: string): LucideIcon {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return BLOCK_ICON_POOL[Math.abs(hash) % BLOCK_ICON_POOL.length];
}

// Stable DOM id for section anchors (roadmap + sticky nav jump targets).
export function sectionId(index: number): string {
  return `guide-topic-${index + 1}`;
}
