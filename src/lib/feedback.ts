import "server-only";
import {
  createNotionPage,
  notionEnabled,
  notionProp,
  FEEDBACK_DATA_SOURCE_ID,
} from "@/lib/notion";

// =========================================================================
// Feedback intake → Notion Feedback DB. Shared by the /api/feedback route
// (user feedback + client errors) and the server error reporter below.
// =========================================================================

export const FEEDBACK_TYPES = ["Bug", "Idee", "Lob", "Frage"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export type FeedbackInput = {
  betreff?: string;
  nachricht: string;
  typ: FeedbackType;
  email?: string;
  person?: string;
  quelle: string;
  kontext?: string;
};

export async function createFeedbackEntry(input: FeedbackInput): Promise<void> {
  const summary =
    input.betreff?.trim() || input.nachricht.trim().slice(0, 60) || "Feedback";
  const properties: Record<string, unknown> = {
    Zusammenfassung: notionProp.title(summary.slice(0, 60)),
    Nachricht: notionProp.richText(input.nachricht),
    Typ: notionProp.select(input.typ),
    Quelle: notionProp.richText(input.quelle),
    Status: notionProp.status("Neu"),
  };
  if (input.email) properties["E-Mail"] = notionProp.email(input.email);
  if (input.person) properties["Person"] = notionProp.richText(input.person);
  if (input.kontext)
    properties["App-Version/URL"] = notionProp.richText(input.kontext);
  await createNotionPage(FEEDBACK_DATA_SOURCE_ID, properties);
}

// --- error dedupe -----------------------------------------------------------
// Same error (message+route) within 6h → report once. In-memory with TTL is
// enough for now: each serverless instance dedupes its own repeats; worst
// case a few duplicate Notion rows across instances, never a flood.

const DEDUPE_TTL_MS = 6 * 60 * 60 * 1000;
const recentErrors = new Map<string, number>();

export function isDuplicateError(message: string, route: string): boolean {
  const now = Date.now();
  // Opportunistic cleanup so the map can't grow unbounded.
  if (recentErrors.size > 500) {
    for (const [k, exp] of recentErrors) if (exp < now) recentErrors.delete(k);
  }
  const key = `${route}::${message.slice(0, 300)}`;
  const expiry = recentErrors.get(key);
  if (expiry && expiry > now) return true;
  recentErrors.set(key, now + DEDUPE_TTL_MS);
  return false;
}

// --- server-side error reporter ---------------------------------------------
// Central logger for API/server errors → Bug entry in Notion. Fire-and-forget:
// never throws, never blocks the response. No PII: only error message, short
// stack head and the route.

export async function reportServerError(
  route: string,
  error: unknown,
): Promise<void> {
  try {
    if (!notionEnabled()) return;
    const err = error instanceof Error ? error : new Error(String(error));
    const message = err.message || "Unknown server error";
    if (isDuplicateError(message, route)) return;
    const stackHead = (err.stack ?? "")
      .split("\n")
      .slice(0, 5)
      .join("\n");
    await createFeedbackEntry({
      betreff: message.slice(0, 60),
      nachricht: `${message}\n\n${stackHead}`.slice(0, 1800),
      typ: "Bug",
      quelle: "App-Error (Server)",
      kontext: route,
    });
  } catch (reportError) {
    // Reporting must never take the app down with it.
    console.error("[reportServerError] failed:", reportError);
  }
}
