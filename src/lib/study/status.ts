import type { TopicStatus } from "./types";

export const STATUS_LABEL: Record<TopicStatus, string> = {
  sicher: "sicher",
  laeuft: "läuft",
  dran: "dran",
};

export const STATUS_BG_SOFT: Record<TopicStatus, string> = {
  sicher: "bg-ok-bg",
  laeuft: "bg-work-bg",
  dran: "bg-urgent-bg",
};

export const STATUS_BG_SOLID: Record<TopicStatus, string> = {
  sicher: "bg-ok-ink",
  laeuft: "bg-work-ink",
  dran: "bg-urgent-ink",
};

export const STATUS_TEXT_INK: Record<TopicStatus, string> = {
  sicher: "text-ok-ink",
  laeuft: "text-work-ink",
  dran: "text-urgent-ink",
};
